/**
 * EL PAQUETE DEL EVENTO — encender "Todo Incluido" a mano, desde el panel.
 *
 * Mientras el cobro en línea siga apagado (PAGOS_ACTIVOS = false) no hay ningún
 * webhook que encienda funciones al pagar: el salón cierra el trato por
 * WhatsApp, cobra por fuera y alguien tiene que encender las experiencias del
 * portal en ESE evento. Eso es lo que hace este archivo.
 *
 * Se escribe en `event_overrides` (una fila por función), que es el mismo lugar
 * donde la migración 0020 encendió las cuatro del evento demo. El portal las lee
 * por medio de `evento-config` y el override del EVENTO gana sobre el plan, así
 * que encender aquí surte efecto sin tocar planes ni suscripciones.
 *
 * Quién puede escribir NO lo decide este archivo: lo decide la base. La RLS de
 * la 0008 (`ov_wr_admin`) solo deja escribir al dueño o a un admin del salón, y
 * al resto del staff le deja mirar (`ov_sel_staff`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { FEATURES_CONOCIDAS } from "@salones/core";

/**
 * Las cuatro funciones del "Paquete Todo Incluido" que HOY se encienden por
 * evento. Es la traducción operativa de una decisión comercial: el paquete del
 * catálogo incluye las cuatro experiencias nuevas del portal, y mientras el
 * cobro en línea esté apagado, "incluido" significa "alguien le da al
 * interruptor en el panel".
 *
 * Las otras funciones del plan gestionado (muro, playlist, rsvp, dinámicas,
 * álbum y sync-colectivo) NO van aquí: esas ya vienen con el plan y encenderlas
 * de nuevo por evento no cambiaría nada.
 *
 * Y `video` tampoco, aunque también se venda: es el PAQUETE DE VIDEO, se cobra
 * aparte y tiene su propio candado en el servidor (migración 0017). Meterlo en
 * este interruptor lo regalaría con el paquete, y un solo video pesa como cien
 * fotos del mismo cajón de almacenamiento.
 */
export const FUNCIONES_PAQUETE_TODO: string[] = [
  FEATURES_CONOCIDAS.Invitacion,
  FEATURES_CONOCIDAS.Mesas,
  FEATURES_CONOCIDAS.Photobooth,
  FEATURES_CONOCIDAS.Brindis,
];

/** Una fila de `event_overrides`, tal como viaja entre la base y la pantalla. */
export type OverrideEvento = {
  feature_clave: string;
  habilitado: boolean;
};

/** Cómo está el paquete en este evento. */
export type EstadoPaquete = "encendido" | "apagado" | "parcial";

/** La tabla donde vive el encendido por evento (plano de control, 0002). */
const TABLA = "event_overrides";

/**
 * Resume las filas del evento en una sola palabra para la pantalla.
 *
 * "parcial" existe porque el mundo real se queda a medias: una escritura que
 * falló a la mitad, alguien que apagó una función suelta con SQL, o una
 * migración vieja. Enseñarlo como "encendido" haría que el salón creyera que su
 * cliente tiene las cuatro cuando el portal solo le enseña dos.
 */
export function estadoPaqueteTodo(overrides: OverrideEvento[]): EstadoPaquete {
  const encendidas = FUNCIONES_PAQUETE_TODO.filter((clave) =>
    overrides.some((o) => o.feature_clave === clave && o.habilitado === true),
  ).length;
  if (encendidas === FUNCIONES_PAQUETE_TODO.length) return "encendido";
  if (encendidas === 0) return "apagado";
  return "parcial";
}

/**
 * Las filas del paquete que tiene este evento. Solo las cuatro claves: lo que
 * haya en `event_overrides` de otras funciones (el video de pago, por ejemplo)
 * no es asunto de este interruptor y no debe llegar a `estadoPaqueteTodo`.
 *
 * Si la consulta falla (sin permiso, sin red, migración sin aplicar) devuelve
 * una lista vacía, que la pantalla lee como "apagado": es el lado prudente, el
 * que no promete funciones que el invitado no vería.
 */
export async function leerOverridesEvento(
  supabase: SupabaseClient,
  eventId: string,
): Promise<OverrideEvento[]> {
  const { data, error } = await supabase
    .from(TABLA)
    .select("feature_clave,habilitado")
    .eq("event_id", eventId)
    .in("feature_clave", FUNCIONES_PAQUETE_TODO);
  if (error) return [];
  return (data ?? []) as OverrideEvento[];
}

/**
 * Enciende las cuatro. Es un "mete o actualiza" por la llave primaria
 * (event_id, feature_clave): volver a encender un paquete ya encendido no
 * duplica filas ni se queja, y un paquete a medias queda completo.
 *
 * Devuelve false —sin lanzar— cuando la base dice que no: quien llama decide qué
 * enseñarle al salón. El caso más común es la RLS de la 0008 con un usuario de
 * rol `staff`, que puede mirar los overrides pero no cambiarlos.
 */
export async function encenderPaqueteTodo(
  supabase: SupabaseClient,
  eventId: string,
): Promise<boolean> {
  const filas = FUNCIONES_PAQUETE_TODO.map((clave) => ({
    event_id: eventId,
    feature_clave: clave,
    habilitado: true,
  }));
  const { error } = await supabase
    .from(TABLA)
    .upsert(filas, { onConflict: "event_id,feature_clave" });
  return !error;
}

/**
 * Apaga el paquete BORRANDO las cuatro filas, no poniéndolas en false.
 *
 * Sin fila, el evento vuelve a lo que diga su plan, que es la verdad de fondo;
 * con un `false` regado, el evento queda con la función apagada A PROPÓSITO para
 * siempre, y el día que el paquete entre al plan gestionado ese "false" ganaría
 * (el override del evento manda) y nadie entendería por qué a esa boda le falta
 * el photobooth.
 */
export async function apagarPaqueteTodo(
  supabase: SupabaseClient,
  eventId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLA)
    .delete()
    .eq("event_id", eventId)
    .in("feature_clave", FUNCIONES_PAQUETE_TODO);
  if (error) return false;
  /*
   * ⚠️ UN BORRADO QUE LA RLS NIEGA NO DA ERROR: la política filtra las filas y
   * PostgREST contesta tan campante "borré cero". Si nos quedáramos con el
   * `!error`, un usuario de rol `staff` vería "listo, apagado" y el portal
   * seguiría enseñando las cuatro experiencias. Por eso se le pregunta a la
   * base cómo quedó, en vez de creerle a la respuesta.
   *
   * La relectura va aquí y no por `leerOverridesEvento` a propósito: aquella
   * se traga los errores y devuelve lista vacía —lo prudente para PINTAR—, y
   * aquí eso sería justo la mentira que queremos evitar (relectura fallida =
   * "no quedó nada" = "apagado"). Si no se puede comprobar, no se afirma.
   */
  const { data, error: errorRelectura } = await supabase
    .from(TABLA)
    .select("feature_clave")
    .eq("event_id", eventId)
    .in("feature_clave", FUNCIONES_PAQUETE_TODO);
  if (errorRelectura) return false;
  return (data ?? []).length === 0;
}
