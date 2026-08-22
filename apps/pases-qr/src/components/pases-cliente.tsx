"use client";

import * as React from "react";
import { Plus, Check, X, Trash2, Download, MessageCircle } from "lucide-react";
import { Button, Card, cn, Confirmar, leerLocal } from "@salones/ui";
import { obtenerSync, eventoActual, esVitrinaPropia, idDeEjemplo } from "@salones/sync";
import {
  invitadosIniciales,
  idDesdeQR,
  nuevoId,
  codificarPase,
  COLECCION_PASES,
  COLECCION_ACCESOS,
  idDeAcceso,
  type Acceso,
  type Invitado,
  type Tipo,
  etiquetaMesa,
} from "@/lib/evento";
import { useEventoReal } from "@/lib/evento-real";
import { PassTicket } from "./pass-ticket";
import { Escaner } from "./escaner";

/**
 * Las claves de cuando todo vivía en este aparato. Ya no se escriben: solo se
 * leen una vez, para ofrecer subir al evento la lista que quedó guardada de
 * antes — si no, los QR ya impresos dejarían de encontrar a su invitado.
 */
const LISTA_VIEJA = "pases-sr-lista";

/** Hora legible (ej. "5:22 p. m.") de una marca de tiempo. Vacío si no es válida. */
function horaDe(ts: unknown): string {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return "";
  return new Date(ts).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
}

type Aviso = {
  estado: "ok" | "repetido" | "invalido";
  titulo: string;
  detalle?: string;
  hora?: string;
} | null;
type Tab = "invitados" | "pases" | "checkin";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

/**
 * ¿Esto que viene del archivo tiene pinta de una lista de invitados?
 *
 * Antes se metía tal cual lo que trajera el JSON: un archivo equivocado
 * sustituía la lista de la puerta por basura, el día del evento, sin deshacer.
 *
 * Es una función pura, así que vive fuera del componente: la usan tanto la
 * importación como la carga inicial (que corre antes que el cuerpo).
 */
function esListaDeInvitados(data: unknown): data is Invitado[] {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    data.every(
      (x) =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as Invitado).id === "string" &&
        typeof (x as Invitado).nombre === "string",
    )
  );
}

