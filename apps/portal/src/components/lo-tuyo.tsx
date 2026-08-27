"use client";

/**
 * LO TUYO — la franja personal de la portada del evento.
 *
 * La portada dejaba al invitado en la puerta: nombre del evento, cuenta
 * regresiva y tarjetas, pero nada SUYO. Aquí se junta lo que los módulos ya
 * saben de este teléfono: qué contestó en el RSVP (su recordatorio local), en
 * qué mesa va (el acomodo del organizador) y qué sigue en la fiesta (el
 * itinerario de la invitación). Nada se pregunta de nuevo: son las mismas
 * fuentes de los módulos, pintadas en la entrada.
 *
 * Cada pieza aparece SOLO si su experiencia está contratada (el mismo filtro
 * de las tarjetas); sin ninguna, la franja entera no se pinta. Y sin datos
 * personales todavía, cada pieza invita en vez de fingir: "¿Nos acompañas?".
 */
import * as React from "react";
import Link from "next/link";
import { Armchair, CalendarCheck, CalendarClock, ChevronRight } from "lucide-react";
import {
  COLECCION_ACOMODO,
  COLECCION_MESAS,
  FEATURES_CONOCIDAS as F,
  buscarEnAcomodo,
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
import { cargarInvitacion, loQueSigue, type Invitacion } from "@/modulos/info/lib";
import type { ConfigEvento } from "@/lib/config-evento";

type Pieza = {
  clave: string;
  href: string;
  icono: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  valor: string;
  /** Sin dato personal todavía: se pinta como invitación, no como hecho. */
  invita?: boolean;
};

export function LoTuyo({ config }: { config: ConfigEvento }) {
  const evento = config.codigo;
  const perfil = usePerfil(evento);
  const [lista, setLista] = React.useState(false);
  const [mia, setMia] = React.useState<RespuestaItem | null>(null);
  const [mesa, setMesa] = React.useState<string | null | "sin-asignar">(null);
  const [inv, setInv] = React.useState<Invitacion | null>(null);
  /** El reloj se enciende tras montar (mismo motivo que la cuenta regresiva). */
  const [ahora, setAhora] = React.useState<Date | null>(null);

  // Mi respuesta del RSVP: el recordatorio local que guarda el módulo.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(claveMiRespuesta(evento));
      setMia(raw ? (JSON.parse(raw) as RespuestaItem) : null);
    } catch {
      setMia(null);
    }
    setAhora(new Date());
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

  // Lo que sigue: el itinerario de la invitación (o el de la muestra).
  React.useEffect(() => {
    let vivo = true;
    cargarInvitacion(evento).then((resultado) => {
      if (vivo) setInv(resultado);
    });
    return () => {
      vivo = false;
    };
  }, [evento]);

  if (!lista) return null;

  const sufijo = evento && evento !== "demo" ? `?e=${encodeURIComponent(evento)}` : "";
  const piezas: Pieza[] = [];

  if (tieneFuncion(config.entitlements, F.Rsvp)) {
    const confirmada = mia?.estado === EstadoRSVP.Confirmado;
    const rechazada = mia?.estado === EstadoRSVP.Rechazado;
    piezas.push({
      clave: "rsvp",
      href: `/rsvp${sufijo}`,
      icono: CalendarCheck,
      etiqueta: "Tu asistencia",
      valor: confirmada
        ? `Confirmada · ${mia!.personas} ${mia!.personas === 1 ? "persona" : "personas"}`
        : rechazada
          ? "Avisaste que no irás"
          : "¿Nos acompañas?",
      invita: !confirmada && !rechazada,
    });
  }

  if (tieneFuncion(config.entitlements, F.Mesas)) {
    piezas.push({
      clave: "mesas",
      href: `/mesas${sufijo}`,
      icono: Armchair,
      etiqueta: "Tu mesa",
      valor:
        mesa && mesa !== "sin-asignar"
          ? mesa
          : mesa === "sin-asignar"
            ? "Aún sin asignar"
            : "Encuéntrala aquí",
      invita: !mesa || mesa === "sin-asignar",
    });
  }

  if (tieneFuncion(config.entitlements, F.Cronograma) && inv && ahora) {
    const sigue = loQueSigue(inv, ahora);
    if (sigue) {
      piezas.push({
        clave: "cronograma",
        href: `/cronograma${sufijo}`,
        icono: CalendarClock,
        etiqueta: sigue.yaEmpezo ? "Ahora sigue" : "La celebración empieza con",
        valor: [sigue.momento.titulo, sigue.momento.hora].filter(Boolean).join(" · "),
      });
    }
  }

  if (piezas.length === 0) return null;

  return (
    // `grid-cols-1` EXPLÍCITO: sin columna declarada, el track implícito se
    // dimensiona al min-content del texto con `truncate` (nowrap) y una mesa
    // de nombre largo ENSANCHA la página en el teléfono — el fallo móvil nº1
    // de la casa. Con minmax(0,1fr) el track topa y la elipsis trabaja.
    <div className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {piezas.map((p) => (
        <Link
          key={p.clave}
          href={p.href}
          className="group flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3 transition hover:border-ring hover:shadow-sm"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <p.icono className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {p.etiqueta}
            </span>
            <span
              className={[
                "block truncate text-sm",
                p.invita ? "text-muted-foreground" : "font-medium",
              ].join(" ")}
            >
              {p.valor}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
        </Link>
      ))}
    </div>
  );
}
