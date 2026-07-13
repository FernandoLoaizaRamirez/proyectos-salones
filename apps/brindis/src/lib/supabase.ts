/**
 * Conexión con la NUBE (Supabase Storage) — Paso A del servicio de videos.
 *
 * Los brindis se suben a un cajón central ("brindis") y el organizador los ve
 * todos juntos en la galería (/galeria). La clave "publishable" es PÚBLICA por
 * diseño (va en el navegador); la seguridad la dan las políticas del cajón:
 * solo permite subir y leer ese cajón, nada más del proyecto.
 *
 * Para cambiar de proyecto/nube, edita estos dos valores (o usa variables de
 * entorno NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_KEY).
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ojtnzirtyxdpmsjfqixr.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "sb_publishable_VJMxXZUbFj2Jpqy0M4VcDg_HYhsh67t";

/** Cajón (bucket) donde viven los videos del evento. */
const BUCKET = "brindis";

/** ¿Está configurada la nube? */
export const nubeActiva = Boolean(SUPABASE_URL && SUPABASE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export type VideoNube = { nombre: string; url: string; fecha: number };

function extensionDe(mime: string): string {
  return mime.includes("mp4") ? "mp4" : "webm";
}

/** Sube un brindis a la nube. Devuelve { ok, url } o { ok:false, error }. */
export async function subirBrindis(
  blob: Blob,
  mime: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const ext = extensionDe(mime);
    const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(nombre, blob, {
      contentType: mime || `video/${ext}`,
      upsert: false,
    });
    if (error) return { ok: false, error: error.message };
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo subir el video." };
  }
}

/** Lista todos los brindis subidos, del más nuevo al más viejo. */
export async function listarBrindis(): Promise<VideoNube[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    limit: 500,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error || !data) return [];
  return data
    .filter((f) => f.name && !f.name.startsWith(".") && !f.name.startsWith("_"))
    .map((f) => ({
      nombre: f.name,
      url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
      fecha: f.created_at ? Date.parse(f.created_at) : 0,
    }));
}
