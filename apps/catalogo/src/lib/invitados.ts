/**
 * INVITADOS de un evento — la lista del anfitrión, ahora en la BASE.
 *
 * Antes vivía en el navegador del anfitrión (localStorage de la app `rsvp`): se
 * perdía al cambiar de dispositivo y era LA MISMA para todos sus eventos. Aquí
 * usa la tabla `guests` (migración 0002), acotada por la RLS del salón (0008):
 * cada evento tiene su lista y la ve cualquiera del staff, desde donde sea.
 *
 * Dos fuentes, cada una con su papel (a propósito, sin duplicar la verdad):
 *   • `guests`      → QUIÉNES están invitados y cuántos cupos tiene cada uno.
 *   • colección
 *     "respuestas"  → QUÉ contestaron. La escriben el portal del invitado y el
 *                     propio anfitrión; se lee con `@salones/sync`.
 * Por eso NO se usa `guests.estado_rsvp`: tener el estado en dos lugares es la
 * receta para que se contradigan.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Un invitado de la lista del anfitrión. */
export type Invitado = {
  id: string;
  nombre: string;
  /** Cuántas personas cubre la invitación. */
  cupos: number;
};

/**
 * ¿La columna `cupos` existe (migración 0011 aplicada)? Se descubre sola en la
 * primera escritura que falle y se recuerda, para no volver a intentarlo. Así el
 * tablero funciona igual antes y después de aplicar la migración: sin ella, toda
 * invitación vale por una persona.
 */
let hayCupos = true;

/** Error de PostgREST cuando se manda una columna que no existe. */
function esColumnaDesconocida(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /cupos/i.test(error.message ?? "") === true
  );
}

/** Fila cruda de `guests` (se pide `*` para tolerar que falte `cupos`). */
type FilaGuest = { id: string; nombre: string; cupos?: number | null; creado?: string };

function aInvitado(fila: FilaGuest): Invitado {
  return {
    id: fila.id,
    nombre: fila.nombre,
    cupos: typeof fila.cupos === "number" && fila.cupos > 0 ? fila.cupos : 1,
  };
}

/** Los invitados de un evento, del más viejo al más nuevo (orden de alta). */
export async function listarInvitados(
  supabase: SupabaseClient,
  eventoId: string,
): Promise<Invitado[]> {
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", eventoId)
    .order("creado", { ascending: true });
  if (error) return [];
  return ((data ?? []) as FilaGuest[]).map(aInvitado);
}

/** Da de alta un invitado. Devuelve el invitado creado, o null si no se pudo. */
export async function crearInvitado(
  supabase: SupabaseClient,
  eventoId: string,
  nombre: string,
  cupos: number,
): Promise<Invitado | null> {
  // La fila se arma como diccionario (y no como objeto literal) para poder
  // incluir `cupos` solo cuando la columna existe.
  const intento = async (conCupos: boolean) => {
    const fila: Record<string, unknown> = { event_id: eventoId, nombre };
    if (conCupos) fila.cupos = cupos;
    return supabase.from("guests").insert(fila).select("*").maybeSingle();
  };

  let { data, error } = await intento(hayCupos);
  if (error && hayCupos && esColumnaDesconocida(error)) {
    // La 0011 aún no está aplicada: se guarda sin cupos y no se reintenta más.
    hayCupos = false;
    ({ data, error } = await intento(false));
  }
  if (error || !data) return null;
  return aInvitado(data as FilaGuest);
}

/** Cambia el nombre o los cupos de un invitado. */
export async function actualizarInvitado(
  supabase: SupabaseClient,
  id: string,
  nombre: string,
  cupos: number,
): Promise<boolean> {
  const intento = async (conCupos: boolean) => {
    const cambios: Record<string, unknown> = { nombre };
    if (conCupos) cambios.cupos = cupos;
    return supabase.from("guests").update(cambios).eq("id", id);
  };

  let { error } = await intento(hayCupos);
  if (error && hayCupos && esColumnaDesconocida(error)) {
    hayCupos = false;
    ({ error } = await intento(false));
  }
  return !error;
}

/** Borra un invitado de la lista (su respuesta se borra aparte, en el sync). */
export async function borrarInvitado(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await supabase.from("guests").delete().eq("id", id);
  return !error;
}

/** ¿Se están guardando los cupos? (falso mientras no se aplique la 0011). */
export function cuposDisponibles(): boolean {
  return hayCupos;
}

/* ------------------------------------------------------------------ */
/* El enlace personal de cada invitado                                 */
/* ------------------------------------------------------------------ */

/**
 * Empaqueta al invitado para su enlace personal. MISMO formato que entienden el
 * módulo RSVP del portal y la app `rsvp`: base64 de un JSON con el nombre
 * escapado. Viaja en el FRAGMENTO (`#`), que nunca llega al servidor.
 */
export function codificarInvitado(inv: Invitado): string {
  return btoa(encodeURIComponent(JSON.stringify({ id: inv.id, nombre: inv.nombre, cupos: inv.cupos })));
}

/**
 * Enlace personal para confirmar. Preferimos el PORTAL (donde ya vive el RSVP);
 * si aún no está configurado, se usa la app `rsvp` de siempre, que entiende
 * exactamente el mismo enlace. Así nunca se queda sin poder invitar.
 */
export function enlaceInvitado(inv: Invitado, codigo: string, baseRsvp: string): string {
  const portal = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  const datos = codificarInvitado(inv);
  const evento = `?e=${encodeURIComponent(codigo)}`;
  if (portal) return `${portal}/rsvp${evento}#${datos}`;
  return baseRsvp ? `${baseRsvp}/confirmar${evento}#${datos}` : "";
}
