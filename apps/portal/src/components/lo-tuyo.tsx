"use client";

/**
 * LO TUYO — tu lugar en esta fiesta, no una lista de apps.
 *
 * Antes esto era una rejilla de hasta 3 tarjetas sueltas (asistencia, mesa,
 * cronograma) — cada una su propio icono, su propia frase, su propio enlace:
 * exactamente la sensación de "3 mini-aplicaciones" que el rediseño vino a
 * quitar. Ahora es la MISMA historia de un invitado real:
 *
 *   ¿confirmaste?  →  si no, es lo único que se pregunta.
 *   ya confirmaste  →  entonces lo que sigue es UNA cosa: tu pase (con tu
 *                       mesa adentro — ver `PaseModulo`, que ya los junta).
 *
 * El cronograma se movió a su propia sección ("El gran día", en
 * `PortalHome`): merece más que una tarjetita, y no es "lo tuyo" — es de
 * todos. Cada pieza aparece SOLO si su experiencia está contratada (el mismo
 * filtro de siempre); sin ninguna, la franja entera no se pinta.
 */
import * as React from "react";
import Link from "next/link";
import { Armchair, CalendarCheck, PartyPopper, QrCode } from "lucide-react";
import {
  COLECCION_ACOMODO,
  COLECCION_MESAS,
  FEATURES_CONOCIDAS as F,
  buscarEnAcomodo,
  fechaLarga,
  mesaDe,
  normalizarAcomodoCrudo,
  normalizarMesasCrudas,
  normalizarNombre,
  tieneFuncion,
} from "@salones/core";
import { obtenerSync, esVitrina } from "@salones/sync";
import { usePerfil } from "@/lib/perfil";
import { claveMiRespuesta, EstadoRSVP, type RespuestaItem } from "@/modulos/rsvp/lib";
import { SEMILLA_ACOMODO, SEMILLA_MESAS } from "@/modulos/mesas/lib";
import type { ConfigEvento } from "@/lib/config-evento";

export function LoTuyo({ config }: { config: ConfigEvento }) {
  const evento = config.codigo;
  const perfil = usePerfil(evento);
  const [lista, setLista] = React.useState(false);
  const [mia, setMia] = React.useState<RespuestaItem | null>(null);
  const [mesa, setMesa] = React.useState<string | null | "sin-asignar">(null);

  // Mi respuesta del RSVP: el recordatorio local que guarda el módulo.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(claveMiRespuesta(evento));
      setMia(raw ? (JSON.parse(raw) as RespuestaItem) : null);
    } catch {
      setMia(null);
    }
    setLista(true);
  }, [evento]);

  // Mi mesa: una lectura al abrir (el módulo de mesas ya se suscribe en vivo).
  React.useEffect(() => {
    if (!perfil?.nombre) {
      setMesa(null);
      return;
    }
    let vivo = true;
    (async () => {
      try {
        const sync = obtenerSync();
        const [mesasCrudas, acomodoCrudo] = await Promise.all([
          sync.listar(evento, COLECCION_MESAS),
          sync.listar(evento, COLECCION_ACOMODO),
        ]);
        if (!vivo) return;
        let mesas = normalizarMesasCrudas(mesasCrudas);
        let acomodo = normalizarAcomodoCrudo(acomodoCrudo);
        if (esVitrina(evento) && mesas.length === 0 && acomodo.length === 0) {
          mesas = SEMILLA_MESAS;
          acomodo = SEMILLA_ACOMODO;
        }
        // Mismo criterio que el módulo de mesas: gana el nombre igual-igual;
        // si no hay exacto, el primero que se le parezca.
        const parecidos = buscarEnAcomodo(perfil.nombre, acomodo);
        const exacto = parecidos.find(
          (i) => normalizarNombre(i.nombre) === normalizarNombre(perfil.nombre),
        );
        const mio = exacto ?? parecidos[0] ?? null;
        if (!mio) return setMesa(null);
        const m = mio.mesaId ? mesaDe(mio, mesas) : null;
        setMesa(m ? m.nombre : "sin-asignar");
      } catch {
        if (vivo) setMesa(null);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [evento, perfil]);

  if (!lista) return null;

  const sufijo = evento && evento !== "demo" ? `?e=${encodeURIComponent(evento)}` : "";
  const tieneRsvp = tieneFuncion(config.entitlements, F.Rsvp);
  const tienePaseOMesa =
    tieneFuncion(config.entitlements, F.Pase) || tieneFuncion(config.entitlements, F.Mesas);

  const confirmada = mia?.estado === EstadoRSVP.Confirmado;
  const rechazada = mia?.estado === EstadoRSVP.Rechazado;
  // Sin RSVP contratado no hay nada que confirmar: el pase se enseña directo.
  const puedeVerPase = tienePaseOMesa && (!tieneRsvp || confirmada);

  if (!tieneRsvp && !puedeVerPase) return null;

  return (
    <div className="mb-12">
      {tieneRsvp && !confirmada ? (
        <Link
          href={`/rsvp${sufijo}`}
          className="group flex items-center gap-4 rounded-[var(--radius)] border border-border bg-card p-5 transition hover:border-ring hover:shadow-sm"
        >
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-primary/10 text-primary ring-1 ring-primary/15">
            <CalendarCheck className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {rechazada ? "Avisaste que no vienes" : "¿Nos acompañas?"}
            </span>
            <span className="block text-sm text-muted-foreground">
              {rechazada ? "¿Cambiaste de opinión? Puedes actualizar tu respuesta." : "Confirma tu lugar en la fiesta."}
            </span>
          </span>
        </Link>
      ) : null}

      {puedeVerPase ? (
        <div className={tieneRsvp && !confirmada ? "mt-3" : undefined}>
          {confirmada && config.fecha ? (
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-primary">
              <PartyPopper className="size-4" /> ¡Nos vemos el {fechaLarga(config.fecha)}!
            </p>
          ) : null}
          <Link
            href={`/pase${sufijo}`}
            className="group flex items-center gap-4 rounded-[var(--radius)] border border-border bg-card p-5 transition hover:border-ring hover:shadow-sm"
          >
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-primary/10 text-primary ring-1 ring-primary/15">
              {mesa && mesa !== "sin-asignar" ? (
                <Armchair className="size-5" />
              ) : (
                <QrCode className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Tu lugar en la fiesta</span>
              <span className="block text-sm text-muted-foreground">
                {mesa && mesa !== "sin-asignar"
                  ? `Tu pase y tu mesa: ${mesa}`
                  : mesa === "sin-asignar"
                    ? "Tu pase — tu mesa se asignará pronto"
                    : "Tu pase con tu código QR"}
              </span>
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
