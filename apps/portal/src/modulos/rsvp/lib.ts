/**
 * MÓDULO RSVP (dentro del portal) — datos y utilidades.
 *
 * Quinto y último módulo del invitado. Habla con el "lugar central" por
 * `@salones/sync` usando la MISMA colección que la app `rsvp` original
 * ("respuestas"), así el tablero del anfitrión ve las confirmaciones del portal
 * igual que las de siempre (strangler-fig). El TABLERO del anfitrión (lista de
 * invitados, envío de enlaces) sigue en su app hasta migrarlo.
 *
 * Este módulo es distinto a los demás: el RSVP está atado a la IDENTIDAD del
 * invitado, y el portal es un enlace general para todo el evento. Por eso admite
 * dos modos:
 *
 *   1. CON INVITACIÓN PERSONAL — el enlace trae los datos del invitado en el
 *      fragmento (`…/rsvp?e=CODIGO#<datos>`, igual que la app original). Se le
 *      saluda por su nombre y solo puede confirmar hasta sus cupos. La respuesta
 *      se guarda con SU id, así que cae en su renglón del tablero.
 *   2. ABIERTO — quien llega por el enlace general del evento escribe su nombre.
 *      La respuesta se guarda con un id propio (`RS-…`) y el nombre dentro, para
 *      que el anfitrión sepa quién es aunque no estuviera en su lista.
 *
 * El fragmento (`#`) NUNCA viaja al servidor: los datos del invitado se quedan
 * en su teléfono. Es el mismo truco de la app original y conviene conservarlo.
 */
import { EstadoRSVP } from "@salones/core";

export { EstadoRSVP };
export type Estado = (typeof EstadoRSVP)[keyof typeof EstadoRSVP];

/** Colección compartida en el lugar central (la misma que usa `apps/rsvp`). */
export const COLECCION_RESPUESTAS = "respuestas";

/** Un invitado de la lista del anfitrión (llega codificado en el enlace). */
export type Invitado = { id: string; nombre: string; cupos: number };

/**
 * Una respuesta tal como viaja en la colección. `nombre` es AÑADIDO por el
 * portal (la app original no lo manda ni lo necesita: ella ya conoce el nombre
 * por el id). Los campos de más se ignoran solos, así que ambas conviven.
 */
export type RespuestaItem = {
  id: string;
  estado: Estado;
  personas: number;
  nombre?: string;
  fecha?: number;
};

/** Tope de personas cuando no hay invitación personal (no sabemos sus cupos). */
export const MAX_PERSONAS_ABIERTO = 12;

/**
 * Lee los datos del invitado que vienen en el enlace personal. Mismo formato que
 * `codificar()` de `apps/rsvp`: base64 de un JSON con el nombre escapado.
 */
export function decodificarInvitado(datos: string): Invitado | null {
  try {
    const obj = JSON.parse(decodeURIComponent(atob(datos))) as Partial<Invitado>;
    if (typeof obj?.id === "string" && typeof obj?.nombre === "string") {
      const cupos = typeof obj.cupos === "number" && obj.cupos > 0 ? Math.floor(obj.cupos) : 1;
      return { id: obj.id, nombre: obj.nombre, cupos };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Id de una confirmación ABIERTA. El prefijo `RS-` la distingue de los ids de la
 * lista del anfitrión (`IN-…`), para que su tablero pueda separarlas.
 */
export function nuevoIdRespuesta(): string {
  return "RS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Clave de la respuesta de ESTE dispositivo, POR EVENTO. Sirve para dos cosas:
 * recordar qué contestó (y poder cambiarlo) y no crear una confirmación nueva
 * cada vez que vuelve a entrar.
 */
export function claveMiRespuesta(evento: string): string {
  return `portal:rsvp:mi-respuesta:${evento}`;
}

/** Texto amable del número de personas. */
export function personasTexto(n: number): string {
  return n === 1 ? "1 persona" : `${n} personas`;
}
