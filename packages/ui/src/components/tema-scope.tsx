import * as React from "react";
import type { TemaResuelto } from "../tema/tipos";
import { temaAVariables } from "../tema/variables";
import { FuentesTema } from "./fuentes-tema";
import { cn } from "../lib/cn";

/**
 * Aplica un tema YA RESUELTO (salón + evento fusionados) a su contenido: las
 * variables CSS van en el `style` del contenedor y la tipografía de la pareja
 * se carga si hace falta. Todo lo de dentro adopta colores, redondeo y letra
 * EN RUNTIME, sin recompilar.
 *
 * Es el sucesor de `BrandingScope` con una diferencia de contrato: recibe el
 * `TemaResuelto` de `resolverTema` — la fusión ocurre ANTES, en un solo lugar,
 * porque las derivadas (superficie, anillo de foco) cruzan las capas salón y
 * evento y dos scopes anidados no podrían recalcularlas.
 *
 * Sirve en servidor y en cliente (no usa hooks). La transición suave de
 * colores evita el "flash" cuando el tema llega tras el primer render en las
 * apps de cliente.
 */
export function TemaScope({
  tema,
  style,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tema: TemaResuelto }) {
  return (
    <div
      style={{ ...temaAVariables(tema), ...style } as React.CSSProperties}
      className={cn(
        "bg-background text-foreground transition-colors duration-300",
        className,
      )}
      {...props}
    >
      <FuentesTema clave={tema.fuentes} />
      {children}
    </div>
  );
}
