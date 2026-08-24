/**
 * Contraste WCAG en TypeScript puro, sin dependencias ni navegador.
 *
 * PARA QUÉ: los colores del tema los captura un salón, no un diseñador. El
 * panel valida AL GUARDAR (tinta/fondo ≥ 4.5:1, texto-sobre-primario ≥ 4.5:1)
 * y `resolverTema` DERIVA los textos que falten en vez de confiar en que
 * alguien los capture bien. Nada de esto puede depender de `color-contrast()`
 * de CSS (no es baseline) ni del DOM (corre en servidor y en vitest).
 *
 * QUÉ ENTIENDE: #hex, rgb()/rgba(), hsl()/hsla(), oklch() y oklab() — los
 * formatos que guarda la base y los que usa el sitio. Un color que no se pueda
 * leer devuelve `null` y quien llama decide (el panel avisa; el resolver
 * descarta el color y hereda).
 *
 * La luminancia y el ratio son los de la definición WCAG 2.x; la conversión
 * oklab→sRGB usa las matrices publicadas por Björn Ottosson (las mismas de los
 * navegadores).
 */

type RGB = { r: number; g: number; b: number }; // lineal, 0..1

/** Canal sRGB con gamma (0..1) → lineal, fórmula WCAG. */
function aLineal(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function desdeHex(hex: string): RGB | null {
  const h = hex.slice(1);
  const corto = h.length === 3 || h.length === 4;
  const largo = h.length === 6 || h.length === 8;
  if (!corto && !largo) return null;
  const lee = (i: number) =>
    corto
      ? parseInt(h.charAt(i) + h.charAt(i), 16) / 255
      : parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255;
  const r = lee(0);
  const g = lee(1);
  const b = lee(2);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r: aLineal(r), g: aLineal(g), b: aLineal(b) };
}

/** Números de una función CSS: admite comas o espacios, %, deg y "/ alfa". */
function numerosDe(cuerpo: string): number[] {
  // El alfa (tras "/") no afecta al contraste sobre fondo opaco: se ignora.
  const sinAlfa = cuerpo.split("/")[0] ?? cuerpo;
  const crudos = sinAlfa.match(/-?\d*\.?\d+(?:e-?\d+)?%?(?:deg)?/gi) ?? [];
  return crudos.map((t) => {
    const esPorcentaje = t.endsWith("%");
    const n = parseFloat(t);
    return esPorcentaje ? n / 100 : n;
  });
}

function desdeRgb(cuerpo: string): RGB | null {
  const [nr = NaN, ng = NaN, nb = NaN] = numerosDe(cuerpo);
  if ([nr, ng, nb].some(Number.isNaN)) return null;
  // rgb() en CSS es 0..255 O porcentajes — nunca fracciones. Los porcentajes ya
  // llegan divididos entre 100 desde numerosDe; los números se dividen SIEMPRE
  // entre 255. (La heurística "v > 1" leía rgb(1, 0, 0) —un rojo casi negro—
  // como rojo puro, y derivaba texto negro sobre botón negro.)
  const esPorcentual = cuerpo.includes("%");
  const canal = (v: number) => Math.min(Math.max(esPorcentual ? v : v / 255, 0), 1);
  return { r: aLineal(canal(nr)), g: aLineal(canal(ng)), b: aLineal(canal(nb)) };
}

