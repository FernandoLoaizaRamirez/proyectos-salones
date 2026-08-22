"use client";

/**
 * TABLERO DE CONFIRMACIONES — primera pantalla del anfitrión migrada al panel.
 *
 * Quién viene, quién falta y cuántos son. El anfitrión arma su lista, manda a
 * cada invitado su enlace personal y ve llegar las respuestas EN VIVO.
 *
 * Dos mejoras de fondo respecto a la app `rsvp`, que sigue viva:
 *   • La LISTA vive ahora en la base (`guests`), por evento y protegida por la
 *     RLS del salón: ya no se pierde al cambiar de dispositivo ni se mezcla
 *     entre eventos. Antes vivía en el localStorage del anfitrión.
 *   • Los enlaces personales apuntan al PORTAL del invitado (donde ya vive el
 *     RSVP); si aún no está configurado, siguen funcionando con la app de antes.
 *
 * Las RESPUESTAS siguen viajando por `@salones/sync` en la colección
 * "respuestas", la misma que escriben el portal y la app: durante la migración
 * ambos tableros ven lo mismo.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  DoorOpen,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Download,
  SearchX,
  Share2,
  Ticket,
  Trash2,
} from "lucide-react";
import { Button, Card, cn, Confirmar, aCSV, descargarCSV, type ColumnaCSV } from "@salones/ui";
import {
  COLECCION_ACOMODO,
  COLECCION_MESAS,
  EstadoRSVP,
  idPaseDeInvitado,
  mesaDe,
  normalizarAcomodoCrudo,
  normalizarMesasCrudas,
  normalizarNombre,
  type InvitadoMesa,
  type MesaEvento,
} from "@salones/core";
import { esAnfitrion, obtenerSync } from "@salones/sync";
import { obtenerSupabase } from "@/lib/supabase";
import {
  COLECCION_RESPUESTAS,
  obtenerEvento,
  type EventoFila,
  type RespuestaItem,
} from "@/lib/eventos";
import {
  actualizarInvitado,
  borrarInvitado,
  crearInvitado,
  crearInvitados,
  cuposDisponibles,
  enlaceInvitado,
  listarInvitados,
  type Invitado,
} from "@/lib/invitados";
import {
  CUPOS_MAX,
  enlaceWhatsApp,
  leerLista,
  normalizarTelefono,
  resumenLista,
  telefonoBonito,
  type ListaLeida,
} from "@/lib/lista-invitados";
import { baseDeApp, enlaceInvitacionPersonal, enlacePase } from "@/lib/pantallas";

/**
 * La colección que lee la app de la puerta (apps/pases-qr define la suya
 * igual). Está en la lista blanca reescribible de la migración 0016: la
 * puerta trabaja con pase de invitado y necesita poder actualizar sus filas.
 */
const COLECCION_PASES = "pases";

type Estado = (typeof EstadoRSVP)[keyof typeof EstadoRSVP];

const ETIQUETA: Record<Estado, string> = {
  [EstadoRSVP.Pendiente]: "Pendiente",
  [EstadoRSVP.Confirmado]: "Confirmó",
  [EstadoRSVP.Rechazado]: "No asiste",
};

