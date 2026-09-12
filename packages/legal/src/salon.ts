/**
 * Los datos legales DE UN SALÓN concreto, armados desde la base.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO: hasta el 29 ago 2026 los datos del responsable
 * vivían en una CONSTANTE de `apps/catalogo/src/lib/legal.ts` con el salón de
 * demostración dentro — y con el correo y el domicilio PERSONALES de quien
 * mantiene el proyecto. Publicado así, el aviso de privacidad de un cliente
 * real habría nombrado responsable a otro salón. Ahora cada salón guarda los
 * suyos (`tenant_legal`, migración 0033) y este módulo los traduce a los
 * `DatosLegales` que los tres documentos ya sabían comer desde julio.
 *
 * LA REGLA QUE ORDENA TODO: el SALÓN es el responsable y el proveedor es el
 * encargado. Por eso `proveedor` y `sitio` NUNCA salen de la base — son del
 * código, iguales para los 20 salones — y `salon`, `domicilio` y `contacto`
 * NUNCA salen del código.
 */
import type { DatosLegales } from "./index";
import { SIN_RELLENAR } from "./index";

/**
 * Lo que devuelve `evento-config?...&legal=1`. Todo opcional y admitiendo
 * `null` porque describe una FRONTERA (una respuesta de red), igual que
 * `TemaSalon` en @salones/ui: aquí no se confía, se comprueba.
 */
export type FilaLegalSalon = {
  salon?: string | null;
  domicilio?: string | null;
  contacto?: string | null;
  diasConservacion?: number | null;
  actualizado?: string | null;
  estado?: "publicado" | "incompleto" | null;
};

/**
 * El nombre que se usa cuando NO sabemos de qué salón hablamos.
 *
 * ⚠️ NO USAR `SIN_RELLENAR` AQUÍ, y esto es un candado, no una preferencia:
 * `avisoPrivacidad()` interpola `d.salon` EN CRUDO (solo `domicilio` y
 * `contacto` pasan por `falta()`). Con `SIN_RELLENAR` la página publicaría
 * «PENDIENTE es el responsable del tratamiento» y «habla con el personal de
 * PENDIENTE» — la reincidencia literal del incidente que `SIN_RELLENAR`
 * memoriza, y justo en la URL que enlazan las 14 apps ya desplegadas.
 *
 * Se eligió «tu salón anfitrión» porque encaja en las QUINCE interpolaciones
 * sin tocar un solo texto («en los eventos de tu salón anfitrión»,
 * «entregárselo a tu salón anfitrión», «el personal de tu salón anfitrión») y
 * porque JAMÁS nombra a una persona como responsable.
 */
export const MODELO_SALON = "tu salón anfitrión";

/** La fecha de los TEXTOS (no la de los datos de un salón). */
export const ACTUALIZADO_TEXTOS = "22 de agosto de 2026";

/** '2026-08-22T…' → '22 de agosto de 2026'. Nunca devuelve 'Invalid Date'. */
export function fechaLegible(iso?: string | null): string {
  if (!iso) return ACTUALIZADO_TEXTOS;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return ACTUALIZADO_TEXTOS;
  try {
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(d);
  } catch {
    return ACTUALIZADO_TEXTOS;
  }
}

const limpio = (v?: string | null): string | undefined => {
  const t = typeof v === "string" ? v.trim() : "";
  return t && t !== SIN_RELLENAR ? t : undefined;
};

/**
 * Traduce la fila de un salón a los `DatosLegales` de los tres documentos.
 *
 * El reparto es deliberado:
 *  · `salon` que falte → MODELO_SALON (nunca SIN_RELLENAR: ver arriba).
 *  · `contacto` y `domicilio` que falten → SIN_RELLENAR, que es exactamente lo
 *    que `falta()` sabe esquivar desde julio, escribiendo el texto honesto
 *    («pídelo en la recepción», «díselo al personal») en vez de un hueco.
 *  · `proveedor` y `sitio` SIEMPRE del código.
 */
export function datosDelSalon(
  fila: FilaLegalSalon | null | undefined,
  proveedor: { nombre: string; sitio: string },
): DatosLegales {
  const dias = fila?.diasConservacion;
  return {
    salon: limpio(fila?.salon) ?? MODELO_SALON,
    contacto: limpio(fila?.contacto) ?? SIN_RELLENAR,
    domicilio: limpio(fila?.domicilio) ?? SIN_RELLENAR,
    proveedor: proveedor.nombre,
    sitio: proveedor.sitio,
    actualizado: fila?.actualizado ? fechaLegible(fila.actualizado) : ACTUALIZADO_TEXTOS,
    ...(typeof dias === "number" && dias > 0 ? { diasConservacion: dias } : {}),
  };
}

/** El documento MODELO: el que ve quien llega sin código de evento. */
export function modelo(proveedor: { nombre: string; sitio: string }): DatosLegales {
  return datosDelSalon(null, proveedor);
}

/**
 * Qué le falta a un salón para poder publicar.
 *
 * Es la MISMA regla que el CHECK `tl_publicado_completo` de la 0033, escrita
 * dos veces A PROPÓSITO: una para negarse (Postgres, que es quien manda porque
 * PostgREST es público) y otra para explicar (la pantalla del panel).
 */
export function estadoLegal(fila?: FilaLegalSalon | null): {
  pendientes: string[];
  completo: boolean;
} {
  const pendientes: string[] = [];
  if (!limpio(fila?.salon)) pendientes.push("la razón social");
  if (!limpio(fila?.domicilio)) pendientes.push("el domicilio");
  const correo = limpio(fila?.contacto);
  if (!correo) pendientes.push("el correo de contacto");
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) pendientes.push("un correo válido");
  return { pendientes, completo: pendientes.length === 0 };
}
