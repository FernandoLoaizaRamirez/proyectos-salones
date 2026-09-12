/**
 * De dónde salen los datos que rellenan los documentos legales.
 *
 * ⚠️ ANTES AQUÍ HABÍA UNA CONSTANTE, Y ESE ERA EL FALLO (29 ago 2026):
 *   este archivo tenía escritos `salon: "Hacienda Santa Renata"` (el salón de
 *   DEMOSTRACIÓN), el gmail PERSONAL y el DOMICILIO PARTICULAR de quien
 *   mantiene el proyecto — y las 14 apps enlazaban ahí. Verificado en vivo: el
 *   aviso publicado nombraba responsable del tratamiento a un salón inventado
 *   y mandaba a los invitados a escribir a un correo personal. Con un cliente
 *   real eso es una responsabilidad legal que NO es del proveedor: es del
 *   salón.
 *
 * CÓMO FUNCIONA AHORA: los datos del responsable viven en `tenant_legal`
 * (migración 0033), los escribe cada salón desde Panel → Documentos legales, y
 * llegan aquí por `evento-config?...&legal=1`, que los resuelve con
 * service-role. En el CÓDIGO ya no hay datos de nadie.
 *
 * LO QUE SÍ SIGUE EN EL CÓDIGO, y es deliberado: el PROVEEDOR y la dirección
 * del sitio. Son iguales para todos los salones, y sacarlos de la base
 * permitiría que un salón se pusiera a sí mismo como proveedor o se borrara la
 * cláusula de encargado.
 */
import type { DatosLegales } from "@salones/legal";
import { datosDelSalon, estadoLegal, modelo, type FilaLegalSalon } from "@salones/legal";
import { vendedor } from "./catalogo";

/** Dónde viven los documentos publicados. */
export const SITIO_LEGAL = "https://suite-salones.vercel.app/legal";

/**
 * El ENCARGADO. Si algún día hace falta un correo del proveedor, se usa el de
 * negocio (`vendedor.email`), NUNCA uno personal.
 */
export const PROVEEDOR = { nombre: vendedor.nombre, sitio: SITIO_LEGAL };

/** El documento de muestra: el que ve quien llega sin evento. */
export const MODELO: DatosLegales = modelo(PROVEEDOR);

/**
 * En qué estado está el documento que se está enseñando:
 *  · `modelo`     — no sabemos de qué salón hablamos (o la red falló).
 *  · `incompleto` — hay salón, pero todavía no ha publicado sus datos.
 *  · `publicado`  — el salón publicó y el aviso identifica a un responsable.
 */
export type EstadoLegal = "modelo" | "incompleto" | "publicado";

/** Mismo formato de código que el resto de la suite (escrito aquí para no acoplar). */
const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

/**
 * Las vitrinas por visitante (`demo-xxxxxx`) NO viven en `events` — así se
 * diseñó la 0022 — y `evento-config` les contesta 404. Se traducen al evento
 * `demo` para que un prospecto vea el aviso completo de la hacienda de ficción,
 * que es justo lo que se le está vendiendo, y no un genérico.
 */
function normalizar(codigo: string): string {
  return codigo === "demo" || codigo.startsWith("demo-") ? "demo" : codigo;
}

/**
 * Los datos legales del salón de ESTE evento.
 *
 * NUNCA LANZA, y es una decisión, no una precaución: la ley exige que el aviso
 * esté disponible, así que una página legal que no abre es peor que una
 * genérica. Cualquier tropiezo (sin código, código raro, función caída, red
 * muerta, migración sin correr) cae al documento MODELO, que es correcto
 * aunque sea impersonal — y que jamás nombra a una persona como responsable.
 */
export async function datosLegalesDe(
  codigo?: string,
): Promise<{ datos: DatosLegales; estado: EstadoLegal }> {
  // Sin código no se toca la red. Ese camino conserva la promesa vieja de que
  // estas páginas están disponibles aunque la base falle.
  if (!codigo || !CODIGO_VALIDO.test(codigo)) return { datos: MODELO, estado: "modelo" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { datos: MODELO, estado: "modelo" };

  try {
    const e = encodeURIComponent(normalizar(codigo));
    const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/evento-config?e=${e}&legal=1`, {
      headers: {
        apikey: anon,
        // Las llaves nuevas (`sb_publishable_…`) no son JWT y no van como
        // Bearer; las viejas (`eyJ…`) sí. Mismo criterio que @salones/sync.
        ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
      },
      // Se refresca sola cada 5 minutos: cambiar un domicilio NO reconstruye
      // ninguna app. Ese es el precio, y la pantalla del panel lo dice.
      next: { revalidate: 300 },
      // ⚠️ SIN ESTO LA PROMESA DE ABAJO ES FALSA. "No lanzar nunca" no es lo
      // mismo que "estar disponible": una llamada que no contesta no cae al
      // MODELO, se queda esperando, y la página se agota en el límite de
      // Vercel y devuelve 504 — justo en un documento que la ley exige tener
      // disponible. El AbortError lo recoge el catch de abajo.
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return { datos: MODELO, estado: "modelo" };

    const json = (await res.json()) as { legal?: FilaLegalSalon | null };
    const fila = json?.legal;
    if (!fila) return { datos: MODELO, estado: "modelo" };

    return {
      // El `sitio` lleva el código para que el apartado 9 («publicaremos la
      // versión actualizada en …») apunte al aviso de ESTE salón y no al
      // genérico.
      datos: datosDelSalon(fila, { nombre: vendedor.nombre, sitio: `${SITIO_LEGAL}?e=${e}` }),
      estado: fila.estado === "publicado" ? "publicado" : "incompleto",
    };
  } catch {
    return { datos: MODELO, estado: "modelo" };
  }
}

/**
 * Los campos que le faltan a un juego de datos para poder publicarse.
 *
 * Conserva su firma (la usan tres pantallas) pero PIERDE el valor por defecto:
 * antes miraba la constante quemada, así que el panel de cualquier salón veía
 * el estado de Hacienda Santa Renata.
 */
export function camposPendientes(d: DatosLegales): string[] {
  return estadoLegal({ salon: d.salon, domicilio: d.domicilio, contacto: d.contacto }).pendientes;
}