export function PasesCliente() {
  const [tab, setTab] = React.useState<Tab>("invitados");
  // El evento real (si lo hay): sus textos pintan los boletos y el mensaje de
  // WhatsApp; en la vitrina siguen siendo los de la muestra, como siempre.
  const { codigo: codigoEvento, textos } = useEventoReal();
  const [invitados, setInvitados] = React.useState<Invitado[]>([]);
  const [ingresados, setIngresados] = React.useState<Record<string, number>>({});

  // Formulario de alta / edición
  const [form, setForm] = React.useState<{ nombre: string; mesa: string; personas: string; tipo: Tipo }>(
    { nombre: "", mesa: "", personas: "2", tipo: "General" },
  );
  const [editId, setEditId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState("");

  const [paseVer, setPaseVer] = React.useState<Invitado | null>(null);
  const [resultado, setResultado] = React.useState<Aviso>(null);
  const [confirmarReinicio, setConfirmarReinicio] = React.useState(false);
  const [importPendiente, setImportPendiente] = React.useState<Invitado[] | null>(null);
  const [errorImportar, setErrorImportar] = React.useState("");
  const [error, setError] = React.useState("");
  /** La lista que quedó en este aparato de antes, esperando que la suban. */
  const [listaVieja, setListaVieja] = React.useState<Invitado[] | null>(null);

  const invitadosRef = React.useRef(invitados);
  const ingresadosRef = React.useRef(ingresados);
  const ultimo = React.useRef<{ id: string; t: number } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  /* ---- La lista y la puerta, en el evento (6 ago 2026) --------------------
   * Antes esto eran dos llaves de localStorage SIN el código del evento. Se
   * veía en la fiesta: dos bodas en la misma tablet se pisaban, si el teléfono
   * de la puerta se quedaba sin batería se perdía quién había entrado, y dos
   * personas escaneando en dos puertas veían listas distintas.
   *
   * Ahora son dos colecciones del evento, como el muro o el álbum. En modo
   * local (la demo) @salones/sync sigue usando localStorage, pero ya separado
   * por evento, así que dos bodas dejan de mezclarse aunque no haya servidor. */
  React.useEffect(() => {
    const eventoId = eventoActual();
    const sync = obtenerSync();

    const cancelarPases = sync.suscribir<Invitado>(eventoId, COLECCION_PASES, setInvitados);
    const cancelarAccesos = sync.suscribir<Acceso>(eventoId, COLECCION_ACCESOS, (filas) => {
      const mapa: Record<string, number> = {};
      for (const a of filas) if (a.entro) mapa[a.invitadoId] = a.ts;
      setIngresados(mapa);
    });

    if (sync.nombre === "local" || esVitrinaPropia(eventoId)) {
      /*
       * Los ejemplos se siembran en modo local y en la VITRINA PROPIA de este
       * visitante, con el sufijo de su vitrina en el id (la llave primaria de
       * `items` es global). En el "demo" compartido no se siembra.
       * Se siembran al revés para que se vean en el orden de siempre.
       */
      void sync.listar<Invitado>(eventoId, COLECCION_PASES).then((items) => {
        if (items.length === 0) {
          for (const i of [...invitadosIniciales].reverse()) {
            void sync.guardar(eventoId, COLECCION_PASES, {
              ...i,
              id: idDeEjemplo(i.id, eventoId),
            });
          }
        }
      });
    } else {
      // Con servidor: si este aparato guarda una lista de antes y el evento
      // está vacío, se ofrece subirla. No se hace solo, porque esa lista no
      // sabe de qué boda era y podría ser la de la semana pasada.
      void sync.listar<Invitado>(eventoId, COLECCION_PASES).then((items) => {
        if (items.length > 0) return;
        try {
          const crudo = leerLocal(LISTA_VIEJA);
          const previa = crudo ? (JSON.parse(crudo) as unknown) : null;
          if (esListaDeInvitados(previa)) setListaVieja(previa);
        } catch {
          /* si no se puede leer, no se ofrece nada */
        }
      });
    }

    return () => {
      cancelarPases();
      cancelarAccesos();
    };
  }, []);

  React.useEffect(() => {
    invitadosRef.current = invitados;
  }, [invitados]);
  React.useEffect(() => {
    ingresadosRef.current = ingresados;
  }, [ingresados]);

  const totalPersonas = invitados.reduce((s, i) => s + i.personas, 0);
  const nIngresados = invitados.filter((i) => ingresados[i.id]).length;
  const personasDentro = invitados
    .filter((i) => ingresados[i.id])
    .reduce((s, i) => s + i.personas, 0);

  // --- Organizador: alta / edición / borrado ---
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setFormError("Escribe el nombre del invitado.");
      return;
    }
    setFormError("");
    const personas = Math.max(1, parseInt(form.personas, 10) || 1);
    const mesa = form.mesa.trim() || "—";
    const anterior = editId ? invitados.find((i) => i.id === editId) : null;
    const inv: Invitado = {
      id: anterior ? anterior.id : nuevoId(invitados),
      nombre: form.nombre.trim(),
      mesa,
      personas,
      tipo: form.tipo,
    };
    try {
      await obtenerSync().guardar(eventoActual(), COLECCION_PASES, inv);
      setError("");
    } catch {
      setFormError("No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setForm({ nombre: "", mesa: "", personas: "2", tipo: "General" });
    setEditId(null);
  };

  const editar = (inv: Invitado) => {
    setEditId(inv.id);
    setForm({ nombre: inv.nombre, mesa: inv.mesa, personas: String(inv.personas), tipo: inv.tipo });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const cancelarEdicion = () => {
    setEditId(null);
    setForm({ nombre: "", mesa: "", personas: "2", tipo: "General" });
    setFormError("");
  };
  const [porQuitar, setPorQuitar] = React.useState<Invitado | null>(null);

  /**
   * Quitar un invitado de la lista.
   *
   * ⚠️ BORRAR EXIGE LA LLAVE DE ANFITRIÓN desde el corte de la 0009. La tablet
   * de la puerta normalmente NO la tiene, así que esto puede fallar — y falla
   * avisando, no en silencio. Se abre la app con el enlace de anfitrión (el que
   * lleva `&a=`, se saca desde el panel del salón) para poder borrar.
   */
  const eliminar = async (id: string) => {
    const sync = obtenerSync();
    const eventoId = eventoActual();
    try {
      await sync.eliminar(eventoId, COLECCION_PASES, id);
      // Y su registro de entrada, si lo tenía. Si no existe, no protesta.
      await sync.eliminar(eventoId, COLECCION_ACCESOS, idDeAcceso(id));
      setError("");
    } catch {
      setError(
        "No pudimos quitar a ese invitado. Para borrar hace falta abrir la app con el enlace de anfitrión (el que lleva &a=), que sale del panel del salón.",
      );
    }
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify(invitados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitados.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const importar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let data: unknown;
      try {
        data = JSON.parse(String(r.result));
      } catch {
        setErrorImportar("Ese archivo no se puede leer. ¿Es el .json que exportaste desde aquí?");
        return;
      }
      if (!esListaDeInvitados(data)) {
        setErrorImportar("Ese archivo no contiene una lista de invitados válida.");
        return;
      }
      setErrorImportar("");
      // Si ya hay lista, no se pisa sin preguntar: se queda esperando.
      if (invitados.length > 0) setImportPendiente(data);
      else setInvitados(data);
    };
    r.readAsText(f);
    e.target.value = "";
  };

  /**
   * Mete la lista del archivo en el evento.
   *
   * Antes SUSTITUÍA la lista de un golpe. Ahora agrega y actualiza, pero no
   * borra lo que ya había: con un almacén central serían N borrados sueltos,
   * sin transacción y con la llave de anfitrión de por medio, y cortarse a la
   * mitad dejaría la puerta con media lista vieja y media nueva. Para quitar a
   * alguien está su botón de borrar.
   */
  const aplicarImportacion = async () => {
    const lista = importPendiente;
    setImportPendiente(null);
    if (!lista) return;
    const sync = obtenerSync();
    const eventoId = eventoActual();
    let fallidos = 0;
    for (const inv of lista) {
      try {
        await sync.guardar(eventoId, COLECCION_PASES, inv);
      } catch {
        fallidos++;
      }
    }
    setError(
      fallidos === 0
        ? ""
        : `Se importaron ${lista.length - fallidos} de ${lista.length}. Revisa tu conexión e inténtalo otra vez.`,
    );
  };

  /** Sube al evento la lista que había quedado en este aparato. */
  const subirListaVieja = async () => {
    const lista = listaVieja;
    setListaVieja(null);
    if (!lista) return;
    const sync = obtenerSync();
    const eventoId = eventoActual();
    for (const inv of [...lista].reverse()) {
      try {
        await sync.guardar(eventoId, COLECCION_PASES, inv);
      } catch {
        setError("No pudimos subir toda la lista. Revisa tu conexión e inténtalo otra vez.");
        return;
      }
    }
  };

  /**
   * En un evento real el enlace del pase lleva su código (`?e=`): así el
   * boleto que se abre lee los textos y la mesa de ESA boda, y puede tender su
   * puente al portal. En la demo va sin código, igual que siempre.
   */
  const compartir = (inv: Invitado) => {
    const codigo = eventoActual();
    const conEvento = codigo !== "demo" ? `?e=${encodeURIComponent(codigo)}` : "";
    const url = `${window.location.origin}/pase${conEvento}#${codificarPase(inv)}`;
    const msg = `¡Hola! Aquí está tu pase para ${textos.nombre}${
      textos.fecha ? ` (${textos.fecha})` : ""
    }. Ábrelo y muéstralo en la entrada:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  // --- Check-in ---

  /**
   * Apunta (o corrige) la entrada de alguien.
   *
   * Desmarcar NO borra la fila: la deja con `entro: false`. Borrar exigiría la
   * llave de anfitrión, y corregir un check-in equivocado es cosa normal de la
   * puerta, no moderación: no puede depender de una llave privada.
   */
  const apuntarEntrada = React.useCallback(async (id: string, entro: boolean, ts: number) => {
    try {
      await obtenerSync().guardar(eventoActual(), COLECCION_ACCESOS, {
        id: idDeAcceso(id),
        invitadoId: id,
        entro,
        ts,
      } satisfies Acceso);
      setError("");
      return true;
    } catch {
      setError(
        "No pudimos guardar el ingreso en el servidor. Lo ves en esta pantalla, pero la otra puerta NO lo va a ver.",
      );
      return false;
    }
  }, []);

  const marcar = (id: string, val: boolean) => {
    // Se pinta ya y se guarda después: en la puerta la respuesta tiene que ser
    // instantánea. Si el guardado falla, el aviso lo dice.
    setIngresados((s) => {
      const n = { ...s };
      if (val) n[id] = Date.now();
      else delete n[id];
      return n;
    });
    void apuntarEntrada(id, val, Date.now());
  };

  const registrar = React.useCallback((inv: Invitado) => {
    const yaTs = ingresadosRef.current[inv.id];
    if (yaTs) {
      setResultado({
        estado: "repetido",
        titulo: inv.nombre,
        detalle: `Ya había ingresado · ${etiquetaMesa(inv.mesa)} · ${inv.personas} pers`,
        hora: horaDe(yaTs),
      });
    } else {
      const ts = Date.now();
      // Igual que al marcar a mano: se pinta ya y se guarda después.
      setIngresados((s) => ({ ...s, [inv.id]: ts }));
      void apuntarEntrada(inv.id, true, ts);
      setResultado({
        estado: "ok",
        titulo: inv.nombre,
        detalle: `¡Puede ingresar! · ${etiquetaMesa(inv.mesa)} · ${inv.personas} pers`,
        hora: horaDe(ts),
      });
    }
  }, [apuntarEntrada]);

  const onDetectar = React.useCallback(
    (texto: string) => {
      const id = idDesdeQR(texto);
      const now = Date.now();
      // El candado dura lo MISMO que el aviso en pantalla (6 s). Con 2,5 s, si el
      // invitado dejaba su QR delante de la camara —que es lo normal— el verde
      // "¡Puede ingresar!" se convertia solo en el ambar "Ya habia ingresado" y
      // el de la puerta veia un pase repetido donde no lo habia.
      if (id && ultimo.current && ultimo.current.id === id && now - ultimo.current.t < 6000) return;
      if (id) ultimo.current = { id, t: now };
      const inv = id ? invitadosRef.current.find((i) => i.id === id) : undefined;
      if (!inv) {
        setResultado({
          estado: "invalido",
          titulo: "Pase no válido",
          detalle: "No se reconoció este código.",
        });
        return;
      }
      registrar(inv);
    },
    [registrar],
  );

  // El aviso grande se oculta solo después de unos segundos; la hora queda
  // registrada en la lista de abajo como comprobante permanente.
  React.useEffect(() => {
    if (!resultado) return;
    const t = window.setTimeout(() => setResultado(null), 6000);
    return () => window.clearTimeout(t);
  }, [resultado]);

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-[var(--radius)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {listaVieja ? (
        <Card className="mb-4 p-4">
          <p className="text-sm">
            Este dispositivo tiene guardada una lista de{" "}
            <strong>{listaVieja.length} invitados</strong> de antes, y este evento está vacío.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Súbela si es la de esta boda: así los pases que ya repartiste seguirán funcionando. Si
            era de otro evento, descártala.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void subirListaVieja()}>
              Subir esta lista al evento
            </Button>
            <Button variant="outline" size="sm" onClick={() => setListaVieja(null)}>
              Descartar
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Pestañas */}
      <div className="mb-8 inline-flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
        {(
          [
            ["invitados", "Invitados"],
            ["pases", "Pases"],
            ["checkin", "Entrada"],
          ] as const
        ).map(([clave, texto]) => (
          <button
            key={clave}
            onClick={() => setTab(clave)}
            aria-selected={tab === clave}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === clave
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {texto}
          </button>
        ))}
      </div>

      {/* ---------- INVITADOS (organizador) ---------- */}
      {tab === "invitados" ? (
        /* Los dos hijos llevan `min-w-0`: en celular esta rejilla es de una
           sola columna y un hijo de grid no se encoge por debajo de su
           contenido. Con un nombre largo ("Familia Hernández de la Torre y
           Villaseñor") la página se ensanchaba y el celular la encogía; de
           paso, el `truncate` del nombre por fin recorta como debe. */
        <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
          <div ref={formRef} className="min-w-0">
            <Card className="p-6">
            <h2 className="text-lg font-semibold">
              {editId ? "Editar invitado" : "Agregar invitado"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Al guardar se crea su pase con QR automáticamente.
            </p>
            {codigoEvento !== "demo" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Con el servicio del evento, la lista también se puede mandar desde el panel del
                salón (Confirmaciones).
              </p>
            ) : null}
            <form onSubmit={(e) => void guardar(e)} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nombre</label>
                <input
                  className={campo}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre del invitado o familia"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Mesa</label>
                  <input
                    className={campo}
                    value={form.mesa}
                    onChange={(e) => setForm({ ...form, mesa: e.target.value })}
                    placeholder="Ej. 4"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Personas</label>
                  <select
                    className={campo}
                    value={form.personas}
                    onChange={(e) => setForm({ ...form, personas: e.target.value })}
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Tipo de acceso</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["General", "VIP"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: t })}
                      className={cn(
                        "rounded-[var(--radius)] border px-3 py-2 text-sm transition-colors",
                        form.tipo === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editId ? (
                    <>
                      <Check className="size-4" /> Guardar
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Agregar
                    </>
                  )}
                </Button>
                {editId ? (
                  <Button type="button" variant="outline" onClick={cancelarEdicion}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
            </Card>
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{invitados.length}</span> invitados ·{" "}
                <span className="font-semibold text-foreground">{totalPersonas}</span> personas
              </p>
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  onChange={importar}
                  className="hidden"
                />
                <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  Importar
                </Button>
                <Button variant="outline" size="sm" onClick={exportar}>
                  <Download className="size-4" /> Exportar
                </Button>
              </div>
            </div>

            {errorImportar ? (
              <p className="mb-4 rounded-[var(--radius)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {errorImportar}
              </p>
            ) : null}

            <Confirmar
              abierto={importPendiente !== null}
              titulo="¿Sustituir la lista de invitados?"
              descripcion={
                <>
                  El archivo trae <strong>{importPendiente?.length ?? 0}</strong> invitados y
                  sustituye por completo a los <strong>{invitados.length}</strong> que tienes
                  ahora. <strong>No hay deshacer.</strong> Si quieres conservar la lista actual,
                  cancela y usa <em>Exportar</em> primero.
                </>
              }
              textoConfirmar="Sí, sustituir la lista"
              onConfirmar={() => void aplicarImportacion()}
              onCancelar={() => setImportPendiente(null)}
            />

            <div className="space-y-2">
              {invitados.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Aún no hay invitados. Agrega el primero con el formulario.
                </Card>
              ) : (
                invitados.map((inv) => (
                  <Card key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{inv.nombre}</span>
                        {inv.tipo === "VIP" ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            VIP
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {etiquetaMesa(inv.mesa)} · {inv.personas} pers · {inv.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setPaseVer(inv)}>
                        Ver pase
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => editar(inv)}>
                        Editar
                      </Button>
                      <button
                        onClick={() => setPorQuitar(inv)}
                        aria-label={`Eliminar ${inv.nombre}`}
                        className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- PASES ---------- */}
      {tab === "pases" ? (
        <div>
          <p className="text-sm text-muted-foreground">
            Así se ve el pase que recibe cada invitado. Toca uno para verlo en grande y enviarlo.
          </p>
          {invitados.length === 0 ? (
            <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
              Agrega invitados en la pestaña “Invitados” para generar sus pases.
            </Card>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {invitados.map((inv) => (
                <button key={inv.id} onClick={() => setPaseVer(inv)} className="text-left">
                  <PassTicket inv={inv} size="sm" textos={textos} />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ---------- ENTRADA / CHECK-IN ---------- */}
      {tab === "checkin" ? (
        <div>
          <Escaner onDetectar={onDetectar} />

          {resultado ? (
            /* En el celular el veredicto va FIJO sobre la pantalla: la cámara
               ocupa casi todo el alto y el aviso quedaba abajo, fuera de la
               vista. Quien está en la puerta no puede andar deslizando después
               de cada escaneo con la fila esperando. En pantalla grande se
               queda donde siempre. El fondo sólido es para que se lea encima
               de lo que haya debajo. */
            <div
              key={`${resultado.titulo}-${resultado.hora ?? ""}`}
              className="fixed inset-x-4 bottom-4 z-40 rounded-[var(--radius)] bg-card shadow-2xl sm:static sm:inset-auto sm:mt-4 sm:bg-transparent sm:shadow-none"
            >
            <div
              className={cn(
                "flex items-center gap-4 rounded-[var(--radius)] border-2 p-5 shadow-lg",
                resultado.estado === "ok"
                  ? "border-green-500/60 bg-green-500/10"
                  : resultado.estado === "repetido"
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-red-500/60 bg-red-500/10",
              )}
            >
              <div
                className={cn(
                  "grid size-14 shrink-0 place-items-center rounded-full text-white",
                  resultado.estado === "ok"
                    ? "bg-green-500"
                    : resultado.estado === "repetido"
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
              >
                {resultado.estado === "invalido" ? (
                  <X className="size-8" />
                ) : (
                  <Check className="size-8" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xl font-bold leading-tight",
                    resultado.estado === "ok"
                      ? "text-green-700 dark:text-green-400"
                      : resultado.estado === "repetido"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-red-700 dark:text-red-400",
                  )}
                >
                  {resultado.titulo}
                </p>
                {resultado.detalle ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{resultado.detalle}</p>
                ) : null}
                {resultado.hora ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Escaneado a las {resultado.hora}
                  </p>
                ) : null}
              </div>
            </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
            <div className="text-sm">
              <span className="font-semibold">{nIngresados}</span> de {invitados.length} pases ·{" "}
              <span className="font-semibold">{personasDentro}</span> de {totalPersonas} personas
              dentro
            </div>
            <Button variant="ghost" size="sm" onClick={() => setConfirmarReinicio(true)}>
              Reiniciar
            </Button>
          </div>

          <Confirmar
            abierto={confirmarReinicio}
            titulo="¿Borrar el registro de entrada?"
            descripcion={
              <>
                Se olvidan los <strong>{nIngresados}</strong> pases que ya entraron. La lista de
                invitados no se toca, pero el control de la puerta empieza de cero y{" "}
                <strong>no se puede recuperar</strong>: quien ya pasó podría volver a entrar sin
                que nadie lo note.
              </>
            }
            textoConfirmar="Sí, empezar de cero"
            onConfirmar={() => {
              setConfirmarReinicio(false);
              const marcados = Object.keys(ingresadosRef.current);
              setIngresados({});
              // Se corrigen uno a uno (entro: false) en vez de borrar las filas:
              // borrar exigiría la llave de anfitrión y esto es cosa de la puerta.
              void (async () => {
                for (const id of marcados) await apuntarEntrada(id, false, Date.now());
              })();
            }}
            onCancelar={() => setConfirmarReinicio(false)}
          />

          <div className="mt-4 space-y-2">
            {invitados.map((inv) => {
              const dentro = !!ingresados[inv.id];
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{inv.nombre}</span>
                      {inv.tipo === "VIP" ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          VIP
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {etiquetaMesa(inv.mesa)} · {inv.personas} pers · {inv.id}
                    </div>
                    {dentro ? (
                      <div className="mt-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        Ingresó{horaDe(ingresados[inv.id]) ? ` · ${horaDe(ingresados[inv.id])}` : ""}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant={dentro ? "primary" : "outline"}
                    size="sm"
                    onClick={() => marcar(inv.id, !dentro)}
                  >
                    {dentro ? (
                      <>
                        <Check className="size-4" /> Ingresó
                      </>
                    ) : (
                      "Marcar ingreso"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ---------- Modal: ver / enviar pase ---------- */}
      {paseVer ? (
        <div
          onClick={() => setPaseVer(null)}
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <PassTicket inv={paseVer} textos={textos} />
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => compartir(paseVer)}>
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </Button>
              <Button variant="outline" onClick={() => setPaseVer(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo="¿Borrar este pase?"
        descripcion={
          <>
            Se borra a <strong>{porQuitar?.nombre}</strong> de la lista de la puerta, con su pase y su
            registro de entrada. <strong>El QR que ya le enviaste dejará de valer.</strong> No se
            puede deshacer.
          </>
        }
        textoConfirmar="Sí, borrarlo"
        onConfirmar={() => {
          const inv = porQuitar;
          setPorQuitar(null);
          if (inv) void eliminar(inv.id);
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}