function desdeHsl(cuerpo: string): RGB | null {
  const [nh = NaN, ns = NaN, nl = NaN] = numerosDe(cuerpo);
  if ([nh, ns, nl].some(Number.isNaN)) return null;
  const h = ((nh % 360) + 360) % 360;
  const s = Math.min(Math.max(ns, 0), 1);
  const l = Math.min(Math.max(nl, 0), 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return { r: aLineal(r1 + m), g: aLineal(g1 + m), b: aLineal(b1 + m) };
}

/** sRGB lineal → oklab. Matrices de Ottosson (la inversa de la de abajo). */
function linealAOklab(rgb: RGB): { L: number; a: number; b: number } {
  const l = 0.4122214708 * rgb.r + 0.5363325363 * rgb.g + 0.0514459929 * rgb.b;
  const m = 0.2119034982 * rgb.r + 0.6806995451 * rgb.g + 0.1073969566 * rgb.b;
  const s = 0.0883024619 * rgb.r + 0.2817188376 * rgb.g + 0.6299787005 * rgb.b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/** oklab (L, a, b) → sRGB lineal. Matrices de Ottosson. */
function oklabALineal(L: number, a: number, b: number): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const lim = (v: number) => Math.min(Math.max(v, 0), 1);
  return {
    r: lim(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: lim(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: lim(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

function desdeOklch(cuerpo: string): RGB | null {
  const [L = NaN, C = NaN, H = NaN] = numerosDe(cuerpo);
  if ([L, C, H].some(Number.isNaN)) return null;
  const rad = (H * Math.PI) / 180;
  return oklabALineal(L, C * Math.cos(rad), C * Math.sin(rad));
}

function desdeOklab(cuerpo: string): RGB | null {
  const [L = NaN, a = NaN, b = NaN] = numerosDe(cuerpo);
  if ([L, a, b].some(Number.isNaN)) return null;
  return oklabALineal(L, a, b);
}

/** Color CSS → sRGB lineal, o null si no se pudo leer. */
export function leerColor(color: string): RGB | null {
  const c = color.trim().toLowerCase();
  if (c.startsWith("#")) return desdeHex(c);
  const fn = c.match(/^([a-z]+)\((.*)\)$/);
  if (!fn) return null;
  const cuerpo = fn[2] ?? "";
  switch (fn[1] ?? "") {
    case "rgb":
    case "rgba":
      return desdeRgb(cuerpo);
    case "hsl":
    case "hsla":
      return desdeHsl(cuerpo);
    case "oklch":
      return desdeOklch(cuerpo);
    case "oklab":
      return desdeOklab(cuerpo);
    default:
      return null;
  }
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco), o null si no se leyó. */
export function luminancia(color: string): number | null {
  const rgb = leerColor(color);
  if (!rgb) return null;
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

/**
 * Ratio de contraste WCAG entre dos colores (1..21), o null si alguno no se
 * pudo leer. 4.5 es el mínimo para texto normal; 3 para componentes de UI.
 */
export function ratioContraste(a: string, b: string): number | null {
  const la = luminancia(a);
  const lb = luminancia(b);
  if (la === null || lb === null) return null;
  const [claro, oscuro] = la >= lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * El texto que se LEE sobre un color: blanco o negro, el que contraste más.
 * Es lo que se usa cuando el salón no capturó `primarioTexto` — derivar gana
 * siempre a confiar: el 90 % de los salones nunca llenará ese campo.
 *
 * NEGRO PURO y no un casi-negro A PROPÓSITO: con un texto de luminancia > 0,
 * existe una franja de colores medios donde NI el blanco NI ese casi-negro
 * llegan a 4.5:1 (comprobado con la aritmética WCAG: con #141110 la franja va
 * de L 0.183 a 0.202). Con negro puro y el umbral en el punto geométrico
 * óptimo —√(1.05·0.05) − 0.05 ≈ 0.1791, donde blanco y negro contrastan igual
 * (4.58:1)— CUALQUIER color del mundo recibe un texto que pasa 4.5:1. Hay una
 * prueba que recorre colores al azar y lo demuestra.
 *
 * Si el color no se puede leer, blanco (el fondo típico de un primario es
 * oscuro y el fallo correcto es el legible).
 */
export function derivarTextoSobre(color: string): string {
  const l = luminancia(color);
  if (l === null) return "#ffffff";
  return l > 0.1791 ? "#000000" : "#ffffff";
}

/** Canal lineal → sRGB con gamma (la inversa de `aLineal`). */
function aGamma(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(Math.max(v, 0), 1);
}

/**
 * El MISMO color que producirá `color-mix(in oklab, <color> <peso>%, white)`,
 * calculado aquí en números.
 *
 * PARA QUÉ: `legibleEnAmbosTemas` aclara el color de marca en modo oscuro con
 * ese color-mix… pero el TEXTO que va encima se decide en TypeScript, ANTES de
 * que el navegador mezcle nada. Sin esta función, el texto se derivaría contra
 * el color CLARO y quedaría ilegible sobre la versión aclarada (medido con la
 * propia demo: crema sobre el vino aclarado ≈ 2.8:1). Con ella, el texto del
 * modo oscuro se deriva contra el color que de verdad se pinta.
 *
 * Devuelve #rrggbb, o null si el color no se pudo leer.
 */
export function mezclarConBlanco(color: string, pesoColor: number): string | null {
  const rgb = leerColor(color);
  if (!rgb) return null;
  const propio = linealAOklab(rgb);
  const p = Math.min(Math.max(pesoColor, 0), 100) / 100;
  // Blanco en oklab es (1, 0, 0): la mezcla por componentes es directa.
  const mezclado = oklabALineal(propio.L * p + (1 - p), propio.a * p, propio.b * p);
  const hex = (v: number) =>
    Math.round(aGamma(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(mezclado.r)}${hex(mezclado.g)}${hex(mezclado.b)}`;
}
