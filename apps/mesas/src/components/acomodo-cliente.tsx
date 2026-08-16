"use client";

import * as React from "react";
import {
  Plus,
  Check,
  Trash2,
  Users,
  GripVertical,
  Share2,
  Download,
  Upload,
  RotateCcw,
  X,
  Copy,
  MessageCircle,
  Search,
  Pencil,
} from "lucide-react";
import { Button, Card, cn, Confirmar } from "@salones/ui";
import { obtenerSync, eventoActual } from "@salones/sync";
import { QR } from "@/components/qr";
import {
  mesasIniciales,
  invitadosIniciales,
  evento,
  asientosUsados,
  invitadosDeMesa,
  sinAsignar,
  nuevoIdMesa,
  nuevoIdInvitado,
  normaliza,
  codificarAcomodo,
  validarAcomodo,
  porOrden,
  COLECCION_MESAS,
  COLECCION_ACOMODO,
  type Mesa,
  type Invitado,
} from "@/lib/mesas";

/**
 * El acomodo vive ahora en el evento (@salones/sync), no en dos llaves de este
 * aparato. Antes las claves no llevaban el código del evento, así que dos bodas
 * en la misma tablet compartían literalmente las mismas dos cajas — y si el
 * navegador se limpiaba, el acomodo de la boda se iba con él.
 */

/** Máx. de caracteres del enlace para que su QR siga siendo fácil de escanear. */
const UMBRAL_QR = 1200;

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

/** Color del contador de una mesa según qué tan llena esté. */
function tonoOcupacion(usados: number, cap: number): string {
  if (usados > cap) return "bg-red-500/10 text-red-600 ring-red-500/30";
  if (usados === cap) return "bg-primary/10 text-primary ring-primary/30";
  return "bg-green-500/10 text-green-600 ring-green-500/30";
}

