/**
 * El BRINDIS en el "lugar central" — por la costura común de la suite.
 *
 * Antes esta app hablaba con Supabase por su cuenta: el SDK oficial, un proyecto
 * DISTINTO al del resto, su propio cajón (`brindis`) y las llaves escritas en el
 * código. Ahora usa `@salones/sync`, igual que el muro, la playlist, el RSVP o
 * el álbum, con el mismo interruptor automático:
 *
 *   - SIN variables de entorno → modo LOCAL: el brindis se queda en el teléfono
 *     del invitado (galería con IndexedDB) y se comparte por WhatsApp.
 *   - CON variables de entorno → modo SERVIDOR: cada video sube al
 *     almacenamiento central y aparece en la galería del anfitrión (/galeria).
 *
 * Y cada evento vive en su propia burbuja: el código del enlace
 * (`?e=boda-garcia-x7k2`) separa los brindis de una boda de los de otra. Sin
 * `?e=` se usa el evento `demo`, el de las vitrinas públicas.
 *
 * Ver docs/SERVICIO-GESTIONADO.md y packages/sync/src/index.ts.
 */
import { obtenerSync } from "@salones/sync";
import { extensionDe } from "@/lib/brindis";

/** Colección donde se anotan los brindis de un evento (tabla `items`). */
export const COLECCION_BRINDIS = "brindis";

/**
 * Tope del cajón central: 25 MB. Lo pone el propio servidor
 * (`file_size_limit` del bucket `media`, ver docs/SERVICIO-GESTIONADO.md), así
 * que si cambia allá hay que cambiarlo aquí.
 *
 * Con la calidad que fija `VIDEO_BPS`, un brindis del largo máximo pesa ~14 MB
 * y nunca debería acercarse. Pero la calidad es solo una SUGERENCIA al
 * navegador y algunos (Safari en iPhone) la ignoran, así que se revisa antes de
 * subir: más vale un aviso claro aquí que un error del servidor a media fiesta.
 */
export const LIMITE_BYTES = 25 * 1024 * 1024;

/** Peso en MB, redondeado, para los mensajes al invitado. */
function enMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(0);
}

/** Un brindis ya subido al lugar central. */
export type BrindisSubido = {
  id: string;
  url: string;
  mime: string;
  fecha: number;
};

/**
 * El cajón central solo acepta `image/*` y `video/*`, y MediaRecorder entrega
 * tipos con los codecs pegados ("video/mp4;codecs=avc1.42E01E,mp4a.40.2"). Se
 * manda el tipo limpio para que el candado del cajón lo reconozca.
 */
function tipoLimpio(mime: string): string {
  return `video/${extensionDe(mime)}`;
}

/** Nombre con el que se descarga un brindis desde la galería. */
export function nombreArchivo(v: BrindisSubido): string {
  return `brindis-${v.id}.${extensionDe(v.mime)}`;
}

/**
 * Mismo criterio que `eventoActual()` de @salones/sync: solo letras, números y
 * guiones. Lo usa la API del video recuerdo, que recibe el código por la red.
 */
export function codigoValido(evento: string): boolean {
  return /^[a-z0-9-]{1,60}$/i.test(evento);
}

/** Del más nuevo al más viejo. */
export function ordenarBrindis(items: BrindisSubido[]): BrindisSubido[] {
  return [...items].sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0));
}

/**
 * Sube un brindis al evento indicado: el video va al almacenamiento central y
 * queda anotado en la colección, para que la galería del anfitrión lo vea.
 */
export async function subirBrindis(
  evento: string,
  blob: Blob,
  mime: string,
): Promise<{ ok: boolean; error?: string }> {
  if (blob.size > LIMITE_BYTES) {
    return {
      ok: false,
      // Se inserta dentro de "No se pudo enviar (…)", por eso va en minúscula y
      // sin punto final.
      error: `pesa ${enMB(blob.size)} MB y el máximo son ${enMB(LIMITE_BYTES)} MB; graba uno más corto`,
    };
  }
  try {
    const sync = obtenerSync();
    const tipo = tipoLimpio(mime);
    const url = await sync.subirArchivo(evento, `brindis.${extensionDe(mime)}`, blob, tipo);
    await sync.guardar<BrindisSubido>(evento, COLECCION_BRINDIS, {
      id: "B-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      url,
      mime: tipo,
      fecha: Date.now(),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo subir el video." };
  }
}

/** Lista los brindis de un evento, del más nuevo al más viejo. */
export async function listarBrindis(evento: string): Promise<BrindisSubido[]> {
  const items = await obtenerSync().listar<BrindisSubido>(evento, COLECCION_BRINDIS);
  return ordenarBrindis(items);
}
