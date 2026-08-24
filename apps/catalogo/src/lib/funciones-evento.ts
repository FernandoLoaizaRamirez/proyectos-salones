/**
 * ENCENDER Y APAGAR EXPERIENCIAS DE UN EVENTO, una por una.
 *
 * Hasta aquí el panel solo tenía UN interruptor: el "Paquete Todo Incluido",
 * que prendía cuatro funciones de golpe (ver `paquete-evento.ts`, que sigue
 * vivo como atajo). Pero el modelo comercial necesita lo contrario: que un
 * salón venda un plan Básico con tres experiencias y otro Premium con nueve,
 * sin que nadie toque la base de datos.
 *
 * Esto escribe en `event_overrides`, el mismo lugar de siempre, con las mismas
 * dos reglas duramente aprendidas:
 *
 *   · ENCENDER = upsert (no duplica ni se queja si ya estaba).
 *   · APAGAR   = BORRAR la fila, no ponerla en `false`. Sin fila, el evento
 *     vuelve a lo que diga su plan, que es la verdad de fondo. Un `false`
 *     regado dejaría la función apagada A PROPÓSITO para siempre, y el día que
 *     entre al plan ese `false` ganaría (el override del evento manda) y nadie
 *     entendería por qué a esa boda le falta el photobooth.
 *
 * ⚠️ Y UN BORRADO QUE LA RLS NIEGA NO DA ERROR: la política filtra las filas y
 * PostgREST contesta tan campante "borré cero". Por eso, tras apagar, se
 * RELEE — si la fila sigue ahí, es que no se pudo.
 *
 * Quién puede escribir NO lo decide este archivo: lo decide la base (RLS
 * `ov_wr_admin` de la 0008 — dueño o admin del salón).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CARACTERISTICAS_CONOCIDAS,
  FEATURES_CONOCIDAS,
  moduloDe,
} from "@salones/core";

/** La tabla donde vive el encendido por evento (plano de control, 0002). */
const TABLA = "event_overrides";

/** Una experiencia que el salón puede vender por evento. */
export type Experiencia = {
  clave: string;
  nombre: string;
  /** Qué deja de ver el invitado si se apaga. */
  descripcion: string;
  /** Los detalles vendibles DENTRO de esta experiencia. */
  caracteristicas: { clave: string; nombre: string; descripcion: string }[];
};

/**
 * LAS EXPERIENCIAS DEL INVITADO, en el orden de la historia de la fiesta (el
 * mismo del portal). `video` NO está aquí: es el paquete de pago aparte, con su
 * propio candado en el servidor (0017), y meterlo en esta lista lo regalaría.
 */
export const EXPERIENCIAS: Experiencia[] = [
  {
    clave: FEATURES_CONOCIDAS.Invitacion,
    nombre: "Invitación digital",
    descripcion: "La invitación del evento, con fecha, mapa e itinerario.",
    caracteristicas: [],
  },
  {
    clave: FEATURES_CONOCIDAS.Rsvp,
    nombre: "Confirmar asistencia",
    descripcion: "Los invitados dicen si vienen y cuántos serán.",
    caracteristicas: [],
  },
  {
    clave: FEATURES_CONOCIDAS.Mesas,
    nombre: "Mi mesa",
    descripcion: "Cada quien encuentra dónde se sienta.",
    caracteristicas: [],
  },
  {
    clave: FEATURES_CONOCIDAS.Album,
    nombre: "Álbum de fotos",
    descripcion: "Las fotos de todos los invitados, juntas.",
    caracteristicas: [
      {
        clave: CARACTERISTICAS_CONOCIDAS.AlbumDescargas,
        nombre: "Descargar todo",
        descripcion: "El invitado puede bajarse el álbum completo.",
      },
    ],
  },
  {
    clave: FEATURES_CONOCIDAS.Muro,
    nombre: "Muro de mensajes",
    descripcion: "El libro de firmas, en el teléfono.",
    caracteristicas: [
      {
        clave: CARACTERISTICAS_CONOCIDAS.MuroFotos,
        nombre: "Adjuntar foto",
        descripcion: "Además del mensaje, dejar una foto.",
      },
    ],
  },
  {
    clave: FEATURES_CONOCIDAS.Playlist,
    nombre: "Playlist",
    descripcion: "Los invitados piden canciones al DJ.",
    caracteristicas: [
      {
        clave: CARACTERISTICAS_CONOCIDAS.PlaylistVotos,
        nombre: "Votar canciones",
        descripcion: "Sin esto, las canciones solo se piden.",
      },
    ],
  },
  {
    clave: FEATURES_CONOCIDAS.Dinamicas,
    nombre: "Dinámicas y juegos",
    descripcion: "Trivia, bingo y rompehielos.",
    caracteristicas: [
      {
        clave: CARACTERISTICAS_CONOCIDAS.DinamicasRanking,
        nombre: "Ranking",
        descripcion: "La tabla de posiciones de los juegos.",
      },
    ],
  },
  {
    clave: FEATURES_CONOCIDAS.Photobooth,
    nombre: "Photobooth",
    descripcion: "Fotos con los marcos del evento.",
    caracteristicas: [],
  },
  {
    clave: FEATURES_CONOCIDAS.Brindis,
    nombre: "Brindis en video",
    descripcion: "Mensajes grabados para los festejados.",
    caracteristicas: [],
  },
];

