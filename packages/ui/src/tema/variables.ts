/**
 * `TemaResuelto` → variables CSS del sistema de diseño.
 *
 * Emite SOLO las variables de los campos presentes (lo que falta hereda el
 * tema base de tokens.css — la regla de siempre de `brandingAVariables`), y
 * cada color de marca sale envuelto en `light-dark()`: un solo valor guardado,
 * legible en los dos modos.
 *
 * LA JUGADA DE LA SUPERFICIE: de las DOS perillas del salón (fondo + tinta)
 * salen las nueve variables de superficie, y el modo oscuro se DERIVA
 * mezclando el fondo del salón con un casi-negro cálido en oklab — exactamente
 * lo que el sitio hace a mano en `.premium` (crema #f4ede4 → #100b08). Cada
 * salón gana su "gala nocturna" gratis, sin segunda paleta y sin exponer nueve
 * campos imposibles de validar en el panel.
 */
import type { TemaResuelto } from "./tipos";
import { familiasCSS } from "./fuentes";
import { derivarTextoSobre, mezclarConBlanco } from "./contraste";

/**
 * Hace que un color de marca se lea TAMBIÉN sobre fondo oscuro.
 *
 * EL PROBLEMA MEDIDO: el branding trae UN solo valor por color, pero la
 * experiencia puede pintarse en oscuro. El vino de Hacienda Santa Renata daba
 * 2.37:1 sobre #111118 — reprueba el mínimo de 4.5:1. En claro va el color tal
 * cual (es la marca y nadie quiere verla alterada); en oscuro se mezcla con
 * blanco lo justo para despegarlo del fondo conservando el tono. `oklab` y no
 * sRGB porque la mezcla en sRGB apaga los saturados. Si el navegador no conoce
 * `light-dark()` (anterior a 2024), la declaración entera se descarta y el
 * token hereda el tema base: se pierde la marca, se ve el texto — el fallo
 * correcto de los dos. Tras el arreglo: 6.79:1 medido en vivo.
 */
export function legibleEnAmbosTemas(color: string): string {
  return `light-dark(${color}, color-mix(in oklab, ${color} 55%, white))`;
}

/** El casi-negro cálido ancla del modo oscuro derivado (pariente del #100b08 del sitio). */
const NOCHE = "#0f0c0a";

/** Mezcla en oklab, la de todas las derivadas. */
const mezcla = (a: string, pct: number, b: string) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;

/**
 * El texto sobre un color de marca, EN LOS DOS MODOS. En oscuro el color no se
 * pinta tal cual: `legibleEnAmbosTemas` lo aclara con color-mix 55 % blanco —
 * así que el texto del modo oscuro se deriva contra ESE color aclarado
 * (calculado aquí en números con `mezclarConBlanco`), no contra el original.
 * Sin esto, la propia demo fallaba: crema sobre el vino aclarado ≈ 2.8:1.
 */
function textoEnAmbosTemas(color: string, textoClaro: string): string {
  const aclarado = mezclarConBlanco(color, 55);
  const textoOscuro = derivarTextoSobre(aclarado ?? color);
  if (textoOscuro === textoClaro) return textoClaro;
  return `light-dark(${textoClaro}, ${textoOscuro})`;
}

/**
 * Las variables CSS del tema resuelto. El resultado se pasa tal cual al
 * `style` de un contenedor (lo hace `TemaScope`): todo lo de dentro adopta
 * colores, redondeo y tipografía del salón/evento.
 */
export function temaAVariables(tema: TemaResuelto): Record<string, string> {
  const variables: Record<string, string> = {};
  const { primario, primarioTexto, acento, acentoTexto, fondo, tinta } = tema.colores;

  if (primario) {
    variables["--primary"] = legibleEnAmbosTemas(primario);
    // Por defecto el anillo de foco sigue al color principal.
    variables["--ring"] = primario;
    if (primarioTexto) variables["--primary-fg"] = textoEnAmbosTemas(primario, primarioTexto);
  }
  if (acento) {
    variables["--accent"] = legibleEnAmbosTemas(acento);
    // Si hay acento, el foco y los detalles lo usan (manda sobre el primario).
    variables["--ring"] = acento;
    if (acentoTexto) variables["--accent-fg"] = textoEnAmbosTemas(acento, acentoTexto);
  }

  if (fondo && tinta) {
    variables["--bg"] = `light-dark(${fondo}, ${mezcla(fondo, 10, NOCHE)})`;
    variables["--fg"] = `light-dark(${tinta}, ${mezcla(fondo, 90, "white")})`;
    variables["--card"] =
      `light-dark(${mezcla(fondo, 25, "white")}, ${mezcla(fondo, 16, NOCHE)})`;
    variables["--card-fg"] = variables["--fg"];
    variables["--muted"] = `light-dark(${mezcla(tinta, 6, fondo)}, ${mezcla(fondo, 22, NOCHE)})`;
    variables["--muted-fg"] =
      `light-dark(${mezcla(tinta, 72, fondo)}, ${mezcla(fondo, 78, NOCHE)})`;
    variables["--border"] =
      `light-dark(${mezcla(tinta, 14, fondo)}, ${mezcla(fondo, 26, NOCHE)})`;
    variables["--surface"] =
      `light-dark(${mezcla(tinta, 4, fondo)}, ${mezcla(fondo, 14, NOCHE)})`;
    variables["--surface-fg"] = variables["--fg"];
  }

  if (tema.radio) variables["--radius"] = tema.radio;

  const fuentes = familiasCSS(tema.fuentes);
  if (fuentes) {
    variables["--font-display"] = fuentes.display;
    variables["--font-sans"] = fuentes.sans;
    variables["--font-script"] = fuentes.script;
  }

  return variables;
}
