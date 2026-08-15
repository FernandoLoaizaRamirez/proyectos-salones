"use client";

/**
 * MÓDULO RSVP montado DENTRO del portal (quinto módulo migrado).
 *
 * El invitado dice si va y cuántos serán, sin salir del portal. La respuesta
 * viaja por `@salones/sync` al tablero del anfitrión con el código del evento
 * que trae el portal.
 *
 * Solo ESCRIBE: nunca se suscribe a la colección de respuestas, para que ningún
 * invitado pueda ver quién viene y quién no. Lo que contestó se recuerda en su
 * propio teléfono, así puede cambiar de opinión sin duplicar su renglón.
 */
import * as React from "react";
import { CalendarCheck, Check, Loader2, PartyPopper, Pencil, X } from "lucide-react";
import { Button, Card, cn, AvisoParticipacion } from "@salones/ui";
import { obtenerSync } from "@salones/sync";
import {
  COLECCION_RESPUESTAS,
  EstadoRSVP,
  MAX_PERSONAS_ABIERTO,
  claveMiRespuesta,
  decodificarInvitado,
  nuevoIdRespuesta,
  personasTexto,
  type Invitado,
  type RespuestaItem,
} from "./lib";
import { guardarPerfil, usePerfil } from "@/lib/perfil";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function RsvpModulo({ evento, nombreEvento }: { evento: string; nombreEvento: string }) {
  const perfil = usePerfil(evento);
  const [invitado, setInvitado] = React.useState<Invitado | null>(null);
  const [mia, setMia] = React.useState<RespuestaItem | null>(null);
  const [listo, setListo] = React.useState(false);
  const [editando, setEditando] = React.useState(false);

  const [nombre, setNombre] = React.useState("");
  const [asiste, setAsiste] = React.useState<"si" | "no" | "">("");
  const [personas, setPersonas] = React.useState(1);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState("");
  /**
   * Confirmación ABIERTA previa de este teléfono que quedó huérfana al abrir
   * después la invitación personal: al guardar en el renglón bueno, se borra
   * para que el anfitrión no vea a la misma persona dos veces.
   */
  const sobranteRef = React.useRef<string | null>(null);

  // Invitación personal (si el enlace la trae) + lo que ya contestó este teléfono.
  // Se vuelve a leer si cambia el fragmento, porque abrir la invitación personal
  // con el portal ya abierto solo cambia el `#` y no recarga la página.
  React.useEffect(() => {
    const leer = () => {
      const hash = window.location.hash.replace(/^#/, "");
      const inv = hash ? decodificarInvitado(hash) : null;
      setInvitado(inv);

      let guardada: RespuestaItem | null = null;
      try {
        const raw = localStorage.getItem(claveMiRespuesta(evento));
        guardada = raw ? (JSON.parse(raw) as RespuestaItem) : null;
      } catch {
        guardada = null;
      }
      // Con invitación personal manda la invitación: si lo guardado era de otro
      // renglón (una confirmación abierta anterior), se vuelve a preguntar.
      const desfasada = Boolean(guardada && inv && guardada.id !== inv.id);
      sobranteRef.current = desfasada ? (guardada?.id ?? null) : null;
      const vigente = desfasada ? null : guardada;
      setMia(vigente);

      // El formulario arranca con lo que ya se sabe.
      setNombre(vigente?.nombre ?? inv?.nombre ?? "");
      setPersonas(vigente?.personas || inv?.cupos || 1);
      setAsiste(vigente ? (vigente.estado === EstadoRSVP.Confirmado ? "si" : "no") : "");
      setEditando(!vigente);
      setListo(true);
    };

    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, [evento]);

  const tope = invitado ? invitado.cupos : MAX_PERSONAS_ABIERTO;

  /*
   * En modo ABIERTO, el perfil común del teléfono rellena el nombre si el campo
   * sigue vacío (se presentó en el muro o en la trivia y aquí ya lo conocemos).
   * El perfil llega después del primer pintado, por eso es un efecto y no el
   * estado inicial; con invitación personal no hace falta: el `#` manda.
   */
  React.useEffect(() => {
    if (!perfil || invitado) return;
    setNombre((previo) => (previo.trim() ? previo : perfil.nombre));
  }, [perfil, invitado]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asiste) {
      setError("Dinos si podrás acompañarnos.");
      return;
    }
    const suNombre = (invitado?.nombre ?? nombre).trim();
    if (!suNombre) {
      setError("Escribe tu nombre para que sepan quién eres.");
      return;
    }
    setError("");
    setGuardando(true);

    const respuesta: RespuestaItem = {
      // Con invitación personal se responde en SU renglón del tablero; si no, se
      // conserva el id de este teléfono para no duplicar la confirmación.
      id: invitado?.id ?? mia?.id ?? nuevoIdRespuesta(),
      estado: asiste === "si" ? EstadoRSVP.Confirmado : EstadoRSVP.Rechazado,
      personas: asiste === "si" ? Math.min(Math.max(1, personas), tope) : 0,
      nombre: suNombre,
      fecha: Date.now(),
    };

    try {
      await obtenerSync().guardar(evento, COLECCION_RESPUESTAS, respuesta);
      if (sobranteRef.current && sobranteRef.current !== respuesta.id) {
        void obtenerSync().eliminar(evento, COLECCION_RESPUESTAS, sobranteRef.current);
        sobranteRef.current = null;
      }
      try {
        localStorage.setItem(claveMiRespuesta(evento), JSON.stringify(respuesta));
      } catch {
        /* sin espacio: la respuesta ya viajó, solo se pierde el recordatorio */
      }
      // Confirmar también alimenta el perfil común: con invitación personal
      // viaja el id real de su renglón (la fusión de guardarPerfil lo cuida).
      guardarPerfil(
        evento,
        invitado
          ? { id: invitado.id, nombre: invitado.nombre, cupos: invitado.cupos }
          : { nombre: suNombre },
      );
      setMia(respuesta);
      setEditando(false);
    } catch {
      setError("No pudimos enviar tu respuesta. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  if (!listo) return null;

  // Ya contestó: resumen de lo que quedó registrado.
  if (mia && !editando) {
    const confirmo = mia.estado === EstadoRSVP.Confirmado;
    return (
      <Card className="p-6 text-center">
        <div
          className={cn(
            "mx-auto grid size-14 place-items-center rounded-full",
            confirmo ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground",
          )}
        >
          {confirmo ? <PartyPopper className="size-7" /> : <Check className="size-7" />}
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">
          {confirmo ? "¡Gracias por confirmar!" : "Gracias por avisarnos"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {confirmo
            ? `Te esperamos, ${mia.nombre}: quedaron registradas ${personasTexto(mia.personas)}.`
            : `Qué pena que no puedas acompañarnos, ${mia.nombre}. ¡Gracias de todos modos!`}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setEditando(true)}>
          <Pencil className="size-4" /> Cambiar mi respuesta
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-muted text-primary">
          <CalendarCheck className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {invitado ? `Hola, ${invitado.nombre}` : "¿Nos acompañas?"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {invitado
              ? `Confirma tu lugar en ${nombreEvento}.`
              : `Dinos si podrás venir a ${nombreEvento} y cuántos serán.`}
          </p>
        </div>
      </div>

      <form onSubmit={enviar} className="mt-5 space-y-4">
        {invitado ? null : (
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="rsvp-nombre">
              Tu nombre
            </label>
            <input
              id="rsvp-nombre"
              className={campo}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido (o el de tu familia)"
              maxLength={60}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAsiste("si")}
            aria-pressed={asiste === "si"}
            className={cn(
              "rounded-[var(--radius)] border px-4 py-3 text-sm font-medium transition-colors",
              asiste === "si"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            Sí, ahí estaré
          </button>
          <button
            type="button"
            onClick={() => setAsiste("no")}
            aria-pressed={asiste === "no"}
            className={cn(
              "rounded-[var(--radius)] border px-4 py-3 text-sm font-medium transition-colors",
              asiste === "no"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            No podré ir
          </button>
        </div>

        {asiste === "si" && tope > 1 ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="rsvp-personas">
              ¿Cuántas personas asistirán?
            </label>
            <select
              id="rsvp-personas"
              className={campo}
              value={String(personas)}
              onChange={(e) => setPersonas(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: tope }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {personasTexto(n)}
                </option>
              ))}
            </select>
            {invitado ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Tu invitación es para {personasTexto(invitado.cupos)}.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="flex gap-2">
          {/* Confirmar dice con quién vive y cuántos son: también es un dato suyo. */}
          <AvisoParticipacion accion="confirmar tu asistencia" className="text-center" />

          <Button type="submit" className="flex-1" disabled={guardando}>
            {guardando ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Enviando…
              </>
            ) : (
              <>
                <Check className="size-4" /> {mia ? "Guardar cambio" : "Enviar respuesta"}
              </>
            )}
          </Button>
          {mia ? (
            <Button type="button" variant="outline" onClick={() => setEditando(false)}>
              <X className="size-4" /> Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        Tu respuesta llega solo a los organizadores del evento.
      </p>
    </Card>
  );
}
