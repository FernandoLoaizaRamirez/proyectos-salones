/**
 * Branding por salón: tema en runtime, sin recompilar.  (CAPA DE COMPATIBILIDAD)
 *
 * Desde el rediseño, el motor real vive en `src/tema/` (resolverTema +
 * temaAVariables + TemaScope): fusiona salón y evento, deriva la superficie y
 * los textos, y sanea los colores. Este archivo queda como el puente para los
 * call-sites históricos (portal, preview del panel), que migran a `TemaScope`
 * en su propia fase:
 *
 *   · `BrandingSalon` ahora ES `TemaSalon` (superconjunto compatible: todos
 *     los campos viejos siguen ahí con el mismo significado).
 *   · `brandingAVariables` conserva su contrato exacto: solo variables de los
 *     campos presentes, colores envueltos para leerse en ambos temas.
 */
import type { TemaSalon } from "./tema/tipos";
import { legibleEnAmbosTemas } from "./tema/variables";

/** El nombre histórico del tema de un salón. Hoy es un alias de `TemaSalon`. */
export type BrandingSalon = TemaSalon;

/**
 * Convierte un `BrandingSalon` en las variables CSS del tema (el contrato
 * histórico: primario/acento/radio).
 *
 * @deprecated Migra a `resolverTema` + `TemaScope`. Este camino se retira
 * cuando el portal y el panel terminen su fase del rediseño (Fases 2 y 5 del
 * plan): ya DIVERGE del motor nuevo a sabiendas — aquí `--accent` se emite a
 * pelo (ilegible en oscuro) y no hay superficie ni tipografía. No le añadas
 * capacidades: cualquier mejora va en `tema/`.
 */
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
