/**
 * Branding por salón: tema en runtime, sin recompilar.
 *
 * El sistema de diseño define su tema con variables CSS en tokens OKLCH
 * (ver styles/tokens.css): --primary, --ring, --radius, etc. Aquí describimos
 * el branding de UN salón y lo convertimos en esas MISMAS variables, para
 * inyectarlas en vivo. Así cada salón tiene su color, su redondeo y su logo
 * sin tocar el código ni recompilar — igual que `sitio-salon` cambia todo el
 * tema con una clase, pero con datos que en el futuro vendrán de la base.
 *
 * Los colores admiten cualquier valor CSS: oklch(...), #hex, rgb(...). Lo que
 * no se especifica conserva el valor del tema base (no se pisa).
 */

/**
 * Marca y tema de un salón. `nombre` es lo único obligatorio; los campos de
 * color y estilo son opcionales y lo que se omite hereda el tema base.
 */
export type BrandingSalon = {
  /** Nombre del salón (marca). Se usa en el logo/monograma y los títulos. */
  nombre: string;
  /** URL del logo. Si se omite, la UI puede caer a un monograma con la inicial. */
  logoUrl?: string;
  /** Color principal de la marca (botones, enlaces). → `--primary` */
  primario?: string;
  /** Color del texto sobre el color principal. → `--primary-fg` */
  primarioTexto?: string;
  /** Color de acento para detalles y foco. → `--accent` y `--ring` */
  acento?: string;
  /** Redondeo de las esquinas (p. ej. "0.4rem", "1rem"). → `--radius` */
  radio?: string;
};

/**
 * Convierte un `BrandingSalon` en las variables CSS del tema.
 *
 * Es una función pura (sirve en cliente y servidor) y solo devuelve las
 * variables de los campos presentes, para no pisar el resto del tema. El
 * resultado se puede pasar tal cual al `style` de un contenedor: todo lo que
 * quede dentro adopta esos colores y redondeo.
 */
export function brandingAVariables(branding: BrandingSalon): Record<string, string> {
  const variables: Record<string, string> = {};

  if (branding.primario) {
    variables["--primary"] = branding.primario;
    // Por defecto el anillo de foco sigue al color principal.
    variables["--ring"] = branding.primario;
  }
  if (branding.primarioTexto) {
    variables["--primary-fg"] = branding.primarioTexto;
  }
  if (branding.acento) {
    variables["--accent"] = branding.acento;
    // Si hay acento, el foco y los detalles lo usan (manda sobre el primario).
    variables["--ring"] = branding.acento;
  }
  if (branding.radio) {
    variables["--radius"] = branding.radio;
  }

  return variables;
}