export function AcomodoCliente() {
  const [mesas, setMesas] = React.useState<Mesa[]>([]);
  const [invitados, setInvitados] = React.useState<Invitado[]>([]);

  // Formularios (dan de alta y también editan, como en el resto de la suite).
  const [mesaForm, setMesaForm] = React.useState({ nombre: "", capacidad: "10" });
  const [editMesaId, setEditMesaId] = React.useState<string | null>(null);
  const [invForm, setInvForm] = React.useState({ nombre: "", asientos: "1" });
  const [editInvId, setEditInvId] = React.useState<string | null>(null);

  const [busqueda, setBusqueda] = React.useState("");
  const [aviso, setAviso] = React.useState("");
  const [confirmarReinicio, setConfirmarReinicio] = React.useState(false);
  const [arrastrando, setArrastrando] = React.useState<string | null>(null);
  const [sobre, setSobre] = React.useState<string | null>(null); // id de mesa o "libres"
  const [compartir, setCompartir] = React.useState(false);
  const [urlCompartir, setUrlCompartir] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);

  const importRef = React.useRef<HTMLInputElement>(null);
  const invFormRef = React.useRef<HTMLDivElement>(null);
  const avisoTimer = React.useRef<number | null>(null);

  /* ---- VENTANA DE GRACIA (lo más delicado de este cambio) -----------------
   * El sondeo trae la lista entera cada 3 segundos y la reemplaza. Sin esto,
   * arrastrar un invitado a una mesa lo devolvería a su sitio anterior antes de
   * que el guardado llegue al servidor: la ficha "saltaría" sola delante de
   * quien está acomodando.
   *
   * Durante ~2,5 s después de tocar algo aquí manda lo que se ve en pantalla;
   * pasado ese rato, manda el servidor. Para un acomodo —que normalmente hace
   * UNA persona— es de sobra, y es fácil de razonar. */
  const mandaLoLocal = React.useRef(0);
  const tocado = React.useCallback(() => {
    mandaLoLocal.current = Date.now() + 2500;
  }, []);
  const deFuera = React.useCallback(<T,>(aplicar: (filas: T[]) => void) => {
    return (filas: T[]) => {
      if (Date.now() < mandaLoLocal.current) return;
      aplicar(filas);
    };
  }, []);

  React.useEffect(() => {
    const eventoId = eventoActual();
    const sync = obtenerSync();

    const cancelarMesas = sync.suscribir<Mesa>(
      eventoId,
      COLECCION_MESAS,
      deFuera<Mesa>((filas) => setMesas([...filas].sort(porOrden))),
    );
    const cancelarAcomodo = sync.suscribir<Invitado>(
      eventoId,
      COLECCION_ACOMODO,
      deFuera<Invitado>((filas) => setInvitados([...filas].sort(porOrden))),
    );
    // Solo en la demo local: los ejemplos NUNCA viajan al servidor. Sus ids son
    // fijos y la llave primaria de `items` es global, así que dos eventos
    // sembrados chocarían, y cada boda real nacería con la de Ana & Rodrigo.
    if (sync.nombre === "local") {
      void sync.listar<Mesa>(eventoId, COLECCION_MESAS).then((filas) => {
        if (filas.length > 0) return;
        mesasIniciales.forEach((m, i) => {
          void sync.guardar(eventoId, COLECCION_MESAS, { ...m, orden: i });
        });
        invitadosIniciales.forEach((g, i) => {
          void sync.guardar(eventoId, COLECCION_ACOMODO, { ...g, orden: i });
        });
      });
    }

    return () => {
      cancelarMesas();
      cancelarAcomodo();
    };
  }, [deFuera]);

  /**
   * Guarda en el evento. Todo lo que cambia el acomodo pasa por aquí: primero se
   * pinta (ya está hecho por quien llama) y después se guarda, porque acomodar
   * con la ficha esperando a la red sería insufrible.
   */
  const guardarEnEvento = React.useCallback(
    async (coleccion: string, fila: Mesa | Invitado): Promise<boolean> => {
      try {
        await obtenerSync().guardar(eventoActual(), coleccion, fila);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  /**
   * Quita del evento. ⚠️ Desde el corte de la 0009, BORRAR exige el pase de
   * ANFITRIÓN: si la app se abrió sin el enlace que lo lleva (`&a=`), esto falla
   * — y falla avisando, no en silencio.
   */
  const quitarDelEvento = React.useCallback(
    async (coleccion: string, id: string): Promise<boolean> => {
      try {
        await obtenerSync().eliminar(eventoActual(), coleccion, id);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const avisoSinLlave =
    "No pudimos quitarlo del evento. Para borrar hace falta abrir el acomodo con el enlace de anfitrión (el que lleva &a=), que sale del panel del salón.";

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    if (avisoTimer.current) window.clearTimeout(avisoTimer.current);
    avisoTimer.current = window.setTimeout(() => setAviso(""), 3500);
  };

  /* --------------------------- Cálculos ---------------------------- */
  const capacidadTotal = mesas.reduce((s, m) => s + m.capacidad, 0);
  const lugaresOcupados = invitados
    .filter((i) => i.mesaId !== null)
    .reduce((s, i) => s + Math.max(1, i.asientos), 0);
  const libres = sinAsignar(invitados);
  const libresFiltrados = busqueda
    ? libres.filter((i) => normaliza(i.nombre).includes(normaliza(busqueda)))
    : libres;

  const tiles = [
    { n: mesas.length, l: "Mesas", c: "text-primary" },
    { n: invitados.length, l: "Invitados", c: "text-foreground" },
    { n: lugaresOcupados, l: `de ${capacidadTotal} lugares acomodados`, c: "text-green-600" },
    { n: libres.length, l: "Invitados sin mesa", c: "text-amber-600" },
  ];

  /* ------------------------- Mover invitado ------------------------ */
  const moverInvitado = (invId: string, destino: string | null): boolean => {
    const inv = invitados.find((i) => i.id === invId);
    if (!inv || inv.mesaId === destino) return false;
    if (destino !== null) {
      const mesa = mesas.find((m) => m.id === destino);
      if (!mesa) return false;
      const usados = asientosUsados(destino, invitados); // no incluye a inv (está en otra mesa o libre)
      const restan = mesa.capacidad - usados;
      if (inv.asientos > restan) {
        mostrarAviso(
          `No caben ${inv.asientos} lugar${inv.asientos === 1 ? "" : "es"} en “${mesa.nombre}”. ` +
            `${restan <= 0 ? "Está llena." : `Solo quedan ${restan} libre${restan === 1 ? "" : "s"}.`}`,
        );
        return false;
      }
    }
    // Se pinta ya (con su ventana de gracia) y se guarda después.
    tocado();
    setInvitados((l) => l.map((i) => (i.id === invId ? { ...i, mesaId: destino } : i)));
    void guardarEnEvento(COLECCION_ACOMODO, { ...inv, mesaId: destino }).then((ok) => {
      if (!ok) mostrarAviso("No pudimos guardar el cambio. Revisa tu conexión.");
    });
    return true;
  };

  /* --------------------- Alta / edición mesas ---------------------- */
  const guardarMesa = (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = mesaForm.nombre.trim();
    if (!nombre) return;
    const capacidad = Math.max(1, parseInt(mesaForm.capacidad, 10) || 1);
    tocado();
    const anterior = editMesaId ? mesas.find((m) => m.id === editMesaId) : null;
    const mesa: Mesa = anterior
      ? { ...anterior, nombre, capacidad }
      : { id: nuevoIdMesa(mesas), nombre, capacidad, orden: Date.now() };
    setMesas((l) => (anterior ? l.map((m) => (m.id === mesa.id ? mesa : m)) : [...l, mesa]));
    void guardarEnEvento(COLECCION_MESAS, mesa).then((ok) => {
      if (!ok) mostrarAviso("No pudimos guardar la mesa. Revisa tu conexión.");
    });
    setMesaForm({ nombre: "", capacidad: "10" });
    setEditMesaId(null);
  };
  const editarMesa = (m: Mesa) => {
    setEditMesaId(m.id);
    setMesaForm({ nombre: m.nombre, capacidad: String(m.capacidad) });
  };
  /** Lo que espera confirmación: una mesa entera, o un invitado sin sentar. */
  const [porQuitar, setPorQuitar] = React.useState<
    { tipo: "mesa"; mesa: Mesa } | { tipo: "invitado"; inv: Invitado } | null
  >(null);

  const eliminarMesa = (id: string) => {
    tocado();
    // Sus invitados vuelven a "sin asignar". Se hace ANTES de quitar la mesa:
    // si el borrado fallara, quedan sin sentar (visible y arreglable) en vez de
    // apuntando a una mesa que ya no existe, que no se ve en ninguna parte.
    const desalojados = invitados.filter((i) => i.mesaId === id);
    setInvitados((l) => l.map((i) => (i.mesaId === id ? { ...i, mesaId: null } : i)));
    setMesas((l) => l.filter((m) => m.id !== id));
    if (editMesaId === id) {
      setEditMesaId(null);
      setMesaForm({ nombre: "", capacidad: "10" });
    }
    void (async () => {
      for (const inv of desalojados) {
        await guardarEnEvento(COLECCION_ACOMODO, { ...inv, mesaId: null });
      }
      if (!(await quitarDelEvento(COLECCION_MESAS, id))) mostrarAviso(avisoSinLlave);
    })();
  };

  /* -------------------- Alta / edición invitados ------------------- */
  const guardarInvitado = (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = invForm.nombre.trim();
    if (!nombre) return;
    const asientos = Math.max(1, parseInt(invForm.asientos, 10) || 1);
    tocado();
    const anterior = editInvId ? invitados.find((i) => i.id === editInvId) : null;
    const inv: Invitado = anterior
      ? { ...anterior, nombre, asientos }
      : { id: nuevoIdInvitado(invitados), nombre, asientos, mesaId: null, orden: Date.now() };
    setInvitados((l) => (anterior ? l.map((i) => (i.id === inv.id ? inv : i)) : [...l, inv]));
    void guardarEnEvento(COLECCION_ACOMODO, inv).then((ok) => {
      if (!ok) mostrarAviso("No pudimos guardar al invitado. Revisa tu conexión.");
    });
    setInvForm({ nombre: "", asientos: "1" });
    setEditInvId(null);
  };
  const editarInvitado = (inv: Invitado) => {
    setEditInvId(inv.id);
    setInvForm({ nombre: inv.nombre, asientos: String(inv.asientos) });
    invFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const eliminarInvitado = (id: string) => {
    tocado();
    setInvitados((l) => l.filter((i) => i.id !== id));
    if (editInvId === id) {
      setEditInvId(null);
      setInvForm({ nombre: "", asientos: "1" });
    }
    void quitarDelEvento(COLECCION_ACOMODO, id).then((ok) => {
      if (!ok) mostrarAviso(avisoSinLlave);
    });
  };

  /* --------------------- Arrastrar y soltar ------------------------ */
  const onDragStart = (e: React.DragEvent, invId: string) => {
    e.dataTransfer.setData("text/plain", invId);
    e.dataTransfer.effectAllowed = "move";
    setArrastrando(invId);
  };
  const onDrop = (e: React.DragEvent, destino: string | null) => {
    e.preventDefault();
    const invId = e.dataTransfer.getData("text/plain");
    if (invId) moverInvitado(invId, destino);
    setArrastrando(null);
    setSobre(null);
  };
  const permitirSoltar = (e: React.DragEvent) => e.preventDefault();

  /* ------------------- Exportar / importar / reiniciar ------------- */
  const acomodoActual = () => ({
    v: 1 as const,
    evento: { nombre: evento.nombre, fecha: evento.fecha, lugar: evento.lugar },
    mesas,
    invitados,
  });

  const exportar = () => {
    const blob = new Blob([JSON.stringify(acomodoActual(), null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "acomodo-de-mesas.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = validarAcomodo(JSON.parse(String(reader.result)));
        if (!data) {
          mostrarAviso("El archivo no tiene el formato de un acomodo de mesas.");
          return;
        }
        tocado();
        // El orden se pone ANTES de ordenar. Un archivo de los de antes de este
        // cambio no trae `orden`: sin esto se pintaría alfabético en pantalla y
        // se guardaría posicional en el evento — dos acomodos a la vez.
        const mesasN = data.mesas.map((m, i) => ({ ...m, orden: m.orden ?? i }));
        const invN = data.invitados.map((g, i) => ({ ...g, orden: g.orden ?? i }));
        setMesas([...mesasN].sort(porOrden));
        setInvitados([...invN].sort(porOrden));
        mostrarAviso("Acomodo importado. Guardándolo en el evento…");
        // Se escriben una a una. NO borra lo que ya había: con un almacén
        // central eso serían N borrados sin transacción y con la llave de
        // anfitrión de por medio; cortarse a la mitad dejaría media boda vieja
        // y media nueva. Para quitar algo está su botón de borrar.
        void (async () => {
          let fallidas = 0;
          for (const m of mesasN) {
            if (!(await guardarEnEvento(COLECCION_MESAS, m))) fallidas++;
          }
          for (const g of invN) {
            if (!(await guardarEnEvento(COLECCION_ACOMODO, g))) fallidas++;
          }
          mostrarAviso(
            fallidas === 0
              ? "Acomodo importado y guardado en el evento."
              : `Se importó, pero ${fallidas} no se pudieron guardar. Revisa tu conexión.`,
          );
        })();
      } catch {
        mostrarAviso("No se pudo leer el archivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /**
   * ⚠️ ESTO BORRA EL TRABAJO DE TODA UNA TARDE y no hay deshacer: el acomodo
   * solo vive en este navegador. Hasta el 6 ago 2026 lo hacía de un solo clic,
   * sin preguntar nada — el día del evento y con prisa, eso pasa. Ahora hay que
   * confirmar escribiendo, que obliga a leer lo que va a ocurrir.
   */
  /**
   * Empezar de cero.
   *
   * En la demo local vuelve al acomodo de ejemplo, como siempre. Con el evento
   * conectado NO siembra nada: los ejemplos nunca van al servidor, así que lo
   * deja VACÍO. Y borrar exige la llave de anfitrión: si no está, se avisa.
   */
  const reiniciar = () => {
    const sync = obtenerSync();
    const local = sync.nombre === "local";
    const mesasPrevias = mesas;
    const invPrevios = invitados;

    tocado();
    setMesas(local ? mesasIniciales : []);
    setInvitados(local ? invitadosIniciales : []);
    setEditMesaId(null);
    setEditInvId(null);
    setMesaForm({ nombre: "", capacidad: "10" });
    setInvForm({ nombre: "", asientos: "1" });
    setConfirmarReinicio(false);

    void (async () => {
      let sinPermiso = false;
      for (const m of mesasPrevias) {
        if (!(await quitarDelEvento(COLECCION_MESAS, m.id))) sinPermiso = true;
      }
      for (const g of invPrevios) {
        if (!(await quitarDelEvento(COLECCION_ACOMODO, g.id))) sinPermiso = true;
      }
      if (sinPermiso) {
        mostrarAviso(avisoSinLlave);
        return;
      }
      if (local) {
        mesasIniciales.forEach((m, i) => void guardarEnEvento(COLECCION_MESAS, { ...m, orden: i }));
        invitadosIniciales.forEach((g, i) => void guardarEnEvento(COLECCION_ACOMODO, { ...g, orden: i }));
        mostrarAviso("Volvimos al acomodo de ejemplo.");
      } else {
        mostrarAviso("El acomodo quedó vacío.");
      }
    })();
  };

  /* ---------------------------- Compartir -------------------------- */
  const abrirCompartir = () => {
    const url = `${window.location.origin}/acomodo#${codificarAcomodo(acomodoActual())}`;
    setUrlCompartir(url);
    setCompartir(true);
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlCompartir);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  };
  const compartirWhatsApp = () => {
    const msg = `Este es el acomodo de mesas de ${evento.nombre}. Ábrelo aquí (solo lectura):\n${urlCompartir}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  /* --------------- Chip reutilizable de un invitado ----------------
   * Es una FUNCIÓN que devuelve JSX (no un componente definido dentro del
   * render): así React reutiliza el mismo nodo por su `key` en cada render y
   * el arrastre no se rompe a la mitad. */
  const chipInvitado = (inv: Invitado, enMesa: boolean) => (
    <div
      key={inv.id}
      draggable
      onDragStart={(e) => onDragStart(e, inv.id)}
      onDragEnd={() => {
        setArrastrando(null);
        setSobre(null);
      }}
      className={cn(
        "group flex items-center gap-2 rounded-[var(--radius)] border border-border bg-background px-2.5 py-2 text-sm transition-shadow",
        "cursor-grab active:cursor-grabbing hover:shadow-sm",
        arrastrando === inv.id && "opacity-40",
      )}
    >
      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{inv.nombre}</span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
        <Users className="size-3" />
        {inv.asientos}
      </span>
      {/*
       * Alternativa al arrastre (móvil/táctil): mover con un menú.
       *
       * SUELO DE 36 px en esta fila. El menú medía 28 y los dos botones de al
       * lado 28×28, uno pegado al otro: en un celular el dedo tapa los tres a
       * la vez y se borra un invitado queriendo editarlo. Si añades otro
       * control aquí, dale también 36.
       */}
      <select
        aria-label={`Mover a ${inv.nombre}`}
        className="min-h-9 max-w-[7.5rem] shrink-0 rounded-[var(--radius)] border border-border bg-background py-1 pl-1.5 pr-0.5 text-xs text-muted-foreground"
        value={inv.mesaId ?? ""}
        onChange={(e) => moverInvitado(inv.id, e.target.value || null)}
      >
        <option value="">Sin mesa</option>
        {mesas.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </select>
      <button
        onClick={() => editarInvitado(inv)}
        aria-label={`Editar ${inv.nombre}`}
        className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-3.5" />
      </button>
      {enMesa ? null : (
        <button
          onClick={() => setPorQuitar({ tipo: "invitado", inv })}
          aria-label={`Eliminar ${inv.nombre}`}
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.l} className="p-5">
            <div className={cn("text-3xl font-semibold", t.c)}>{t.n}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.l}</div>
          </Card>
        ))}
      </div>

      {/* Barra de acciones */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={abrirCompartir}>
          <Share2 className="size-4" /> Compartir acomodo
        </Button>
        <Button variant="outline" onClick={exportar}>
          <Download className="size-4" /> Exportar
        </Button>
        <Button variant="outline" onClick={() => importRef.current?.click()}>
          <Upload className="size-4" /> Importar
        </Button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={importar}
        />
        <Button variant="ghost" onClick={() => setConfirmarReinicio(true)}>
          <RotateCcw className="size-4" /> Reiniciar
        </Button>
      </div>

      <Confirmar
        abierto={confirmarReinicio}
        titulo="¿Borrar todo el acomodo?"
        descripcion={
          <>
            Se pierden las <strong>{mesas.length}</strong> mesas y los{" "}
            <strong>{invitados.length}</strong> invitados que llevas puestos, y se vuelve al
            ejemplo. <strong>No hay forma de recuperarlo.</strong> Si quieres guardarlo antes,
            cancela y usa <em>Exportar</em>.
          </>
        }
        escribirParaConfirmar="BORRAR"
        textoConfirmar="Sí, borrar el acomodo"
        onConfirmar={reiniciar}
        onCancelar={() => setConfirmarReinicio(false)}
      />

      {aviso ? (
        <div className="mt-4 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          {aviso}
        </div>
      ) : null}

      {/*
       * `grid-cols-[minmax(0,1fr)]` también en la base, no solo en `lg:`. Una
       * columna de rejilla no se encoge por debajo de su contenido a menos que
       * se lo pidas con `minmax(0,...)`. En `lg:` ya estaba puesto, pero en un
       * celular de 375 px mandaba la base: la caja medía 327 px y su columna
       * 477, así que la página entera se arrastraba de lado (502 px de ancho).
       */}
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        {/* Columna izquierda: formularios + sin asignar */}
        <div className="space-y-6">
          {/* Alta / edición de mesa */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold">{editMesaId ? "Editar mesa" : "Agregar mesa"}</h2>
            <form onSubmit={guardarMesa} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nombre de la mesa</label>
                <input
                  className={campo}
                  value={mesaForm.nombre}
                  onChange={(e) => setMesaForm({ ...mesaForm, nombre: e.target.value })}
                  placeholder="Ej. Familia de la novia"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Capacidad (personas)</label>
                <select
                  className={campo}
                  value={mesaForm.capacidad}
                  onChange={(e) => setMesaForm({ ...mesaForm, capacidad: e.target.value })}
                >
                  {Array.from({ length: 20 }, (_, i) => String(i + 1)).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editMesaId ? (
                    <>
                      <Check className="size-4" /> Guardar
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Agregar mesa
                    </>
                  )}
                </Button>
                {editMesaId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditMesaId(null);
                      setMesaForm({ nombre: "", capacidad: "10" });
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>

          {/* Alta / edición de invitado */}
          <div ref={invFormRef}>
          <Card className="p-6">
            <h2 className="text-lg font-semibold">
              {editInvId ? "Editar invitado" : "Agregar invitado"}
            </h2>
            <form onSubmit={guardarInvitado} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nombre o familia</label>
                <input
                  className={campo}
                  value={invForm.nombre}
                  onChange={(e) => setInvForm({ ...invForm, nombre: e.target.value })}
                  placeholder="Ej. Familia Loaiza"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Lugares que ocupa</label>
                <select
                  className={campo}
                  value={invForm.asientos}
                  onChange={(e) => setInvForm({ ...invForm, asientos: e.target.value })}
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === "1" ? "persona" : "personas"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editInvId ? (
                    <>
                      <Check className="size-4" /> Guardar
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Agregar invitado
                    </>
                  )}
                </Button>
                {editInvId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditInvId(null);
                      setInvForm({ nombre: "", asientos: "1" });
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
          </div>

          {/* Sin asignar (zona para soltar de vuelta) */}
          <Card
            onDragOver={permitirSoltar}
            onDragEnter={() => setSobre("libres")}
            onDragLeave={() => setSobre((s) => (s === "libres" ? null : s))}
            onDrop={(e) => onDrop(e, null)}
            className={cn(
              "p-5 transition-colors",
              sobre === "libres" && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Sin asignar</h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {libres.length}
              </span>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={cn(campo, "pl-9")}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar invitado…"
              />
            </div>
            <div className="mt-3 space-y-2">
              {libresFiltrados.length === 0 ? (
                <p className="rounded-[var(--radius)] border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  {libres.length === 0
                    ? "¡Todos tienen mesa! 🎉"
                    : "Nadie coincide con la búsqueda."}
                </p>
              ) : (
                libresFiltrados.map((inv) => chipInvitado(inv, false))
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Arrastra un invitado a una mesa, o usa el menú “Sin mesa / mesa” de cada uno.
            </p>
          </Card>
        </div>

        {/* Columna derecha: las mesas */}
        <div>
          {mesas.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-dashed border-border p-12 text-center text-muted-foreground">
              Aún no hay mesas. Crea la primera con el formulario de la izquierda.
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {/* Misma razón que la rejilla de arriba: en celular manda la base. */}
              {mesas.map((mesa) => {
                const usados = asientosUsados(mesa.id, invitados);
                const gente = invitadosDeMesa(mesa.id, invitados);
                const activa = sobre === mesa.id;
                return (
                  <Card
                    key={mesa.id}
                    onDragOver={permitirSoltar}
                    onDragEnter={() => setSobre(mesa.id)}
                    onDragLeave={() => setSobre((s) => (s === mesa.id ? null : s))}
                    onDrop={(e) => onDrop(e, mesa.id)}
                    className={cn(
                      "flex flex-col p-4 transition-colors",
                      activa && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{mesa.nombre}</h3>
                        <span
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                            tonoOcupacion(usados, mesa.capacidad),
                          )}
                        >
                          <Users className="size-3" /> {usados}/{mesa.capacidad} lugares
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          onClick={() => editarMesa(mesa)}
                          aria-label={`Editar ${mesa.nombre}`}
                          className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setPorQuitar({ tipo: "mesa", mesa })}
                          aria-label={`Eliminar ${mesa.nombre}`}
                          className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex-1 space-y-2">
                      {gente.length === 0 ? (
                        <p className="grid h-20 place-items-center rounded-[var(--radius)] border border-dashed border-border text-center text-xs text-muted-foreground">
                          Arrastra invitados aquí
                        </p>
                      ) : (
                        gente.map((inv) => chipInvitado(inv, true))
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de compartir */}
      {compartir ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setCompartir(false)}
        >
          <Card
            className="w-full max-w-md p-6"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Compartir el acomodo</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enlace de <span className="font-medium text-foreground">solo lectura</span>: quien
                  lo abra ve el acomodo, pero no puede moverlo.
                </p>
              </div>
              <button
                onClick={() => setCompartir(false)}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              {urlCompartir.length <= UMBRAL_QR ? (
                <QR value={urlCompartir} size={132} />
              ) : (
                <div className="grid size-[132px] shrink-0 place-items-center rounded-[var(--radius)] border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                  El acomodo es grande: compártelo por el enlace o WhatsApp (un QR quedaría difícil de
                  escanear).
                </div>
              )}
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {urlCompartir}
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={copiar} variant="outline" className="w-full">
                    {copiado ? (
                      <>
                        <Check className="size-4" /> ¡Enlace copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" /> Copiar enlace
                      </>
                    )}
                  </Button>
                  <Button onClick={compartirWhatsApp} className="w-full">
                    <MessageCircle className="size-4" /> Enviar por WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo={porQuitar?.tipo === "mesa" ? "¿Borrar esta mesa?" : "¿Borrar a este invitado?"}
        descripcion={
          porQuitar?.tipo === "mesa" ? (
            <>
              Se borra <strong>{porQuitar.mesa.nombre}</strong>. Quien estuviera sentado ahí vuelve a
              la lista de sin acomodar, no se pierde.
            </>
          ) : (
            <>
              Se borra a <strong>{porQuitar?.inv.nombre}</strong> del acomodo. No se puede deshacer:
              habría que volver a capturarlo.
            </>
          )
        }
        textoConfirmar={porQuitar?.tipo === "mesa" ? "Sí, borrar la mesa" : "Sí, borrarlo"}
        onConfirmar={() => {
          const p = porQuitar;
          setPorQuitar(null);
          if (!p) return;
          if (p.tipo === "mesa") eliminarMesa(p.mesa.id);
          else eliminarInvitado(p.inv.id);
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}
