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
  /**
   * Dirección de la web del salón, para volver a ella desde el portal.
   *
   * El invitado llega al portal desde la web del salón (o desde un WhatsApp que
   * salió de ahí) y hasta ahora no tenía camino de regreso: el portal era un
   * callejón sin salida con el nombre del proveedor en el pie. Con esto, la
   * marca de arriba enlaza a casa y las dos piezas se sienten un solo producto.
   *
   * Opcional a propósito: si el salón no tiene web, la marca simplemente no
   * enlaza (se pinta igual, pero sin liga).
   */
  sitioUrl?: string;
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
/**
 * Hace que un color de marca se lea TAMBIÉN sobre fondo oscuro.
 *
 * EL PROBLEMA MEDIDO: el branding trae UN solo valor por color, pero el portal
 * se pinta sobre tema oscuro. Un vino como el de Hacienda Santa Renata daba
 * 2.37:1 de contraste sobre el fondo #111118 — reprueba el mínimo de 4.5:1, y
 * el nombre del salón quedaba prácticamente invisible. Justo el color que más
 * importa que se vea.
 *
 * LA SOLUCIÓN: `light-dark()` deja escribir los dos valores en una sola
 * declaración y que el navegador elija según el `color-scheme` de la página
 * (que next-themes ya establece). En claro va el color tal cual, sin tocarlo:
 * es la marca del salón y nadie quiere verla alterada. En oscuro se mezcla con
 * blanco lo justo para despegarlo del fondo conservando el tono.
 *
 * `oklab` y no `srgb` porque la mezcla en sRGB apaga y ensucia los colores
 * saturados; en oklab el vino aclarado sigue leyéndose como vino.
 *
 * SI EL NAVEGADOR NO CONOCE `light-dark()` (anterior a 2024), la declaración
 * entera se descarta y el token hereda el valor del tema base. Se pierde el
 * color del salón, pero se ve — que es el fallo correcto de los dos.
 */
function legibleEnAmbosTemas(color: string): string {
  return `light-dark(${color}, color-mix(in oklab, ${color} 55%, white))`;
}

export function brandingAVariables(branding: BrandingSalon): Record<string, string> {
  const variables: Record<string, string> = {};

  if (branding.primario) {
    variables["--primary"] = legibleEnAmbosTemas(branding.primario);
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
