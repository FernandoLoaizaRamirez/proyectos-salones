/**
 * EVENTOS DEL SALÓN — leer la lista y medir cómo va cada uno.
 *
 * Dos fuentes distintas, a propósito:
 *   • La FICHA del evento (nombre, código, fecha) vive en la tabla `events` del
 *     plano de control y se lee con la sesión del staff: la RLS por tenant
 *     (migración 0008) hace que cada salón vea SOLO sus eventos.
 *   • El CONTENIDO del evento (mensajes, canciones, fotos…) vive en el "lugar
 *     central" y se lee con `@salones/sync` usando el CÓDIGO del evento, igual
 *     que lo hacen las apps. Aquí solo se cuenta, no se muestra.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { obtenerSync, type ItemSync } from "@salones/sync";

/** Un evento del salón, tal como se guarda en `events`. */
export type EventoFila = {
  id: string;
  codigo: string;
  nombre: string;
  fecha: string | null;
  estado: string;
  creado: string;
  /**
   * La llave privada del anfitrión (migración 0009). Es lo ÚNICO que permite
   * quitar contenido de un evento. Solo la ve el staff del salón, porque la RLS
   * de `events` acota por salón; nunca sale hacia el invitado.
   */
  clave_anfitrion?: string | null;
};

const COLUMNAS = "id,codigo,nombre,fecha,estado,creado";

/**
 * La ficha de UN evento sí trae la llave de anfitrión, porque desde ahí se
 * entrega. La LISTA no: no la necesita, y una llave que no se pide es una llave
 * que no se puede filtrar por accidente (un registro, una captura de pantalla).
 */
const COLUMNAS_FICHA = `${COLUMNAS},clave_anfitrion`;

/**
 * Los eventos del salón, del más nuevo al más viejo. NO filtra por tenant: lo
 * hace la RLS con la identidad del token. Si la 0008 aún no está aplicada (o el
 * usuario no está ligado a un salón), la respuesta viene vacía y quien llama lo
 * cuenta como "todavía no hay eventos".
 */
export async function listarEventos(supabase: SupabaseClient): Promise<EventoFila[]> {
  const { data, error } = await supabase
    .from("events")
    .select(COLUMNAS)
    .order("creado", { ascending: false });
  if (error) return [];
  return (data ?? []) as EventoFila[];
}

/** Un evento por su código (la RLS solo deja ver los del propio salón). */
export async function obtenerEvento(
  supabase: SupabaseClient,
  codigo: string,
): Promise<EventoFila | null> {
  const { data, error } = await supabase
    .from("events")
    .select(COLUMNAS_FICHA)
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) return null;
  return (data as EventoFila | null) ?? null;
}

/* ------------------------------------------------------------------ */
/* Cómo va el evento                                                   */
/* ------------------------------------------------------------------ */

/**
 * Confirmación de asistencia tal como la guardan el portal y la app de RSVP.
 * `nombre` solo viene en las que llegaron por el enlace general del evento (ahí
 * el id no está en la lista del anfitrión, así que el nombre es lo único que
 * identifica a quien contestó).
 */
export type RespuestaItem = ItemSync & {
  estado?: string;
  personas?: number;
  nombre?: string;
  fecha?: number;
};

type Respuesta = RespuestaItem;

/** La colección donde viven las confirmaciones (la misma que usan las apps). */
export const COLECCION_RESPUESTAS = "respuestas";

/** Números de un evento, para el panel del anfitrión. */
export type ResumenEvento = {
  mensajes: number;
  canciones: number;
  fotos: number;
  jugadores: number;
  /** Invitaciones que dijeron que sí. */
  confirmados: number;
  /** Personas que suman esas confirmaciones (lo que importa para el banquete). */
  personas: number;
};

export const RESUMEN_VACIO: ResumenEvento = {
  mensajes: 0,
  canciones: 0,
  fotos: 0,
  jugadores: 0,
  confirmados: 0,
  personas: 0,
};

/** Cuenta confirmaciones y personas de una lista de respuestas. */
export function contarConfirmaciones(items: Respuesta[]): { confirmados: number; personas: number } {
  const sies = items.filter((r) => r.estado === "confirmado");
  return {
    confirmados: sies.length,
    personas: sies.reduce((suma, r) => suma + (typeof r.personas === "number" ? r.personas : 0), 0),
  };
}

/**
 * Lee de una sola pasada cuánto lleva el evento en cada módulo.
 *
 * Usa `listar` (una consulta por colección) en vez de `suscribir`: el panel se
 * refresca cada tantos segundos y con el botón de actualizar. Suscribir cinco
 * colecciones dejaría el sondeo de 3 s corriendo en cinco frentes, y para unos
 * contadores no hace falta.
 *
 * Si una colección falla (red, permisos), cuenta 0 en vez de tumbar el panel.
 */
export async function medirEvento(codigo: string): Promise<ResumenEvento> {
  const sync = obtenerSync();
  const leer = async (coleccion: string): Promise<ItemSync[]> => {
    try {
      return await sync.listar(codigo, coleccion);
    } catch {
      return [];
    }
  };

  const [mensajes, canciones, fotos, ranking, respuestas] = await Promise.all([
    leer("mensajes"),
    leer("canciones"),
    leer("fotos"),
    leer("ranking"),
    leer("respuestas"),
  ]);

  return {
    mensajes: mensajes.length,
    canciones: canciones.length,
    fotos: fotos.length,
    jugadores: ranking.length,
    ...contarConfirmaciones(respuestas as Respuesta[]),
  };
}

/** El contador que le toca a cada pantalla, ya con su etiqueta. */
export function contadorDe(
  coleccion: string,
  r: ResumenEvento,
): { valor: number; etiqueta: string } {
  switch (coleccion) {
    case "mensajes":
      return { valor: r.mensajes, etiqueta: r.mensajes === 1 ? "mensaje" : "mensajes" };
    case "canciones":
      return { valor: r.canciones, etiqueta: r.canciones === 1 ? "canción" : "canciones" };
    case "fotos":
      return { valor: r.fotos, etiqueta: r.fotos === 1 ? "recuerdo" : "recuerdos" };
    case "ranking":
      return { valor: r.jugadores, etiqueta: r.jugadores === 1 ? "jugador" : "jugadores" };
    case "respuestas":
      return { valor: r.confirmados, etiqueta: r.confirmados === 1 ? "confirmó" : "confirmaron" };
    default:
      return { valor: 0, etiqueta: "" };
  }
}