/** Todas las claves que este panel administra (experiencias + características). */
export const CLAVES_ADMINISTRABLES: string[] = EXPERIENCIAS.flatMap((e) => [
  e.clave,
  ...e.caracteristicas.map((c) => c.clave),
]);

/** Una fila de `event_overrides`, tal como viaja entre la base y la pantalla. */
export type OverrideEvento = { feature_clave: string; habilitado: boolean };

/**
 * Los overrides del evento, solo de las claves que este panel administra. Si la
 * consulta falla (sin permiso, sin red) devuelve lista vacía: la pantalla lo
 * lee como "lo que diga el plan", que es el lado prudente.
 */
export async function leerOverrides(
  supabase: SupabaseClient,
  eventId: string,
): Promise<OverrideEvento[]> {
  const { data, error } = await supabase
    .from(TABLA)
    .select("feature_clave,habilitado")
    .eq("event_id", eventId)
    .in("feature_clave", CLAVES_ADMINISTRABLES);
  if (error) return [];
  return (data ?? []) as OverrideEvento[];
}

/**
 * Cómo se ve una clave para la pantalla:
 *   · "encendida"  — hay override en true.
 *   · "apagada"    — hay override en false (alguien la apagó a mano por SQL).
 *   · "del-plan"   — no consta: manda lo que traiga el plan del salón.
 */
export type EstadoClave = "encendida" | "apagada" | "del-plan";

export function estadoDe(overrides: OverrideEvento[], clave: string): EstadoClave {
  const fila = overrides.find((o) => o.feature_clave === clave);
  if (!fila) return "del-plan";
  return fila.habilitado ? "encendida" : "apagada";
}

/** Enciende una clave para este evento (upsert). */
export async function encender(
  supabase: SupabaseClient,
  eventId: string,
  clave: string,
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLA)
    .upsert(
      { event_id: eventId, feature_clave: clave, habilitado: true },
      { onConflict: "event_id,feature_clave" },
    );
  return !error;
}

/**
 * Apaga una clave BORRANDO su fila, y comprueba que de verdad se fue.
 *
 * Apagar una EXPERIENCIA no toca sus características: gracias a la herencia
 * (`tieneCaracteristica`), sin el módulo encendido ninguna de ellas se enciende
 * sola, y si mañana el salón vuelve a encender la experiencia recupera los
 * detalles que había elegido.
 */
export async function apagar(
  supabase: SupabaseClient,
  eventId: string,
  clave: string,
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLA)
    .delete()
    .eq("event_id", eventId)
    .eq("feature_clave", clave);
  if (error) return false;

  // La RLS filtra en silencio: hay que releer para saber si se borró de verdad.
  const { data } = await supabase
    .from(TABLA)
    .select("feature_clave")
    .eq("event_id", eventId)
    .eq("feature_clave", clave);
  return (data ?? []).length === 0;
}

/** ¿Esta clave es un detalle dentro de una experiencia? */
export function claveEsDetalle(clave: string): boolean {
  return moduloDe(clave) !== clave;
}
