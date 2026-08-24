/**
 * La FUSIÓN del tema: salón + evento → `TemaResuelto`.
 *
 * Función PURA (sin red, sin DOM): corre idéntica en el portal (RSC), en las
 * apps del invitado (cliente), en el preview del panel (edición en memoria) y
 * en vitest. Es la MISMA decisión que ya se tomó para los entitlements — la
 * Edge Function devuelve datos crudos y la única implementación con pruebas
 * vive en el paquete compartido.
 *
 * Reglas, en orden:
 *   1. SANEAR: cada color pasa por `esColorSeguro`; el que no pase se DESCARTA
 *      (hereda la capa anterior). La base puede contener basura — escrituras
 *      por service-role saltan el panel — y un inline style no se puede
 *      sanear después.
 *   2. FUSIONAR: el evento pisa al salón solo en lo suyo (primario, acento,
 *      fuentes); la superficie (fondo/tinta), el radio y el logo son del salón.
 *   3. PROTEGER: si la pareja fondo/tinta guardada no llega a 3:1, se
 *      descartan LAS DOS — mejor el tema base legible que la marca ilegible
 *      (el mismo criterio documentado en `legibleEnAmbosTemas`).
 *   4. DERIVAR: el texto sobre el primario (y sobre el acento) se calcula si
 *      falta, en vez de confiar en que alguien lo capture.
 */
import type { TemaEvento, TemaResuelto, TemaSalon } from "./tipos";
import { derivarTextoSobre, ratioContraste } from "./contraste";
import { parejaDe } from "./fuentes";

/**
 * ¿Este texto es un color CSS y NADA más? Acepta #hex y las funciones de color
 * conocidas con un cuerpo inocente; rechaza cualquier cosa con la que se pueda
 * escapar de un inline style o traer datos de fuera (`;`, `}`, `url(`,
 * `var(`, paréntesis anidados…).
 */
export function esColorSeguro(color: unknown): color is string {
  if (typeof color !== "string") return false;
  const c = color.trim();
  if (c.length === 0 || c.length > 64) return false;
  // Longitudes EXACTAS (3|4|6|8): `{3,8}` aceptaba un typo de 5 dígitos
  // ("#fbf9f"), que es CSS inválido — y una variable con basura no HEREDA el
  // tema base como una ausente: envenena todas las derivadas que la usan.
  if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) return true;
  return /^(rgb|rgba|hsl|hsla|oklch|oklab)\(\s*[0-9a-zA-Z.,%\s/+-]*\)$/.test(c);
}

/**
 * ¿Esta URL es segura para un `href`/`src`? Solo http(s) absoluto y sin
 * caracteres de escape. Es el gemelo de `esColorSeguro` para direcciones: los
 * campos `sitioUrl`/`logoUrl`/`portadaUrl` vienen de la base (y con la 0025
 * los escribe el panel del salón) y acaban en el `<a href>` de la cinta que
 * toca cada invitado — un `javascript:…` guardado ahí ejecutaría en su
 * navegador. Lo que no pase, se descarta (la marca se pinta sin enlace).
 */
export function esUrlSegura(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (u.length === 0 || u.length > 500) return false;
  return /^https?:\/\/[^\s"'<>\\]+$/i.test(u);
}

const limpiaUrl = (v?: string): string | undefined => (esUrlSegura(v) ? v.trim() : undefined);

/** Un radio CSS inocente: "0.4rem", "12px", "50%", "1em". Nada más. */
function esRadioSeguro(radio: unknown): radio is string {
  return typeof radio === "string" && /^\d*\.?\d+(rem|em|px|%)$/.test(radio.trim());
}

const limpiaColor = (v?: string): string | undefined => (esColorSeguro(v) ? v.trim() : undefined);

/**
 * Fusiona la identidad del salón con la personalización del evento.
 *
 * @param datosEvento nombre/fecha del evento (de `evento-config` o del molde
 * de la invitación) — viajan en el tema porque la cáscara los pinta junto a él.
 */
export function resolverTema(
  salon: TemaSalon,
  evento?: TemaEvento | null,
  opciones?: {
    origen?: "servidor" | "demo";
    datosEvento?: { nombre?: string; fechaISO?: string };
  },
): TemaResuelto {
  const primarioDelEvento = limpiaColor(evento?.primario);
  const primarioDelSalon = limpiaColor(salon.primario);
  const primario = primarioDelEvento ?? primarioDelSalon;
  const acento = limpiaColor(evento?.acento) ?? limpiaColor(salon.acento);

  let fondo = limpiaColor(salon.fondo);
  let tinta = limpiaColor(salon.tinta);
  // La superficie viaja en pareja: una sola mitad no sirve para derivar nada,
  // y una pareja ilegible es peor que el tema base. Un ratio NULO (el color
  // pasó el regex pero no se pudo leer, p. ej. oklch con "none") también
  // descarta: nueve variables derivadas no se cuelgan de un color inverificable.
  if (!fondo || !tinta) {
    fondo = undefined;
    tinta = undefined;
  } else {
    const ratio = ratioContraste(tinta, fondo);
    if (ratio === null || ratio < 3) {
      fondo = undefined;
      tinta = undefined;
    }
  }

  // El texto capturado por el salón está pensado para SU primario: si el
  // EVENTO trae el suyo, o si el primario del salón se DESCARTÓ por inválido,
  // ese texto ya no aplica y se deriva de nuevo — el texto y su color viajan
  // en pareja, igual que fondo/tinta.
  const primarioTexto = primarioDelEvento
    ? derivarTextoSobre(primarioDelEvento)
    : primarioDelSalon
      ? (limpiaColor(salon.primarioTexto) ?? derivarTextoSobre(primarioDelSalon))
      : undefined;
  const acentoTexto = acento ? derivarTextoSobre(acento) : undefined;

  return {
    salon: {
      nombre: salon.nombre,
      logoUrl: limpiaUrl(salon.logoUrl),
      sitioUrl: limpiaUrl(salon.sitioUrl),
    },
    evento:
      evento || opciones?.datosEvento
        ? {
            nombre: opciones?.datosEvento?.nombre,
            fechaISO: opciones?.datosEvento?.fechaISO,
            monograma: evento?.monograma,
            frase: evento?.frase,
            portadaUrl: limpiaUrl(evento?.portadaUrl),
          }
        : undefined,
    colores: { primario, primarioTexto, acento, acentoTexto, fondo, tinta },
    radio: esRadioSeguro(salon.radio) ? salon.radio.trim() : undefined,
    fuentes: parejaDe(evento?.fuentes ?? salon.fuentes).clave,
    esquema: salon.esquema === "oscuro" ? "oscuro" : "claro",
    origen: opciones?.origen ?? "servidor",
  };
}
