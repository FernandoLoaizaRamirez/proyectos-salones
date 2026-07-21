/**
 * Edge Function `media-ver` — direcciones de lectura que CADUCAN.
 *
 * EL AGUJERO QUE TAPA (el último de los dos del almacén):
 *   `media-subir` cerró la ESCRITURA. Esto cierra la LECTURA. Hasta ahora el
 *   bucket era público, y en un bucket público el almacén ni siquiera consulta
 *   las reglas: quien tuviera la dirección de una foto la veía, sin llave y
 *   PARA SIEMPRE. Una dirección filtrada no caducaba nunca.
 *
 * CÓMO:
 *   La base ya no guarda una dirección que sirva por sí sola: guarda una
 *   REFERENCIA. Al abrir el álbum, la app presenta su pase aquí y recibe
 *   direcciones firmadas que caducan en una hora. Si mañana alguien reenvía una
 *   de esas direcciones, ya no abre nada.
 *
 * LA COMPROBACIÓN QUE IMPORTA:
 *   Cada ruta pedida tiene que estar DENTRO de la carpeta del evento del pase.
 *   Sin eso, el invitado de una boda podría pedir que le firmen las fotos de
 *   otra: bastaría con conocer el nombre de un archivo ajeno. Es la misma idea
 *   que en `media-subir` —el evento lo pone el pase, no el cliente— pero
 *   aplicada al revés.
 *
 * SE FIRMAN EN LOTE: un álbum tiene cientos de fotos y pedirlas de una en una
 * sería una llamada por foto. El almacén admite firmar muchas de golpe.
 *
 * Se despliega PÚBLICA (`--no-verify-jwt`): el pase firmado es la llave.
 * Runbook: docs/MEDIOS-PRIVADOS.md
 */

// `esDelEvento` vive en `_shared/` para que se pueda PROBAR sin Deno ni
// Supabase (este archivo arranca un servidor al cargarse y no se puede
// importar desde una prueba). Ver tests/seguridad/validar.test.ts.
import { esDelEvento } from "../_shared/validar.ts";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET = "media";
/** Una hora: bastante para recorrer un álbum, poco para que sirva mañana. */
const VIGENCIA_SEG = 3600;
/** Tope por petición. Un álbum enorme se pide en varias tandas. */
const MAX_RUTAS = 500;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-evento-pase, x-evento-anfitrion",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const cabecerasServicio = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
};

async function rpc(nombre: string, cuerpo: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: cabecerasServicio,
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(`rpc ${nombre} → ${res.status}`);
  return await res.json();
}

/** De qué evento es este pase. Vale el de invitado y el de anfitrión. */
async function eventoDelPase(pase: string, paseAnfitrion: string): Promise<string | null> {
  if (paseAnfitrion) {
    const e = await rpc("evento_del_pase_anfitrion", { p_pase: paseAnfitrion });
    if (typeof e === "string" && e) return e;
  }
  if (pase) {
    const e = await rpc("evento_del_pase", { p_pase: pase });
    if (typeof e === "string" && e) return e;
  }
  return null;
}

/** Firma muchas rutas de una vez. Devuelve { ruta: direcciónFirmada }. */
async function firmarLote(rutas: string[]): Promise<Record<string, string>> {
  const res = await fetch(`${URL_SUPABASE}/storage/v1/object/sign/${BUCKET}`, {
    method: "POST",
    headers: cabecerasServicio,
    body: JSON.stringify({ expiresIn: VIGENCIA_SEG, paths: rutas }),
  });
  if (!res.ok) throw new Error(`firmar → ${res.status}`);

  const filas = (await res.json()) as {
    path?: string;
    signedURL?: string;
    signedUrl?: string;
    error?: string | null;
  }[];

  const salida: Record<string, string> = {};
  for (const fila of filas) {
    const relativa = fila.signedURL ?? fila.signedUrl;
    // Un archivo que ya no existe viene con error: se omite en vez de romper
    // toda la tanda. La app enseñará ese hueco y el resto se verá igual.
    if (!fila.path || !relativa || fila.error) continue;
    salida[fila.path] = relativa.startsWith("http")
      ? relativa
      : `${URL_SUPABASE}/storage/v1${relativa}`;
  }
  return salida;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);
  if (!URL_SUPABASE || !SERVICE_ROLE) return json({ error: "función sin configurar" }, 500);

  let cuerpo: { rutas?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "cuerpo inválido" }, 400);
  }

  const pedidas = Array.isArray(cuerpo.rutas) ? cuerpo.rutas : null;
  if (!pedidas) return json({ error: "falta la lista de rutas" }, 400);
  if (pedidas.length > MAX_RUTAS) {
    return json({ error: `máximo ${MAX_RUTAS} archivos por petición` }, 400);
  }
  if (pedidas.length === 0) return json({ direcciones: {} });

  try {
    const evento = await eventoDelPase(
      req.headers.get("x-evento-pase") ?? "",
      req.headers.get("x-evento-anfitrion") ?? "",
    );
    if (!evento) return json({ error: "sin permiso para este evento" }, 403);

    // Solo se firma lo que es de ESTE evento. Lo demás se descarta en silencio:
    // no se confirma ni se desmiente que exista.
    const validas = [...new Set(pedidas.filter((r) => esDelEvento(r as string, evento)))] as string[];
    if (validas.length === 0) return json({ direcciones: {} });

    return json({ direcciones: await firmarLote(validas), vigenciaSeg: VIGENCIA_SEG });
  } catch (e) {
    console.error("media-ver:", e instanceof Error ? e.message : e);
    return json({ error: "no se pudieron preparar las direcciones" }, 500);
  }
});
