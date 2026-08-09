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
  Loader2,
  MessageCircle,
  Plus,
  SearchX,
  Share2,
  Trash2,
} from "lucide-react";
import { Button, Card, cn, Confirmar } from "@salones/ui";
import { EstadoRSVP } from "@salones/core";
import { obtenerSync } from "@salones/sync";
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
  cuposDisponibles,
  enlaceInvitado,
  listarInvitados,
  type Invitado,
} from "@/lib/invitados";
import { baseDeApp } from "@/lib/pantallas";

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
  const [form, setForm] = React.useState({ nombre: "", cupos: "2" });
  const [editId, setEditId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);

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
    const ok = editId
      ? await actualizarInvitado(supabase, editId, nombre, cupos)
      : Boolean(await crearInvitado(supabase, evento.id, nombre, cupos));
    setGuardando(false);
    if (!ok) {
      setError(
        "No se pudo guardar. Revisa que el permiso por salón (migración 0008) esté aplicado.",
      );
      return;
    }
    setForm({ nombre: "", cupos: "2" });
    setEditId(null);
    await recargarInvitados();
  };

  const editar = (inv: Invitado) => {
    setEditId(inv.id);
    setForm({ nombre: inv.nombre, cupos: String(inv.cupos) });
  };

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

  const compartir = (inv: Invitado) => {
    const url = enlaceInvitado(inv, codigo, baseDeApp("rsvp"));
    if (!url) return;
    const msg = `¡Hola! Nos encantaría contar contigo en ${evento?.nombre ?? "nuestro evento"}. Confirma tu asistencia aquí:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const descartarSuelta = (id: string) => {
    void obtenerSync().eliminar(codigo, COLECCION_RESPUESTAS, id);
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <Link
        href={`/eventos/${encodeURIComponent(codigo)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {evento.nombre}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Confirmaciones</h1>
      <p className="mt-2 text-muted-foreground">
        Quién viene, quién falta y cuántos son. Las respuestas llegan solas.
      </p>

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
                    setForm({ nombre: "", cupos: "2" });
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
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
                return (
                  <Card key={inv.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{inv.nombre}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
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
                        "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
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
