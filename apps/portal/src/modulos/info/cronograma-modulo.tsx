"use client";

/**
 * MÓDULO CRONOGRAMA (dentro del portal) — el plan de la celebración.
 *
 * Pinta el MISMO itinerario que captura el salón en la invitación (una sola
 * verdad); aquí en versión de texto, pensada para consultarse rápido la noche
 * de la fiesta: hora grande, momento, detalle. Las fotos se quedan en la
 * invitación, que es la pieza emocional.
 */
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@salones/ui";
import { useInvitacion } from "./use-invitacion";
import { fechaLarga } from "./lib";

export function CronogramaModulo({ evento }: { evento: string }) {
  const inv = useInvitacion(evento);

  if (inv === "cargando") return null;
  if (!inv || inv.itinerario.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="size-8" />}
        title="El plan de la celebración se publicará pronto"
        description="Los organizadores siguen afinando los tiempos. Vuelve a asomarte más adelante."
      />
    );
  }

  const cuando = fechaLarga(inv.fechaISO);

  return (
    <div>
      {cuando ? (
        <p className="text-sm text-muted-foreground">
          {cuando}
          {inv.ciudad ? ` · ${inv.ciudad}` : ""}
        </p>
      ) : null}

      <ol className="mt-6 space-y-0">
        {inv.itinerario.map((momento, i) => (
          <li key={`${momento.hora}-${momento.titulo}`} className="relative flex gap-5 pb-8">
            {/* La línea que une los momentos (no después del último). */}
            {/* w-20 (5rem) + gap-5 (1.25rem) + medio punto (0.3rem) = el
                centro del medallón; sin esta cuenta la línea sale chueca.
                La columna mide 5rem porque "10:00 p.m." ocupa ~66px en
                text-sm: con menos, TODAS las horas se parten en dos renglones
                ("6:00" arriba, "p.m." abajo) — medido, no estimado. */}
            {i < inv.itinerario.length - 1 ? (
              <span aria-hidden className="absolute left-[6.55rem] top-8 h-full w-px bg-border" />
            ) : null}
            <span className="w-20 shrink-0 pt-1 text-right text-sm font-medium tabular-nums text-primary">
              {momento.hora}
            </span>
            <span
              aria-hidden
              className="relative z-10 mt-2 size-2.5 shrink-0 rounded-full bg-primary/70 ring-4 ring-background"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug">
                {momento.titulo}
              </h3>
              {momento.detalle ? (
                <p className="mt-1 text-sm text-muted-foreground">{momento.detalle}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
