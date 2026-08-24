/**
 * La LISTA CURADA de parejas tipográficas — la base guarda solo la CLAVE.
 *
 * POR QUÉ UNA ALLOWLIST: la tipografía es identidad, pero una URL libre en la
 * base sería un agujero (cualquier valor acabaría interpolado en un <link> del
 * invitado). Aquí el flujo es al revés: la clave se valida contra esta lista y
 * el `href` se construye ÚNICAMENTE desde ella. Clave desconocida → "sistema",
 * que no descarga nada. Un valor malicioso en la base jamás toca la red.
 *
 * POR QUÉ PAREJAS (y no fuentes sueltas): elegir dos familias que se lleven es
 * trabajo de diseñador; el salón elige un CARÁCTER ("clásica", "moderna"…) y
 * la pareja ya viene armada, con su script opcional para monogramas y frases.
 *
 * CÓMO SE CARGAN:
 *   · "clasica" (la de la demo/sitio) se AUTOALOJA: las apps de la experiencia
 *     la compilan (p. ej. vía @fontsource) y aquí no se emite <link>. Razón
 *     medible: la caché HTTP se particiona por sitio y `*.vercel.app` está en
 *     la Public Suffix List — con Google runtime, Cormorant se re-bajaría en
 *     CADA app puente, FOUT justo en la costura que el rediseño quiere borrar.
 *   · Las demás claves cargan en runtime con <link precedence + display=swap>
 *     (ver `FuentesTema`): texto visible siempre, con pilas de respaldo
 *     métricamente razonables mientras llega la letra.
 */
import type { ClaveFuentes } from "./tipos";

type Familia = {
  /** Nombre de la familia tal cual lo declara la @font-face. */
  familia: string;
  /** Segmento para la URL css2 de Google Fonts (familia + ejes). */
  google?: string;
};

export type ParejaTipografica = {
  clave: ClaveFuentes;
  /** Nombre de cara al salón en el panel. */
  etiqueta: string;
  /** La app la compila (no se emite <link>). */
  autoalojada?: boolean;
  display: Familia;
  sans: Familia;
  /** Script para monogramas y frases; sin él, el script cae al display. */
  script?: Familia;
};

export const FUENTES: Record<ClaveFuentes, ParejaTipografica> = {
  clasica: {
    clave: "clasica",
    etiqueta: "Clásica elegante",
    autoalojada: true,
    display: {
      familia: "Cormorant Garamond",
      google: "Cormorant+Garamond:ital,wght@0,400..700;1,400",
    },
    sans: { familia: "Jost", google: "Jost:ital,wght@0,300..600;1,400" },
    script: { familia: "Parisienne", google: "Parisienne" },
  },
  editorial: {
    clave: "editorial",
    etiqueta: "Editorial",
    display: { familia: "Playfair Display", google: "Playfair+Display:ital,wght@0,400..700;1,400" },
    sans: { familia: "Source Sans 3", google: "Source+Sans+3:wght@300..600" },
    script: { familia: "Pinyon Script", google: "Pinyon+Script" },
  },
  moderna: {
    clave: "moderna",
    etiqueta: "Moderna",
    display: { familia: "Fraunces", google: "Fraunces:opsz,wght@9..144,400..600" },
    sans: { familia: "Inter", google: "Inter:wght@300..600" },
  },
  romantica: {
    clave: "romantica",
    etiqueta: "Romántica",
    display: { familia: "Libre Caslon Text", google: "Libre+Caslon+Text:ital,wght@0,400;0,700;1,400" },
    sans: { familia: "Nunito Sans", google: "Nunito+Sans:wght@300..700" },
    script: { familia: "Great Vibes", google: "Great+Vibes" },
  },
  festiva: {
    clave: "festiva",
    etiqueta: "Festiva",
    display: { familia: "Marcellus", google: "Marcellus" },
    sans: { familia: "Karla", google: "Karla:wght@300..600" },
  },
  sistema: {
    clave: "sistema",
    etiqueta: "Del sistema",
    display: { familia: "" },
    sans: { familia: "" },
  },
};

/** Pilas de respaldo: legibles al instante, del mismo carácter. */
const RESPALDO_DISPLAY = `Georgia, "Times New Roman", serif`;
const RESPALDO_SANS = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

/**
 * La pareja de una clave, con la RED DE SEGURIDAD: cualquier valor que no esté
 * en la lista (dato viejo, error de dedo, valor malicioso) cae a "sistema".
 *
 * `Object.hasOwn` y NO el operador `in`: `in` también acepta las claves
 * heredadas de `Object.prototype` — una fila con `fuentes = "toString"`
 * devolvería una FUNCIÓN en vez de la pareja del sistema, y el primer
 * `.display.familia` reventaría. Probado en fuentes.test.ts.
 */
export function parejaDe(clave?: string): ParejaTipografica {
  if (clave && Object.hasOwn(FUENTES, clave)) return FUENTES[clave as ClaveFuentes];
  return FUENTES.sistema;
}

/**
 * La URL css2 de Google Fonts para una clave, o null si no hay nada que
 * descargar ("sistema" no usa red; las autoalojadas las compila la app).
 * Se construye SOLO desde la allowlist — nunca desde datos.
 */
export function hrefFuentes(clave?: string): string | null {
  const pareja = parejaDe(clave);
  if (pareja.clave === "sistema" || pareja.autoalojada) return null;
  const familias = [pareja.display, pareja.sans, pareja.script]
    .filter((f): f is Familia => Boolean(f?.google))
    .map((f) => `family=${f.google}`)
    .join("&");
  if (!familias) return null;
  return `https://fonts.googleapis.com/css2?${familias}&display=swap`;
}

/**
 * Los VALORES CSS de las tres variables tipográficas de una clave, con sus
 * respaldos. Para "sistema" devuelve null: no se emite nada y mandan los
 * tokens base. Cuando la pareja no trae script, `--font-script` cae al
 * display: ningún componente tiene que preguntar si hay script.
 */
export function familiasCSS(
  clave?: string,
): { display: string; sans: string; script: string } | null {
  const pareja = parejaDe(clave);
  if (pareja.clave === "sistema") return null;
  const display = `"${pareja.display.familia}", ${RESPALDO_DISPLAY}`;
  const sans = `"${pareja.sans.familia}", ${RESPALDO_SANS}`;
  const script = pareja.script ? `"${pareja.script.familia}", ${display}` : display;
  return { display, sans, script };
}
