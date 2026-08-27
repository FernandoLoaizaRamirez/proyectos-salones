"use client";

/**
 * MÓDULO LUGAR (dentro del portal) — las sedes del evento y cómo llegar.
 *
 * Cada sede capturada en la invitación (ceremonia, recepción) sale como
 * tarjeta con su hora, dirección, el botón de "Cómo llegar" (el mapa del salón
 * o una búsqueda de Google Maps armada aquí) y "Agregar a mi calendario". Si
 * las dos sedes son el mismo lugar, el invitado ve dos tarjetas iguales de
 * nombre pero con horas distintas — que es exactamente lo que necesita.
 */
import { CalendarPlus, MapPin, Navigation } from "lucide-react";
import { Card, EmptyState } from "@salones/ui";
import { useInvitacion } from "./use-invitacion";
import { enlaceCalendario, enlaceComoLlegar, nombresInvitacion, type Sede } from "./lib";

const BOTON =
  "inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-ring hover:bg-muted";

export function LugarModulo({ evento }: { evento: string }) {
  const inv = useInvitacion(evento);

  if (inv === "cargando") return null;

  const sedes: Sede[] = inv ? [inv.ceremonia, inv.recepcion].filter((s) => s.lugar || s.direccion) : [];

  if (!inv || sedes.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="size-8" />}
        title="El lugar del evento se publicará pronto"
        description="Los organizadores compartirán aquí las direcciones y cómo llegar."
      />
    );
  }

  const titulo = nombresInvitacion(inv);

  return (
    <div className="space-y-4">
      {sedes.map((sede) => {
        const mapa = enlaceComoLlegar(sede);
        const calendario = inv.fechaISO
          ? enlaceCalendario({
              titulo: [sede.titulo || "Evento", titulo].filter(Boolean).join(" · "),
              fechaISO: inv.fechaISO,
              hora: sede.hora,
              lugar: sede.lugar,
              direccion: sede.direccion,
            })
          : "";

        return (
          <Card key={`${sede.titulo}-${sede.hora}`} className="p-6">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-primary">
              {sede.titulo || "Sede"}
              {sede.hora ? ` · ${sede.hora}` : ""}
            </p>
            {sede.lugar ? (
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold">
                {sede.lugar}
              </h3>
            ) : null}
            {sede.direccion ? (
              <p className="mt-1 text-sm text-muted-foreground">{sede.direccion}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {mapa ? (
                <a href={mapa} target="_blank" rel="noopener noreferrer" className={BOTON}>
                  <Navigation className="size-4 text-primary" /> Cómo llegar
                </a>
              ) : null}
              {calendario ? (
                <a href={calendario} target="_blank" rel="noopener noreferrer" className={BOTON}>
                  <CalendarPlus className="size-4 text-primary" /> Agregar a mi calendario
                </a>
              ) : null}
            </div>
          </Card>
        );
      })}
      {inv.ciudad ? (
        <p className="text-sm text-muted-foreground">La celebración es en {inv.ciudad}.</p>
      ) : null}
    </div>
  );
}
