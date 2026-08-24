import * as React from "react";
import { ArrowRight } from "lucide-react";
import type { TemaResuelto } from "../tema/tipos";
import { PieLegal } from "./pie-legal";

/**
 * El PIE de toda pantalla del invitado. Dos trabajos:
 *
 * 1. ENCADENAR LA HISTORIA: el portal es un menú, pero la demo (y la fiesta)
 *    son un recorrido. "Siguiente: Playlist →" lleva de una experiencia a la
 *    que sigue en el orden de la celebración — quien llama lo calcula desde
 *    los manifests filtrados por entitlements; aquí solo se pinta.
 * 2. FIRMAR LA CASA: "Un evento en {salón}" — el producto es del salón, no
 *    del software. Con el aviso legal de siempre debajo.
 */
export function PieExperiencia({
  tema,
  siguiente,
}: {
  tema: TemaResuelto;
  /** La parada que sigue en el recorrido, ya decidida por quien llama. */
  siguiente?: { nombre: string; href: string };
}) {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="px-6 py-8">
        {siguiente ? (
          <a
            href={siguiente.href}
            className="group mb-8 flex items-center justify-between rounded-[var(--radius)] border border-border bg-card p-5 transition hover:border-ring hover:shadow-sm"
          >
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Siguiente
              </div>
              <div className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold">
                {siguiente.nombre}
              </div>
            </div>
            <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </a>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          Un evento en{" "}
          {tema.salon.sitioUrl ? (
            <a
              href={tema.salon.sitioUrl}
              className="font-[family-name:var(--font-display)] font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {tema.salon.nombre}
            </a>
          ) : (
            <span className="font-[family-name:var(--font-display)] font-semibold text-foreground">
              {tema.salon.nombre}
            </span>
          )}
        </p>

        <div className="mt-4">
          <PieLegal />
        </div>
      </div>
    </footer>
  );
}
