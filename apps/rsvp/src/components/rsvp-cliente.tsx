"use client";

import * as React from "react";
import { Plus, Check, Trash2, MessageCircle, Clock } from "lucide-react";
import { Button, Card, cn, Confirmar, guardarLocal } from "@salones/ui";
import { obtenerSync, eventoActual, sufijoEvento, esAnfitrion } from "@salones/sync";
import {
  invitadosIniciales,
  respuestasIniciales,
  evento,
  EstadoRSVP,
  nuevoId,
  codificar,
  etiquetaEstado,
  COLECCION_RESPUESTAS,
  type Invitado,
  type Estado,
  type Respuesta,
  type RespuestaItem,
} from "@/lib/rsvp";

const K_LISTA = "rsvp-invitados";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

const estiloEstado: Record<Estado, string> = {
  [EstadoRSVP.Confirmado]: "bg-green-500/10 text-green-600 ring-green-500/30",
  [EstadoRSVP.Rechazado]: "bg-red-500/10 text-red-600 ring-red-500/30",
  [EstadoRSVP.Pendiente]: "bg-amber-500/10 text-amber-600 ring-amber-500/30",
};

export function RsvpCliente() {
  const [invitados, setInvitados] = React.useState<Invitado[]>([]);
  const [respuestas, setRespuestas] = React.useState<RespuestaItem[]>([]);
  const [cargado, setCargado] = React.useState(false);
  // Arranca en false a propósito: ante la duda se esconde el botón de borrar.
  const [anfitrion, setAnfitrion] = React.useState(false);

  // El mapa de siempre (id → respuesta), derivado de lo que llega del sync.
  const estados = React.useMemo<Record<string, Respuesta>>(
    () =>
      Object.fromEntries(
        respuestas.map((r) => [r.id, { estado: r.estado, personas: r.personas }]),
      ),
    [respuestas],
  );
  const estadosRef = React.useRef<Record<string, Respuesta>>({});
  estadosRef.current = estados;

  const [form, setForm] = React.useState({ nombre: "", cupos: "2" });
  const [editId, setEditId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState("");
  const formRef = React.useRef<HTMLDivElement>(null);

  // La LISTA de invitados la administra el anfitrión en su dispositivo.
  React.useEffect(() => {
    try {
      const l = localStorage.getItem(K_LISTA);
      setInvitados(l ? JSON.parse(l) : invitadosIniciales);
    } catch {
      setInvitados(invitadosIniciales);
    }
    setCargado(true);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === K_LISTA && ev.newValue) {
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
    if (cargado) guardarLocal(K_LISTA, JSON.stringify(invitados));
  }, [invitados, cargado]);

  // Las RESPUESTAS llegan por el "lugar central" (@salones/sync): el tablero se
  // actualiza solo con lo que confirma cada invitado. En local, entre pestañas;
  // con el servicio gestionado, desde el teléfono de cada invitado.
  React.useEffect(() => {
    // Solo el anfitrión borra invitados de la lista. Depende del enlace y del
    // navegador, que en el servidor todavía no existen.
    setAnfitrion(esAnfitrion());
    const eventoId = eventoActual();
    const sync = obtenerSync();
    const cancelar = sync.suscribir<RespuestaItem>(eventoId, COLECCION_RESPUESTAS, setRespuestas);
    // Solo en la demo local: sembramos respuestas de ejemplo si no hay ninguna.
    if (sync.nombre === "local") {
      sync.listar<RespuestaItem>(eventoId, COLECCION_RESPUESTAS).then((items) => {
        if (items.length === 0) {
          for (const [id, r] of Object.entries(respuestasIniciales)) {
            void sync.guardar(eventoId, COLECCION_RESPUESTAS, { id, ...r });
          }
        }
      });
    }
    return cancelar;
  }, []);

  const estadoDe = (id: string): Estado => estados[id]?.estado ?? EstadoRSVP.Pendiente;

  // Confirmaciones que llegaron por el enlace GENERAL del evento (el portal del
  // invitado), de gente que no estaba en esta lista: no tienen renglón propio,
  // así que se muestran aparte para que no se pierdan.
  const idsEnLista = new Set(invitados.map((i) => i.id));
  const sueltas = respuestas.filter((r) => !idsEnLista.has(r.id));
  const personasSueltas = sueltas
    .filter((r) => r.estado === EstadoRSVP.Confirmado)
    .reduce((s, r) => s + (r.personas ?? 0), 0);
  /** Lo que espera confirmación: un invitado de la lista, o una respuesta suelta. */
  const [porQuitar, setPorQuitar] = React.useState<
    { tipo: "invitado"; inv: Invitado } | { tipo: "suelta"; id: string; nombre: string } | null
  >(null);
  const [errorQuitar, setErrorQuitar] = React.useState("");

  const olvidarSuelta = async (id: string) => {
    try {
      await obtenerSync().eliminar(eventoActual(), COLECCION_RESPUESTAS, id);
      setErrorQuitar("");
    } catch {
      setErrorQuitar("No pudimos descartar esa confirmación. Inténtalo de nuevo.");
    }
  };

  const confirmados = invitados.filter((i) => estadoDe(i.id) === EstadoRSVP.Confirmado);
  const rechazados = invitados.filter((i) => estadoDe(i.id) === EstadoRSVP.Rechazado);
  const pendientes = invitados.length - confirmados.length - rechazados.length;
  const personasConfirmadas = confirmados.reduce((s, i) => s + (estados[i.id]?.personas ?? 0), 0);
  const progreso = invitados.length ? Math.round((confirmados.length / invitados.length) * 100) : 0;

  // --- Organizador: alta / edición / borrado ---
  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setFormError("Escribe el nombre del invitado.");
      return;
    }
    setFormError("");
    const cupos = Math.max(1, parseInt(form.cupos, 10) || 1);
    if (editId) {
      setInvitados((l) =>
        l.map((i) => (i.id === editId ? { ...i, nombre: form.nombre.trim(), cupos } : i)),
      );
    } else {
      setInvitados((l) => [{ id: nuevoId(l), nombre: form.nombre.trim(), cupos }, ...l]);
    }
    setForm({ nombre: "", cupos: "2" });
    setEditId(null);
  };
  const editar = (inv: Invitado) => {
    setEditId(inv.id);
    setForm({ nombre: inv.nombre, cupos: String(inv.cupos) });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const eliminar = async (inv: Invitado) => {
    setInvitados((l) => l.filter((i) => i.id !== inv.id));
    try {
      await obtenerSync().eliminar(eventoActual(), COLECCION_RESPUESTAS, inv.id);
      setErrorQuitar("");
    } catch {
      setErrorQuitar(
        `Borramos a ${inv.nombre} de esta lista, pero su confirmación sigue en el servidor.`,
      );
    }
  };

  const marcar = (inv: Invitado, estado: Estado) => {
    const personas =
      estado === EstadoRSVP.Confirmado ? estadosRef.current[inv.id]?.personas || inv.cupos : 0;
    void obtenerSync().guardar(eventoActual(), COLECCION_RESPUESTAS, {
      id: inv.id,
      estado,
      personas,
    });
  };
  const cambiarPersonas = (id: string, personas: number) => {
    void obtenerSync().guardar(eventoActual(), COLECCION_RESPUESTAS, {
      id,
      estado: EstadoRSVP.Confirmado,
      personas,
    });
  };

  const compartir = (inv: Invitado) => {
    // El enlace lleva el código del evento (?e=...) y los datos del invitado (#...).
    const url = `${window.location.origin}/confirmar${sufijoEvento()}#${codificar(inv)}`;
    const msg = `¡Hola! Nos encantaría contar contigo en ${evento.nombre} (${evento.fecha}). Por favor confirma tu asistencia aquí antes del ${evento.fechaLimite}:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const tiles = [
    { n: confirmados.length, l: "Confirmaron", c: "text-green-600" },
    { n: rechazados.length, l: "No asisten", c: "text-red-600" },
    { n: pendientes, l: "Pendientes", c: "text-amber-600" },
    { n: personasConfirmadas, l: "Personas confirmadas", c: "text-primary" },
  ];

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
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Avance de confirmaciones</span>
          <span>
            {confirmados.length}/{invitados.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
        {/* Alta / edición */}
        <div ref={formRef}>
          <Card className="p-6">
            <h2 className="text-lg font-semibold">
              {editId ? "Editar invitado" : "Agregar invitado"}
            </h2>
            <form onSubmit={guardar} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nombre</label>
                <input
                  className={campo}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre del invitado o familia"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Cupos (personas máximo)</label>
                <select
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditId(null);
                      setForm({ nombre: "", cupos: "2" });
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> Fecha límite: {evento.fechaLimite}
            </p>
          </Card>
        </div>

        {/* Lista de invitados */}
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{invitados.length}</span> invitados en la
            lista. Envía a cada uno su enlace para confirmar, o marca tú la respuesta.
          </p>
          <div className="space-y-2">
            {invitados.map((inv) => {
              const estado = estadoDe(inv.id);
              const conf = estado === EstadoRSVP.Confirmado;
              return (
                <Card key={inv.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{inv.nombre}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                            estiloEstado[estado],
                          )}
                        >
                          {etiquetaEstado[estado]}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {conf
                          ? `${estados[inv.id]?.personas ?? 0} de ${inv.cupos} personas`
                          : `Hasta ${inv.cupos} personas`}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {conf ? (
                        <select
                          aria-label="Personas que asistirán"
                          className="min-h-10 rounded-[var(--radius)] border border-border bg-background px-2 py-1.5 text-sm"
                          value={String(estados[inv.id]?.personas ?? inv.cupos)}
                          onChange={(e) => cambiarPersonas(inv.id, parseInt(e.target.value, 10))}
                        >
                          {Array.from({ length: inv.cupos }, (_, i) => String(i + 1)).map((n) => (
                            <option key={n} value={n}>
                              {n} pers
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {/*
                       * `min-h-10 px-3` (40 px de alto) en los tres botones: con
                       * el `py-1.5` de antes medían 32 px, y son tres blancos
                       * pegados uno al lado del otro. Quien pasa lista lo hace
                       * de pie, en la entrada y con el teléfono en una mano; a
                       * ese tamaño se le va el dedo al de junto.
                       */}
                      <div className="inline-flex overflow-hidden rounded-[var(--radius)] border border-border">
                        <button
                          onClick={() => marcar(inv, EstadoRSVP.Confirmado)}
                          className={cn(
                            "min-h-10 px-3 py-1.5 text-sm transition-colors",
                            estado === EstadoRSVP.Confirmado
                              ? "bg-green-500/15 text-green-600"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => marcar(inv, EstadoRSVP.Rechazado)}
                          className={cn(
                            "min-h-10 border-l border-border px-3 py-1.5 text-sm transition-colors",
                            estado === EstadoRSVP.Rechazado
                              ? "bg-red-500/15 text-red-600"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          No
                        </button>
                        <button
                          onClick={() => marcar(inv, EstadoRSVP.Pendiente)}
                          aria-label="Marcar pendiente"
                          className={cn(
                            "min-h-10 border-l border-border px-3 py-1.5 text-sm transition-colors",
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
                      <Button variant="ghost" size="sm" onClick={() => editar(inv)}>
                        Editar
                      </Button>
                      {anfitrion ? (
                        <button
                          onClick={() => setPorQuitar({ tipo: "invitado", inv })}
                          aria-label={`Eliminar ${inv.nombre}`}
                          className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmaciones desde el portal del evento (sin invitación personal) */}
      {sueltas.length > 0 ? (
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold">Confirmaciones desde el portal</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estas personas contestaron con el enlace general del evento y no estaban en tu lista.
            {personasSueltas > 0
              ? ` Suman ${personasSueltas} persona${personasSueltas === 1 ? "" : "s"} además de las de arriba.`
              : ""}
          </p>
          <div className="mt-4 space-y-2">
            {sueltas.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.nombre?.trim() || "Sin nombre"}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                      estiloEstado[r.estado],
                    )}
                  >
                    {etiquetaEstado[r.estado]}
                  </span>
                  {r.estado === EstadoRSVP.Confirmado ? (
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
            ))}
          </div>
        </Card>
      ) : null}

      {errorQuitar ? (
        <p className="mt-4 rounded-[var(--radius)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorQuitar}
        </p>
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo={
          porQuitar?.tipo === "invitado" ? "¿Borrar a este invitado?" : "¿Descartar esta confirmación?"
        }
        descripcion={
          porQuitar?.tipo === "invitado" ? (
            <>
              Se borra a <strong>{porQuitar.inv.nombre}</strong> de la lista, junto con su
              confirmación. No se puede deshacer.
            </>
          ) : (
            <>
              Se descarta la confirmación de <strong>{porQuitar?.nombre}</strong>, que no está en la
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
          else void olvidarSuelta(p.id);
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}
