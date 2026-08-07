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
import { Button, Card, cn, Confirmar, guardarLocal } from "@salones/ui";
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
  type Mesa,
  type Invitado,
} from "@/lib/mesas";

const K_MESAS = "mesas-mesas";
const K_INVITADOS = "mesas-invitados";

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
  const [cargado, setCargado] = React.useState(false);

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

  // Carga inicial + sincronización en vivo entre pestañas.
  React.useEffect(() => {
    try {
      const m = localStorage.getItem(K_MESAS);
      setMesas(m ? JSON.parse(m) : mesasIniciales);
      const g = localStorage.getItem(K_INVITADOS);
      setInvitados(g ? JSON.parse(g) : invitadosIniciales);
    } catch {
      setMesas(mesasIniciales);
      setInvitados(invitadosIniciales);
    }
    setCargado(true);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === K_MESAS && ev.newValue) {
        try {
          setMesas(JSON.parse(ev.newValue));
        } catch {
          /* noop */
        }
      }
      if (ev.key === K_INVITADOS && ev.newValue) {
        try {
          setInvitados(JSON.parse(ev.newValue));
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (cargado) guardarLocal(K_MESAS, JSON.stringify(mesas));
  }, [mesas, cargado]);
  React.useEffect(() => {
    if (cargado) guardarLocal(K_INVITADOS, JSON.stringify(invitados));
  }, [invitados, cargado]);

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
    setInvitados((l) => l.map((i) => (i.id === invId ? { ...i, mesaId: destino } : i)));
    return true;
  };

  /* --------------------- Alta / edición mesas ---------------------- */
  const guardarMesa = (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = mesaForm.nombre.trim();
    if (!nombre) return;
    const capacidad = Math.max(1, parseInt(mesaForm.capacidad, 10) || 1);
    if (editMesaId) {
      setMesas((l) => l.map((m) => (m.id === editMesaId ? { ...m, nombre, capacidad } : m)));
    } else {
      setMesas((l) => [...l, { id: nuevoIdMesa(l), nombre, capacidad }]);
    }
    setMesaForm({ nombre: "", capacidad: "10" });
    setEditMesaId(null);
  };
  const editarMesa = (m: Mesa) => {
    setEditMesaId(m.id);
    setMesaForm({ nombre: m.nombre, capacidad: String(m.capacidad) });
  };
  const eliminarMesa = (id: string) => {
    // Sus invitados vuelven a "sin asignar".
    setInvitados((l) => l.map((i) => (i.mesaId === id ? { ...i, mesaId: null } : i)));
    setMesas((l) => l.filter((m) => m.id !== id));
    if (editMesaId === id) {
      setEditMesaId(null);
      setMesaForm({ nombre: "", capacidad: "10" });
    }
  };

  /* -------------------- Alta / edición invitados ------------------- */
  const guardarInvitado = (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = invForm.nombre.trim();
    if (!nombre) return;
    const asientos = Math.max(1, parseInt(invForm.asientos, 10) || 1);
    if (editInvId) {
      setInvitados((l) => l.map((i) => (i.id === editInvId ? { ...i, nombre, asientos } : i)));
    } else {
      setInvitados((l) => [...l, { id: nuevoIdInvitado(l), nombre, asientos, mesaId: null }]);
    }
    setInvForm({ nombre: "", asientos: "1" });
    setEditInvId(null);
  };
  const editarInvitado = (inv: Invitado) => {
    setEditInvId(inv.id);
    setInvForm({ nombre: inv.nombre, asientos: String(inv.asientos) });
    invFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const eliminarInvitado = (id: string) => {
    setInvitados((l) => l.filter((i) => i.id !== id));
    if (editInvId === id) {
      setEditInvId(null);
      setInvForm({ nombre: "", asientos: "1" });
    }
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
        setMesas(data.mesas);
        setInvitados(data.invitados);
        mostrarAviso("Acomodo importado correctamente.");
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
  const reiniciar = () => {
    setMesas(mesasIniciales);
    setInvitados(invitadosIniciales);
    setEditMesaId(null);
    setEditInvId(null);
    setMesaForm({ nombre: "", capacidad: "10" });
    setInvForm({ nombre: "", asientos: "1" });
    setConfirmarReinicio(false);
    mostrarAviso("Volvimos al acomodo de ejemplo.");
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
      {/* Alternativa al arrastre (móvil/táctil): mover con un menú. */}
      <select
        aria-label={`Mover a ${inv.nombre}`}
        className="max-w-[7.5rem] shrink-0 rounded-[var(--radius)] border border-border bg-background py-1 pl-1.5 pr-0.5 text-xs text-muted-foreground"
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
        className="grid size-7 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-3.5" />
      </button>
      {enMesa ? null : (
        <button
          onClick={() => eliminarInvitado(inv.id)}
          aria-label={`Eliminar ${inv.nombre}`}
          className="grid size-7 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                          className="grid size-8 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => eliminarMesa(mesa.id)}
                          aria-label={`Eliminar ${mesa.nombre}`}
                          className="grid size-8 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
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
    </div>
  );
}
