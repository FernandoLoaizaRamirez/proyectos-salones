import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Logo de marca. El nombre se toma de la variable de entorno
 * NEXT_PUBLIC_BRAND_NAME (white-label); si no hay, usa un valor por defecto.
 */
export function Logo({ className }: { className?: string }) {
  const marca = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Salón de Eventos";
  const inicial = marca.trim().slice(0, 1).toUpperCase() || "S";

  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-[var(--radius)] bg-primary text-sm font-bold text-primary-foreground">
        {inicial}
      </span>
      <span>{marca}</span>
    </span>
  );
}
