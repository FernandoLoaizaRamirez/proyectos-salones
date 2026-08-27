"use client";

/**
 * MÓDULO CÓDIGO DE VESTIMENTA (dentro del portal).
 *
 * Lo que capturó el salón en la invitación: el código ("Etiqueta rigurosa"),
 * la nota y la paleta de colores sugerida en círculos. Los círculos llevan el
 * color TAL CUAL lo guardó el salón; un valor que no sea #rrggbb no se pinta
 * (mejor un círculo menos que un estilo raro colado).
 */
import { Shirt } from "lucide-react";
import { Card, EmptyState } from "@salones/ui";
import { useInvitacion } from "./use-invitacion";

/** Solo colores #rgb/#rrggbb: lo que la paleta promete pintar. */
const COLOR_SEGURO = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function VestimentaModulo({ evento }: { evento: string }) {
  const inv = useInvitacion(evento);

  if (inv === "cargando") return null;

  const colores = inv ? inv.vestimentaColores.filter((c) => COLOR_SEGURO.test(c.trim())) : [];

  if (!inv || (!inv.vestimenta && !inv.vestimentaNota && colores.length === 0)) {
    return (
      <EmptyState
        icon={<Shirt className="size-8" />}
        title="El código de vestimenta se publicará pronto"
        description="Los organizadores compartirán aquí qué ponerse para la ocasión."
      />
    );
  }

  return (
    <Card className="p-8 text-center">
      <Shirt className="mx-auto size-8 text-primary/70" />
      {inv.vestimenta ? (
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {inv.vestimenta}
        </h2>
      ) : null}
      {inv.vestimentaNota ? (
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{inv.vestimentaNota}</p>
      ) : null}
      {colores.length > 0 ? (
        <div className="mt-8">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Paleta sugerida
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {colores.map((color) => (
              <span
                key={color}
                title={color}
                className="size-10 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
