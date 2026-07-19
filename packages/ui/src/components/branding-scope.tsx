import * as React from "react";
import { brandingAVariables } from "../branding";
import type { BrandingSalon } from "../branding";

/**
 * Aplica el branding de un salón a su contenido, inyectando las variables CSS
 * del tema en un contenedor. Todo lo que quede dentro adopta esos colores y
 * redondeo EN RUNTIME (sin recompilar), como si se cambiara el tema.
 *
 * Reutiliza los tokens del sistema (--primary, --accent, --radius…), así que
 * los componentes existentes (Button, Card…) se re-tematizan solos. Se puede
 * anidar: un BrandingScope dentro de otro sobreescribe solo lo suyo.
 *
 * @example
 * <BrandingScope branding={{ nombre: "Salón X", primario: "oklch(0.5 0.13 245)" }}>
 *   <Button>Reservar</Button>
 * </BrandingScope>
 */
export function BrandingScope({
  branding,
  style,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { branding: BrandingSalon }) {
  return (
    <div style={{ ...brandingAVariables(branding), ...style } as React.CSSProperties} {...props}>
      {children}
    </div>
  );
}
