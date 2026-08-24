import * as React from "react";
import type { TemaResuelto } from "../tema/tipos";
import { TemaScope } from "./tema-scope";
import { CintaExperiencia, type ExperienciaEnlace } from "./cinta-experiencia";
import { PieExperiencia } from "./pie-experiencia";
import { cn } from "../lib/cn";

/**
 * LA CÁSCARA de toda pantalla del invitado: tema aplicado + cinta de
 * navegación + contenido + pie que encadena la historia.
 *
 * Sustituye a los 10+ headers copiados a mano (tres patrones, tres anchos,
 * "SR" quemado en nueve archivos). Un módulo ya no arma su propia página:
 * recibe su `TemaResuelto` —del portal (servidor) o de `useTemaEvento`
 * (cliente)— y se mete dentro. La cáscara NO hace red: es presentación pura,
 * y por eso vive en @salones/ui sin arrastrar el cliente de la base.
 *
 * Los anchos son los TRES de la suite (nada de inventar un cuarto): "lg" para
 * pantallas de una columna (mi-mesa), "3xl" el editorial por defecto, "5xl"
 * para retículas (álbum), "6xl" para el acomodo de mesas.
 */
const ANCHOS = {
  lg: "max-w-lg",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

export function AppShell({
  tema,
  volverHref,
  volverEtiqueta,
  compartirUrl,
  experiencias,
  siguiente,
  ancho = "3xl",
  className,
  children,
}: {
  tema: TemaResuelto;
  /** Enlace de regreso al portal del evento (la flecha y el nombre lo usan). */
  volverHref?: string;
  volverEtiqueta?: string;
  /** Enlace a compartir (con `?e=` y, si aplica, el `#` del perfil). */
  compartirUrl?: string;
  /** Menú "Experiencias", ya filtrado por entitlements. */
  experiencias?: ExperienciaEnlace[];
  /** La parada que sigue en el recorrido de la celebración. */
  siguiente?: { nombre: string; href: string };
  ancho?: keyof typeof ANCHOS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TemaScope tema={tema} className="flex min-h-screen flex-col">
      <CintaExperiencia
        tema={tema}
        volverHref={volverHref}
        volverEtiqueta={volverEtiqueta}
        compartirUrl={compartirUrl}
        experiencias={experiencias}
      />
      <main className={cn("mx-auto w-full flex-1 px-6 py-10", ANCHOS[ancho], className)}>
        {children}
      </main>
      <div className={cn("mx-auto w-full px-0", ANCHOS[ancho])}>
        <PieExperiencia tema={tema} siguiente={siguiente} />
      </div>
    </TemaScope>
  );
}
