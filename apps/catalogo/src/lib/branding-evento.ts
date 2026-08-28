/**
 * LA MARCA DE UN EVENTO: leerla y guardarla desde el panel (`event_branding`).
 *
 * Es la capa 2 de la cascada salón → evento (migración 0025): el color, la
 * portada, el monograma y la frase de UNA boda, encima de la marca del salón.
 * Hasta hoy la única fila la puso la semilla de la demo (0026): vestir un
 * evento real era escribir SQL a mano. Con esto lo hace el salón.
 *
 * QUIÉN LEE Y QUIÉN ESCRIBE LO DECIDE LA BASE, no este archivo: la tabla NO
 * tiene lectura pública (el invitado la recibe ya resuelta por `evento-config`
 * con service-role); el staff del salón dueño la lee con su sesión
 * (`eb_sel_staff`) y solo dueño/admin escriben (`eb_wr_admin`). Si alguien
 * fuerza la interfaz, el servidor responde que no.
 *
 * LA PORTADA es una URL pública (http/https) por ahora: `evento-config` OMITE
 * a propósito las referencias del almacén interno hasta que se conecte la
 * firma con `resolverMedios` (contrato de la 0025). El campo lo dice en
 * pantalla — nada de prometer una subida que aún no existe.
 */
import { obtenerSupabase } from "./supabase";
import type { ResultadoGuardado } from "./branding";

/** La fila de `event_branding`, con los nombres del panel. */
export type MarcaEvento = {
  primario?: string;
  acento?: string;
  /** URL pública (http/https) de la foto de portada del hero. */
  portadaRef?: string;
  monograma?: string;
  frase?: string;
  /** Clave tipográfica de la allowlist; vacía = hereda la del salón. */
  fuentes?: string;
};

const COLUMNAS = "primario, acento, portada_ref, monograma, frase, fuentes";

type Fila = {
  primario: string | null;
  acento: string | null;
  portada_ref: string | null;
  monograma: string | null;
  frase: string | null;
  fuentes: string | null;
};

/**
 * Lee la marca del evento. `null` = SIN FILA (manda la del salón); `"fallo"` =
 * no se pudo leer (red, servidor). La diferencia importa: guardar es un upsert
 * de las seis columnas, y ofrecer Guardar sobre un formulario vacío porque la
 * LECTURA tropezó pisaría con NULL una personalización que sí existe.
 */
export async function obtenerBrandingEvento(
  eventId: string,
): Promise<MarcaEvento | null | "fallo"> {
  const supabase = obtenerSupabase();
  if (!supabase) return "fallo";
  const { data, error } = await supabase
    .from("event_branding")
    .select(COLUMNAS)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) return "fallo";
  if (!data) return null;
  const fila = data as Fila;
  return {
    primario: fila.primario ?? undefined,
    acento: fila.acento ?? undefined,
    portadaRef: fila.portada_ref ?? undefined,
    monograma: fila.monograma ?? undefined,
    frase: fila.frase ?? undefined,
    fuentes: fila.fuentes ?? undefined,
  };
}

/** El mismo traductor de fracasos que la marca del salón (401/42501 → cristiano). */
function traducir(error: { code?: string; message: string }): ResultadoGuardado {
  const codigo = error.code ?? "";
  const sinPermiso =
    codigo === "42501" || codigo === "PGRST301" || /permission|policy/i.test(error.message);
  return { ok: false, motivo: sinPermiso ? "sin-permiso" : "error", detalle: error.message };
}

/**
 * Guarda la marca del evento (upsert por `event_id`). Los campos vacíos van
 * como NULL a propósito: quitar el color devuelve esa perilla al salón.
 */
export async function guardarBrandingEvento(
  eventId: string,
  marca: MarcaEvento,
): Promise<ResultadoGuardado> {
  const supabase = obtenerSupabase();
  if (!supabase) return { ok: false, motivo: "sin-servidor" };

  const oNulo = (v?: string) => (v && v.trim() ? v.trim() : null);

  const { error } = await supabase.from("event_branding").upsert(
    {
      event_id: eventId,
      primario: oNulo(marca.primario),
      acento: oNulo(marca.acento),
      portada_ref: oNulo(marca.portadaRef),
      monograma: oNulo(marca.monograma),
      frase: oNulo(marca.frase),
      fuentes: oNulo(marca.fuentes),
      actualizado: new Date().toISOString(),
    },
    { onConflict: "event_id" },
  );
  return error ? traducir(error) : { ok: true };
}

/**
 * Quita la personalización entera: BORRA la fila y el evento vuelve a vestirse
 * con la marca del salón (el delete es legítimo aquí — así lo documenta la
 * 0025). Se relee para confirmar: la RLS niega en silencio.
 */
export async function quitarBrandingEvento(eventId: string): Promise<ResultadoGuardado> {
  const supabase = obtenerSupabase();
  if (!supabase) return { ok: false, motivo: "sin-servidor" };

  const { error } = await supabase.from("event_branding").delete().eq("event_id", eventId);
  if (error) return traducir(error);

  const { data } = await supabase
    .from("event_branding")
    .select("event_id")
    .eq("event_id", eventId);
  return (data ?? []).length === 0
    ? { ok: true }
    : { ok: false, motivo: "sin-permiso", detalle: "la fila sigue ahí" };
}
