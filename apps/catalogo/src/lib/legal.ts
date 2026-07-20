/**
 * Datos que rellenan los documentos legales de ESTE salón.
 *
 * ⚠️  LEE ESTO ANTES DE PUBLICAR:
 *
 *  1. Los textos son BORRADORES. Descríben con honestidad lo que el sistema
 *     hace, pero **no los ha revisado un abogado**. Antes de firmar un cliente
 *     real, que los revise uno. Ver docs/LEGAL.md.
 *
 *  2. El RESPONSABLE de los datos es el SALÓN, no tú. Por eso `salon`,
 *     `domicilio` y `contacto` son los del salón. Si pones los tuyos, estarías
 *     asumiendo una responsabilidad legal que le corresponde a tu cliente.
 *
 *  3. Mientras queden datos por rellenar (los `PENDIENTE`), las páginas legales
 *     muestran un aviso bien visible en vez de fingir que están terminadas.
 *     Es a propósito: un aviso de privacidad sin responsable identificado no
 *     sirve de nada, y es peor publicarlo a medias que no publicarlo.
 */
import type { DatosLegales } from "@salones/legal";
import { vendedor } from "./catalogo";

/** Marca de "esto todavía hay que rellenarlo". */
export const PENDIENTE = "PENDIENTE";

export const datosLegales: DatosLegales = {
  // ---- Del SALÓN (el responsable de los datos) ----------------------------
  // Con el salón de demostración puesto, para que las páginas se puedan ver.
  // Al dar de alta un cliente real, aquí van SUS datos.
  salon: "Hacienda Santa Renata",
  // CAMBIA esto: el correo donde el salón atiende las peticiones de los invitados.
  contacto: PENDIENTE,
  // CAMBIA esto: el domicilio fiscal o comercial del salón. La ley lo exige.
  domicilio: PENDIENTE,

  // ---- Del PROVEEDOR (tú, el encargado) ----------------------------------
  proveedor: vendedor.nombre,
  sitio: "https://suite-salones.vercel.app/legal",

  actualizado: "20 de julio de 2026",
};

/** Los campos que siguen sin rellenar. Vacío = listo para publicar. */
export function camposPendientes(d: DatosLegales = datosLegales): string[] {
  const etiquetas: Record<string, string> = {
    salon: "nombre del salón",
    contacto: "correo de contacto",
    domicilio: "domicilio del salón",
    proveedor: "nombre del proveedor",
    sitio: "dirección del sitio",
    actualizado: "fecha de actualización",
  };
  return Object.entries(d)
    .filter(([, valor]) => !valor || valor === PENDIENTE)
    .map(([campo]) => etiquetas[campo] ?? campo);
}