const ESTILO: Record<Estado, string> = {
  [EstadoRSVP.Confirmado]: "bg-green-500/10 text-green-600 ring-green-500/30",
  [EstadoRSVP.Rechazado]: "bg-red-500/10 text-red-600 ring-red-500/30",
  [EstadoRSVP.Pendiente]: "bg-amber-500/10 text-amber-600 ring-amber-500/30",
};

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export default function Confirmaciones({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = React.use(params);
  const codigo = decodeURIComponent(crudo);
  const router = useRouter();

  const [cargando, setCargando] = React.useState(true);
  const [evento, setEvento] = React.useState<EventoFila | null>(null);
  const [invitados, setInvitados] = React.useState<Invitado[]>([]);
  const [respuestas, setRespuestas] = React.useState<RespuestaItem[]>([]);
  const [form, setForm] = React.useState({ nombre: "", cupos: "2", telefono: "" });
  const [editId, setEditId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  /** El bloque de "pegar la lista": abierto, lo pegado, y en qué acabó. */
  const [pegarAbierto, setPegarAbierto] = React.useState(false);
  const [pegado, setPegado] = React.useState("");
  const [cuposPegado, setCuposPegado] = React.useState("2");
  const [pegando, setPegando] = React.useState(false);
  const [pegadoHecho, setPegadoHecho] = React.useState("");
  /** De quién se acaba de copiar la invitación personal (para el ✓ de 2 seg). */
  const [copiadoInv, setCopiadoInv] = React.useState("");
  /** De quién se acaba de copiar el pase de la puerta (mismo ✓ de 2 seg). */
  const [copiadoPase, setCopiadoPase] = React.useState("");
  /** El acomodo real (lo escribe apps/mesas): para poner su mesa en cada pase. */
  const [mesas, setMesas] = React.useState<MesaEvento[]>([]);
  const [acomodo, setAcomodo] = React.useState<InvitadoMesa[]>([]);
  /** Estado del botón "Mandar la lista a la puerta". */
  const [puerta, setPuerta] = React.useState<
    { fase: "quieta" } | { fase: "mandando" } | { fase: "lista"; pases: number } | { fase: "error" }
  >({ fase: "quieta" });

  // Ficha del evento + lista de invitados (ambas exigen sesión; la RLS del salón
  // decide qué se ve).
  React.useEffect(() => {
    const supabase = obtenerSupabase();
    if (!supabase) {
      router.replace("/entrar");
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/entrar");
        return;
      }
      const ev = await obtenerEvento(supabase, codigo);
      setEvento(ev);
      if (ev) setInvitados(await listarInvitados(supabase, ev.id));
      setCargando(false);
    });
  }, [router, codigo]);

  // Las respuestas, EN VIVO: aquí sí conviene suscribirse (es una sola colección
  // y el anfitrión quiere verlas caer durante la fiesta).
  React.useEffect(() => {
    if (!evento) return;
    return obtenerSync().suscribir<RespuestaItem>(codigo, COLECCION_RESPUESTAS, setRespuestas);
  }, [evento, codigo]);

  // El acomodo de mesas, UNA sola lectura (no en vivo): las mesas no cambian
  // mientras se reparten pases, y suscribirse a dos colecciones más solo para
  // esto sería sondear de balde. Si el acomodo cambió, recargar la página basta.
  React.useEffect(() => {
    if (!evento) return;
    let vivo = true;
    const sync = obtenerSync();
    void Promise.all([sync.listar(codigo, COLECCION_MESAS), sync.listar(codigo, COLECCION_ACOMODO)])
      .then(([m, a]) => {
        if (!vivo) return;
        setMesas(normalizarMesasCrudas(m));
        setAcomodo(normalizarAcomodoCrudo(a));
      })
      .catch(() => {
        /* sin acomodo los pases salen sin mesa; no es un error que enseñar */
      });
    return () => {
      vivo = false;
    };
  }, [evento, codigo]);

  const recargarInvitados = async () => {
    const supabase = obtenerSupabase();
    if (!supabase || !evento) return;
    setInvitados(await listarInvitados(supabase, evento.id));
  };

  /* ------------------------------ Cuentas ------------------------------ */

  const estados = React.useMemo(() => {
    const m = new Map<string, { estado: Estado; personas: number }>();
    for (const r of respuestas) {
      m.set(r.id, {
        estado: (r.estado as Estado) ?? EstadoRSVP.Pendiente,
        personas: typeof r.personas === "number" ? r.personas : 0,
      });
    }
    return m;
  }, [respuestas]);

  const estadoDe = (id: string): Estado => estados.get(id)?.estado ?? EstadoRSVP.Pendiente;

  const confirmados = invitados.filter((i) => estadoDe(i.id) === EstadoRSVP.Confirmado);
  const rechazados = invitados.filter((i) => estadoDe(i.id) === EstadoRSVP.Rechazado);
  const pendientes = invitados.length - confirmados.length - rechazados.length;
  const personas = confirmados.reduce((s, i) => s + (estados.get(i.id)?.personas ?? 0), 0);
  const avance = invitados.length ? Math.round((confirmados.length / invitados.length) * 100) : 0;

  // Confirmaciones que llegaron por el enlace GENERAL (portal): su id no está en
  // la lista, así que van aparte para que no se pierdan.
  const idsEnLista = new Set(invitados.map((i) => i.id));
  const sueltas = respuestas.filter((r) => !idsEnLista.has(r.id));
  const personasSueltas = sueltas
    .filter((r) => r.estado === EstadoRSVP.Confirmado)
    .reduce((s, r) => s + (typeof r.personas === "number" ? r.personas : 0), 0);

  /* ------------------------------ Acciones ----------------------------- */

  const guardarInvitado = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = obtenerSupabase();
    if (!supabase || !evento) return;
    const nombre = form.nombre.trim();
    if (!nombre) {
      setError("Escribe el nombre del invitado.");
      return;
    }
    setError("");
    setGuardando(true);
    const cupos = Math.max(1, parseInt(form.cupos, 10) || 1);
    // Se guarda ya normalizado (solo dígitos, con lada): así el botón de
    // WhatsApp puede abrir el chat sin volver a interpretarlo, y un teléfono
    // que no se entiende se guarda vacío en vez de mandar a un extraño.
    const telefono = normalizarTelefono(form.telefono);
    const ok = editId
      ? await actualizarInvitado(supabase, editId, nombre, cupos, telefono)
      : Boolean(await crearInvitado(supabase, evento.id, nombre, cupos, telefono));
    setGuardando(false);
    if (!ok) {
      setError(
        "No se pudo guardar. Revisa que el permiso por salón (migración 0008) esté aplicado.",
      );
      return;
    }
    setForm({ nombre: "", cupos: "2", telefono: "" });
    setEditId(null);
    await recargarInvitados();
  };

  const editar = (inv: Invitado) => {
    setEditId(inv.id);
    setForm({ nombre: inv.nombre, cupos: String(inv.cupos), telefono: inv.telefono });
  };

  /**
   * PEGAR LA LISTA COMPLETA. Lo que el salón ya tiene en su Excel entra de un
   * golpe, en vez de capturarse 120 veces a mano.
   *
   * Lo que ya estaba NO se toca: `leerLista` compara contra los nombres de la
   * lista actual y aparta los repetidos. Pegar la misma lista dos veces —que es
   * lo que pasa siempre— no duplica a nadie.
   */
  const agregarPegados = async () => {
    const supabase = obtenerSupabase();
    if (!supabase || !evento) return;
    const lectura = leerLista(
      pegado,
      Math.max(1, parseInt(cuposPegado, 10) || 1),
      invitados.map((i) => i.nombre),
    );
    if (!lectura.filas.length) {
      setPegadoHecho(`No se agregó a nadie. ${resumenLista(lectura)}.`);
      return;
    }
    setPegando(true);
    const cuantos = await crearInvitados(supabase, evento.id, lectura.filas);
    setPegando(false);
    if (!cuantos) {
      setPegadoHecho("No se pudo guardar la lista. Vuelve a intentarlo.");
      return;
    }
    setPegadoHecho(`Se agregaron ${cuantos}. ${resumenLista(lectura)}.`);
    setPegado("");
    await recargarInvitados();
  };

  /** Lo que se enseña ANTES de agregar, para que nadie pegue a ciegas. */
  const vistaPrevia: ListaLeida | null = React.useMemo(
    () =>
      pegado.trim()
        ? leerLista(
            pegado,
            Math.max(1, parseInt(cuposPegado, 10) || 1),
            invitados.map((i) => i.nombre),
          )
        : null,
    [pegado, cuposPegado, invitados],
  );

  /** Lo que espera confirmación: un invitado de la lista, o una respuesta suelta. */
  const [porQuitar, setPorQuitar] = React.useState<
    { tipo: "invitado"; inv: Invitado } | { tipo: "suelta"; id: string; nombre: string } | null
  >(null);

  const eliminar = async (inv: Invitado) => {
    const supabase = obtenerSupabase();
    if (!supabase) return;
    if (!(await borrarInvitado(supabase, inv.id))) {
      setError("No se pudo borrar al invitado.");
      return;
    }
    // Su respuesta ya no tiene dueño: se retira también del lugar central.
    void obtenerSync().eliminar(codigo, COLECCION_RESPUESTAS, inv.id);
    await recargarInvitados();
  };

  /** El anfitrión marca por su cuenta (le avisaron por teléfono, en persona…). */
  const marcar = (inv: Invitado, estado: Estado) => {
    const previas = estados.get(inv.id)?.personas ?? 0;
    void obtenerSync().guardar<RespuestaItem>(codigo, COLECCION_RESPUESTAS, {
      id: inv.id,
      estado,
      personas: estado === EstadoRSVP.Confirmado ? previas || inv.cupos : 0,
      nombre: inv.nombre,
      fecha: Date.now(),
    });
  };

  const cambiarPersonas = (inv: Invitado, n: number) => {
    void obtenerSync().guardar<RespuestaItem>(codigo, COLECCION_RESPUESTAS, {
      id: inv.id,
      estado: EstadoRSVP.Confirmado,
      personas: n,
      nombre: inv.nombre,
      fecha: Date.now(),
    });
  };

  /*
   * Los tres botones de WhatsApp abren el chat DEL INVITADO cuando su teléfono
   * está capturado, y el selector de contactos de siempre cuando no. Ese es
   * todo el cambio que convierte esto en un CRM: sin teléfono, mandar 120
   * invitaciones son 120 búsquedas a mano en la libreta.
   */
  const compartir = (inv: Invitado) => {
    const url = enlaceInvitado(inv, codigo, baseDeApp("rsvp"));
    if (!url) return;
    const msg = `¡Hola! Nos encantaría contar contigo en ${evento?.nombre ?? "nuestro evento"}. Confirma tu asistencia aquí:\n${url}`;
    window.open(enlaceWhatsApp(inv.telefono, msg), "_blank", "noopener,noreferrer");
  };

  /*
   * La INVITACIÓN personal es otro enlace distinto al de "Enviar": aquel lleva
   * solo a confirmar (el RSVP del portal); este abre la invitación completa,
   * que lo saluda por su nombre, le deja la confirmación precargada y le
   * enseña en qué mesa va. Los datos del invitado viajan en el `#`, que nunca
   * llega al servidor.
   */
  const compartirInvitacion = (inv: Invitado) => {
    const url = enlaceInvitacionPersonal(codigo, inv);
    if (!url) return;
    const msg = `Con mucho cariño, esta es su invitación:\n${url}`;
    window.open(enlaceWhatsApp(inv.telefono, msg), "_blank", "noopener,noreferrer");
  };

  /** Para quien prefiere pegarla a mano (en un chat ya abierto, por ejemplo). */
  const copiarInvitacion = async (inv: Invitado) => {
    const url = enlaceInvitacionPersonal(codigo, inv);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiadoInv(inv.id);
      setTimeout(() => setCopiadoInv(""), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  const descartarSuelta = (id: string) => {
    void obtenerSync().eliminar(codigo, COLECCION_RESPUESTAS, id);
  };

  /* --------------------------- El pase de la puerta --------------------- */

  /**
   * La mesa del invitado según el acomodo REAL (las colecciones que escribe
   * apps/mesas). Esta lista y la del acomodo se capturan por separado, así que
   * lo único que las une es el NOMBRE: solo se acepta una coincidencia
   * INEQUÍVOCA — una sola coincidencia por subcadena o, si hay varias, una
   * sola exacta. En la duda, sin mesa: mejor un pase sin mesa que mandar al
   * invitado a la mesa de otro.
   */
  const mesaDeInvitado = React.useCallback(
    (nombre: string): string => {
      const q = normalizarNombre(nombre);
      if (!q) return "";
      const parecidos = acomodo.filter((i) => normalizarNombre(i.nombre).includes(q));
      let elegido: InvitadoMesa | null = parecidos.length === 1 ? (parecidos[0] ?? null) : null;
      if (!elegido) {
        const exactos = parecidos.filter((i) => normalizarNombre(i.nombre) === q);
        if (exactos.length === 1) elegido = exactos[0] ?? null;
      }
      if (!elegido) return "";
      return mesaDe(elegido, mesas)?.nombre ?? "";
    },
    [acomodo, mesas],
  );

  /**
   * El PASE es otro enlace distinto a la invitación: el boleto con QR que se
   * escanea en la puerta. Sale de ESTA misma lista (con su mesa del acomodo
   * real, si ya se hizo) para no capturar a los invitados dos veces.
   */
  const paseDe = (inv: Invitado) =>
    enlacePase(codigo, {
      id: inv.id,
      nombre: inv.nombre,
      cupos: inv.cupos,
      mesa: mesaDeInvitado(inv.nombre) || undefined,
    });

  const compartirPase = (inv: Invitado) => {
    const url = paseDe(inv);
    if (!url) return;
    const msg = `Su pase para la entrada:\n${url}`;
    window.open(enlaceWhatsApp(inv.telefono, msg), "_blank", "noopener,noreferrer");
  };

  /** Para quien prefiere pegarlo a mano, igual que con la invitación. */
  const copiarPase = async (inv: Invitado) => {
    const url = paseDe(inv);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiadoPase(inv.id);
      setTimeout(() => setCopiadoPase(""), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  /*
   * Manda la lista COMPLETA a la app de la puerta: un renglón en la colección
   * "pases" por invitado. Guardar es un upsert, así que re-mandar actualiza
   * nombres y mesas sin duplicar a nadie.
   *
   * POR QUÉ EL PREFIJO PS- (idPaseDeInvitado): en la tabla `items` el id es
   * llave primaria de TODA la tabla, y el UUID del invitado YA es el id de su
   * renglón en "respuestas" — sin prefijo, cada pase pisaría su confirmación
   * en silencio.
   *
   * POR QUÉ tipo "General" siempre: la lista del panel no captura VIP a
   * propósito (un campo más por invitado que casi nadie usa); los VIP se
   * marcan en la app de la puerta. Los pases capturados a mano allá (ids SR-)
   * no se tocan nunca; los de esta lista (PS-) sí se reescriben enteros en
   * cada re-mandada, así que la marca VIP conviene ponerla sobre pases SR-.
   */
  const mandarAPuerta = async () => {
    setPuerta({ fase: "mandando" });
    const sync = obtenerSync();
    try {
      for (const inv of invitados) {
        await sync.guardar(codigo, COLECCION_PASES, {
          id: idPaseDeInvitado(inv.id),
          nombre: inv.nombre,
          mesa: mesaDeInvitado(inv.nombre),
          personas: inv.cupos,
          tipo: "General",
        });
      }
    } catch {
      setPuerta({ fase: "error" });
      return;
    }

    // Los pases PS- de invitados que YA no están en la lista se retiran, para
    // que la puerta no deje entrar a un borrado. Borrar exige la llave de
    // anfitrión: si este dispositivo no la tiene, se quedan y no pasa nada.
    if (esAnfitrion(codigo)) {
      try {
        const vigentes = new Set(invitados.map((i) => idPaseDeInvitado(i.id)));
        const pases = await sync.listar(codigo, COLECCION_PASES);
        for (const p of pases) {
          if (p.id.startsWith("PS-") && !vigentes.has(p.id)) {
            try {
              await sync.eliminar(codigo, COLECCION_PASES, p.id);
            } catch {
              /* sin llave el servidor lo rechaza, y no pasa nada */
            }
          }
        }
      } catch {
        /* si ni listar se pudo, la lista ya quedó mandada: no es un error */
      }
    }

    setPuerta({ fase: "lista", pases: invitados.length });
  };

  /* ------------------------------ Pantalla ----------------------------- */

  if (cargando) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!evento) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">No encontramos ese evento</h1>
        <Link href="/eventos" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="size-4" /> Volver a mis eventos
          </Button>
        </Link>
      </main>
    );
  }

  const tiles = [
    { n: confirmados.length, l: "Confirmaron", c: "text-green-600" },
    { n: rechazados.length, l: "No asisten", c: "text-red-600" },
    { n: pendientes, l: "Pendientes", c: "text-amber-600" },
    { n: personas, l: "Personas confirmadas", c: "text-primary" },
  ];

  /* ---- La lista para el banquetero ----------------------------------------
   * Lo que hace falta el día del evento es el recuento de PERSONAS, no de
   * invitaciones: por eso van las dos columnas y el total al final.
   *
   * Se incluyen también las confirmaciones SUELTAS (las que llegaron por el
   * enlace general y no estaban en la lista). Dejarlas fuera sería entregar un
   * conteo corto, que es justo el error que arruina un banquete. */
  const filasCSV = [
    ...invitados.map((i) => ({
      nombre: i.nombre,
      telefono: telefonoBonito(i.telefono),
      estado: estadoDe(i.id),
      personas: estadoDe(i.id) === EstadoRSVP.Confirmado ? (estados.get(i.id)?.personas ?? 0) : 0,
      cupos: i.cupos,
      origen: "En la lista",
    })),
    ...sueltas.map((r) => ({
      nombre: (typeof r.nombre === "string" && r.nombre) || "Sin nombre",
      // Quien contestó por el enlace general nunca dio su teléfono.
      telefono: "",
      estado: r.estado as Estado,
      personas:
        r.estado === EstadoRSVP.Confirmado && typeof r.personas === "number" ? r.personas : 0,
      cupos: 0,
      origen: "Confirmó por el enlace general",
    })),
  ];

  const ETIQUETA: Record<string, string> = {
    [EstadoRSVP.Confirmado]: "Confirmado",
    [EstadoRSVP.Rechazado]: "No asiste",
    [EstadoRSVP.Pendiente]: "Pendiente",
  };

  const exportarCSV = () => {
    const columnas: ColumnaCSV<(typeof filasCSV)[number]>[] = [
      { titulo: "Invitado", valor: (f) => f.nombre },
      { titulo: "WhatsApp", valor: (f) => f.telefono },
      { titulo: "Estado", valor: (f) => ETIQUETA[f.estado] ?? f.estado },
      { titulo: "Personas confirmadas", valor: (f) => f.personas },
      { titulo: "Cupos de la invitación", valor: (f) => (f.cupos > 0 ? f.cupos : "") },
      { titulo: "Origen", valor: (f) => f.origen },
    ];
    const total = filasCSV.reduce((s, f) => s + f.personas, 0);
    const csv = [
      aCSV(filasCSV, columnas),
      // Una última línea con el total: es el número que de verdad se consulta.
      // Los puntos y coma cuadran el total con la columna "Personas".
      `TOTAL DE PERSONAS CONFIRMADAS;;;${total};;`,
    ].join("\r\n");
    descargarCSV(`confirmaciones-${evento.codigo}`, csv);
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <Link
        href={`/eventos/${encodeURIComponent(codigo)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {evento.nombre}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Confirmaciones</h1>
          <p className="mt-2 text-muted-foreground">
            Quién viene, quién falta y cuántos son. Las respuestas llegan solas.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={exportarCSV}
              disabled={filasCSV.length === 0}
              title="Se abre en Excel o Google Sheets"
            >
              <Download className="size-4" /> Exportar la lista
            </Button>
            <Button
              onClick={() => void mandarAPuerta()}
              disabled={puerta.fase === "mandando" || invitados.length === 0}
              title="Copia esta lista a la app de la puerta, con la mesa de cada quien"
            >
              {puerta.fase === "mandando" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <DoorOpen className="size-4" />
              )}
              {puerta.fase === "mandando" ? "Mandando…" : "Mandar la lista a la puerta"}
            </Button>
          </div>
          <p className="max-w-sm text-right text-xs text-muted-foreground">
            La puerta escanea contra esta lista. Los pases VIP y los capturados a mano en la app de
            la puerta se conservan.
          </p>
          {puerta.fase === "lista" ? (
            <p className="text-xs font-medium text-green-600">
              Lista en la puerta ({puerta.pases} {puerta.pases === 1 ? "pase" : "pases"})
            </p>
          ) : null}
          {puerta.fase === "error" ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              No se pudo mandar la lista a la puerta. Revisa tu conexión y vuelve a intentarlo.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.l} className="p-5">
            <div className={cn("text-3xl font-semibold", t.c)}>{t.n}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.l}</div>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Avance de confirmaciones</span>
          <span>
            {confirmados.length}/{invitados.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${avance}%` }} />
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
        {/* Alta / edición */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold">{editId ? "Editar invitado" : "Agregar invitado"}</h2>
          <form onSubmit={guardarInvitado} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="inv-nombre">
                Nombre
              </label>
              <input
                id="inv-nombre"
                className={campo}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre del invitado o familia"
                maxLength={60}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="inv-tel">
                WhatsApp <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input
                id="inv-tel"
                type="tel"
                inputMode="tel"
                className={campo}
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="667 123 4567"
                maxLength={20}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {form.telefono.trim() ? (
                  normalizarTelefono(form.telefono) ? (
                    <>Se le escribirá a {telefonoBonito(normalizarTelefono(form.telefono))}.</>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Ese número no se entiende: se guardará sin teléfono.
                    </span>
                  )
                ) : (
                  <>Con teléfono, los botones de WhatsApp abren su chat directo.</>
                )}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="inv-cupos">
                Cupos (personas máximo)
              </label>
              <select
                id="inv-cupos"
                className={campo}
                value={form.cupos}
                onChange={(e) => setForm({ ...form, cupos: e.target.value })}
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {!cuposDisponibles() ? (
                <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                  Los cupos no se están guardando: falta aplicar la migración 0011. Cada invitación
                  vale por una persona mientras tanto.
                </p>
              ) : null}
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={guardando}>
                {guardando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : editId ? (
                  <Check className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editId ? "Guardar" : "Agregar"}
              </Button>
              {editId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditId(null);
                    setForm({ nombre: "", cupos: "2", telefono: "" });
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>

          {/* ---- Pegar la lista completa ------------------------------------
              Va debajo del alta de uno en uno y no arriba: el salón que llega
              por primera vez entiende "Agregar invitado" sin leer nada, y el
              que ya tiene su Excel encuentra esto en el mismo sitio. */}
          {!editId ? (
            <div className="mt-6 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setPegarAbierto((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-medium transition-colors hover:text-primary"
              >
                <span className="inline-flex items-center gap-2">
                  <ClipboardList className="size-4" /> Pegar la lista completa
                </span>
                <span className="text-muted-foreground">{pegarAbierto ? "−" : "+"}</span>
              </button>

              {pegarAbierto ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Un invitado por renglón: <b>nombre, teléfono, cupos</b>. El teléfono y los cupos
                    son opcionales. Se puede pegar tal cual desde Excel; los que ya estén en la
                    lista no se repiten.
                  </p>
                  <textarea
                    className={cn(campo, "min-h-32 font-mono text-xs")}
                    value={pegado}
                    onChange={(e) => {
                      setPegado(e.target.value);
                      setPegadoHecho("");
                    }}
                    placeholder={"Familia Ramírez, 6671234567, 4\nAna Sofía Ríos, 6679876543\nTío Beto"}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" htmlFor="peg-cupos">
                      Cupos para los renglones que no lo digan
                    </label>
                    <select
                      id="peg-cupos"
                      className={campo}
                      value={cuposPegado}
                      onChange={(e) => setCuposPegado(e.target.value)}
                    >
                      {Array.from({ length: CUPOS_MAX }, (_, i) => String(i + 1)).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Se enseña ANTES de agregar: nadie debería pegar a ciegas. */}
                  {vistaPrevia ? (
                    <p className="text-xs">
                      <span className="font-medium">{resumenLista(vistaPrevia)}.</span>
                      {vistaPrevia.rechazados.length ? (
                        <span className="mt-1 block text-amber-600 dark:text-amber-400">
                          Sin nombre y por eso fuera: {vistaPrevia.rechazados.slice(0, 3).join(" · ")}
                          {vistaPrevia.rechazados.length > 3 ? "…" : ""}
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  {pegadoHecho ? <p className="text-xs text-primary">{pegadoHecho}</p> : null}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={pegando || !vistaPrevia?.filas.length}
                    onClick={() => void agregarPegados()}
                  >
                    {pegando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    {vistaPrevia?.filas.length
                      ? `Agregar ${vistaPrevia.filas.length}`
                      : "Agregar todos"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* Lista de invitados */}
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{invitados.length}</span>{" "}
            {invitados.length === 1 ? "invitado" : "invitados"} en la lista. Manda a cada uno su
            enlace, o marca tú la respuesta.
          </p>

          {invitados.length === 0 ? (
            <Card className="p-8 text-center">
              <h3 className="font-semibold">Todavía no hay invitados</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Agrega al primero aquí al lado. Si no la ves llenarse, revisa que el permiso por
                salón (migración 0008) esté aplicado.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {invitados.map((inv) => {
                const estado = estadoDe(inv.id);
                const confirmo = estado === EstadoRSVP.Confirmado;
                const mesaPase = mesaDeInvitado(inv.nombre);
                return (
                  <Card key={inv.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{inv.nombre}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                              ESTILO[estado],
                            )}
                          >
                            {ETIQUETA[estado]}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {confirmo
                            ? `${estados.get(inv.id)?.personas ?? 0} de ${inv.cupos} personas`
                            : `Hasta ${inv.cupos} ${inv.cupos === 1 ? "persona" : "personas"}`}
                          {/* El teléfono se enseña para que se vea de un vistazo
                              a quién le falta: sin él, WhatsApp abre el selector
                              de contactos y hay que buscarlo a mano. */}
                          {inv.telefono ? (
                            <> · {telefonoBonito(inv.telefono)}</>
                          ) : (
                            <span className="text-amber-600/80 dark:text-amber-400/80">
                              {" "}
                              · sin WhatsApp
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {confirmo && inv.cupos > 1 ? (
                          <select
                            aria-label={`Personas que asistirán de ${inv.nombre}`}
                            className="rounded-[var(--radius)] border border-border bg-background px-2 py-1.5 text-sm"
                            value={String(estados.get(inv.id)?.personas ?? inv.cupos)}
                            onChange={(e) => cambiarPersonas(inv, parseInt(e.target.value, 10))}
                          >
                            {Array.from({ length: inv.cupos }, (_, i) => String(i + 1)).map((n) => (
                              <option key={n} value={n}>
                                {n} pers
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <div className="inline-flex overflow-hidden rounded-[var(--radius)] border border-border">
                          <button
                            onClick={() => marcar(inv, EstadoRSVP.Confirmado)}
                            aria-label={`Marcar que ${inv.nombre} sí asiste`}
                            className={cn(
                              "px-2.5 py-1.5 text-sm transition-colors",
                              confirmo
                                ? "bg-green-500/15 text-green-600"
                                : "text-muted-foreground hover:bg-muted",
                            )}
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => marcar(inv, EstadoRSVP.Rechazado)}
                            aria-label={`Marcar que ${inv.nombre} no asiste`}
                            className={cn(
                              "border-l border-border px-2.5 py-1.5 text-sm transition-colors",
                              estado === EstadoRSVP.Rechazado
                                ? "bg-red-500/15 text-red-600"
                                : "text-muted-foreground hover:bg-muted",
                            )}
                          >
                            No
                          </button>
                          <button
                            onClick={() => marcar(inv, EstadoRSVP.Pendiente)}
                            aria-label={`Dejar a ${inv.nombre} como pendiente`}
                            className={cn(
                              "border-l border-border px-2.5 py-1.5 text-sm transition-colors",
                              estado === EstadoRSVP.Pendiente
                                ? "bg-amber-500/15 text-amber-600"
                                : "text-muted-foreground hover:bg-muted",
                            )}
                          >
                            ↺
                          </button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => compartir(inv)}>
                          <MessageCircle className="size-4" /> Enviar
                        </Button>
                        {/* La invitación completa (saluda por su nombre y enseña su mesa),
                            no solo el RSVP: por WhatsApp o copiada para pegarla a mano. */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => compartirInvitacion(inv)}
                          title={`La invitación personal de ${inv.nombre}: lo saluda por su nombre y le enseña su mesa`}
                        >
                          <Mail className="size-4" /> Invitación
                        </Button>
                        <button
                          onClick={() => void copiarInvitacion(inv)}
                          aria-label={`Copiar la invitación personal de ${inv.nombre}`}
                          title="Copiar su enlace de la invitación"
                          className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {copiadoInv === inv.id ? (
                            <Check className="size-4 text-green-600" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => editar(inv)}>
                          Editar
                        </Button>
                        <button
                          onClick={() => setPorQuitar({ tipo: "invitado", inv })}
                          aria-label={`Eliminar a ${inv.nombre}`}
                          className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    {/* Segunda línea: el PASE de la puerta. La fila de arriba ya
                        va apretada, y el pase es otro enlace distinto a la
                        invitación: el boleto con QR que se escanea al llegar,
                        con su mesa del acomodo real si ya se hizo. */}
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 border-t border-border pt-2">
                      {mesaPase ? (
                        <span className="mr-auto text-xs text-muted-foreground">
                          Su pase lleva la mesa {mesaPase}
                        </span>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => compartirPase(inv)}
                        title={`El pase de entrada de ${inv.nombre}: el boleto con QR que se escanea en la puerta`}
                      >
                        <Ticket className="size-4" /> Pase
                      </Button>
                      <button
                        onClick={() => void copiarPase(inv)}
                        aria-label={`Copiar el pase de entrada de ${inv.nombre}`}
                        title="Copiar su enlace del pase"
                        className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {copiadoPase === inv.id ? (
                          <Check className="size-4 text-green-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmaciones sin invitación personal */}
      {sueltas.length > 0 ? (
        <Card className="mt-8 p-6">
          <div className="flex items-start gap-3">
            <Share2 className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Confirmaciones desde el portal</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Contestaron con el enlace general del evento y no estaban en tu lista.
                {personasSueltas > 0
                  ? ` Suman ${personasSueltas} persona${personasSueltas === 1 ? "" : "s"} además de las de arriba.`
                  : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {sueltas.map((r) => {
              const estado = (r.estado as Estado) ?? EstadoRSVP.Pendiente;
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.nombre?.trim() || "Sin nombre"}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium ring-1",
                        ESTILO[estado],
                      )}
                    >
                      {ETIQUETA[estado]}
                    </span>
                    {estado === EstadoRSVP.Confirmado ? (
                      <span className="text-sm text-muted-foreground">
                        {r.personas} {r.personas === 1 ? "persona" : "personas"}
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={() =>
                      setPorQuitar({ tipo: "suelta", id: r.id, nombre: r.nombre || "sin nombre" })
                    }
                    aria-label={`Descartar la confirmación de ${r.nombre || "sin nombre"}`}
                    className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo={
          porQuitar?.tipo === "invitado" ? "¿Borrar a este invitado?" : "¿Descartar esta confirmación?"
        }
        descripcion={
          porQuitar?.tipo === "invitado" ? (
            <>
              Se borra a <strong>{porQuitar.inv.nombre}</strong> de la lista del evento, junto con su
              confirmación. No se puede deshacer: habría que volver a capturarlo.
            </>
          ) : (
            <>
              Se descarta la confirmación de <strong>{porQuitar?.nombre}</strong>, que no está en tu
              lista de invitados. Si vuelve a confirmar desde su enlace, reaparecerá.
            </>
          )
        }
        textoConfirmar={porQuitar?.tipo === "invitado" ? "Sí, borrarlo" : "Sí, descartarla"}
        onConfirmar={() => {
          const p = porQuitar;
          setPorQuitar(null);
          if (!p) return;
          if (p.tipo === "invitado") void eliminar(p.inv);
          else descartarSuelta(p.id);
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </main>
  );
}
