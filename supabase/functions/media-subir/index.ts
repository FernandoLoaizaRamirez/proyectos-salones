/**
 * Edge Function `media-subir` — permiso de subida para fotos y videos.
 *
 * EL AGUJERO QUE TAPA:
 *   Hasta ahora el almacén tenía UNA sola regla: "cualquiera puede subir al
 *   bucket media" (ver `0001_estado_actual.sql`). Como la llave pública viaja
 *   dentro del JavaScript de cada app (es pública por diseño), cualquiera podía
 *   sacarla y subir archivos a la carpeta de CUALQUIER evento: meter imágenes
 *   ajenas en el álbum de una boda, o llenar el almacén hasta reventar la cuota.
 *
 * CÓMO LO TAPA:
 *   La app ya no sube directo. Primero pide permiso aquí presentando su PASE
 *   FIRMADO (el de invitado, `x-evento-pase`, o el de anfitrión,
 *   `x-evento-anfitrion`). Esta función:
 *     1. verifica el pase contra la base (no se puede forjar, caduca a 30 min),
 *     2. **decide ella misma la ruta**: `<evento>/<marca>-<azar>.<ext>`, y
 *     3. devuelve una URL de subida FIRMADA y de un solo uso (vale 2 horas).
 *
 *   La clave está en el punto 2: **el cliente no elige dónde escribe**. La
 *   carpeta sale del evento que la propia base reconoció en el pase, así que no
 *   hay forma de escribir en la burbuja de otro evento aunque se manipule la
 *   petición.
 *
 * POR QUÉ ASÍ Y NO CON UNA REGLA EN EL ALMACÉN (decisión de diseño, 2026-07-20):
 *   Lo natural habría sido copiar el truco de `items`: una política de RLS que
 *   lea el encabezado del pase. NO se hizo porque en el almacén ese camino es
 *   arena: leer encabezados con `current_setting('request.headers')` dentro de
 *   políticas de `storage.objects` **no está documentado**, y en las de SELECT
 *   está roto desde 2024 (supabase/supabase#29908, todavía abierto). Ya nos pasó
 *   una vez con el JWT HS256 de la 0006: construir sobre comportamiento no
 *   documentado costó rehacer el trabajo. Las URL firmadas sí son la vía
 *   soportada y estable.
 *
 * EL ARCHIVO NO PASA POR AQUÍ: esta función solo firma el permiso; el navegador
 * sube el archivo directo al almacén. Así no hay límite de tamaño de la función
 * ni coste por megabyte transferido.
 *
 * Se despliega PÚBLICA (`--no-verify-jwt`): el pase firmado es la llave.
 * Runbook: docs/CANDADO-FOTOS.md
 */

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET = "media";

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

/** Llama a una función de la base con la llave de servicio. */
async function rpc(nombre: string, cuerpo: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(`rpc ${nombre} → ${res.status}`);
  return await res.json();
}

/**
 * ¿De qué evento es este pase? Acepta el de invitado y el de anfitrión: los dos
 * pueden aportar contenido. Devuelve también QUÉ pase valió, para poder llevarle
 * la cuenta sin volver a preguntar.
 */
async function eventoDelPase(
  pase: string,
  paseAnfitrion: string,
): Promise<{ evento: string; usado: string } | null> {
  if (paseAnfitrion) {
    const e = await rpc("evento_del_pase_anfitrion", { p_pase: paseAnfitrion });
    if (typeof e === "string" && e) return { evento: e, usado: paseAnfitrion };
  }
  if (pase) {
    const e = await rpc("evento_del_pase", { p_pase: pase });
    if (typeof e === "string" && e) return { evento: e, usado: pase };
  }
  return null;
}

/**
 * La huella del pase (sha-256). Se lleva la cuenta con esto y NUNCA con el pase
 * en claro: si algún día alguien lee la tabla, no se lleva llaves de nadie.
 */
async function huellaDe(pase: string): Promise<string> {
  const bytes = new TextEncoder().encode(pase);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ¿Cabe una subida más? La cuenta la lleva la BASE (migración 0015), no esta
 * función: hay varias instancias de ella y un contador en memoria no serviría.
 *
 * SI LA MIGRACIÓN TODAVÍA NO ESTÁ APLICADA la base responde 404 (la función no
 * existe) y aquí se DEJA PASAR. Es el mismo patrón no-fatal que el pase firmado
 * y las direcciones firmadas: así esta versión se puede desplegar ANTES de tocar
 * la base sin dejar a nadie sin subir fotos en plena boda.
 *
 * Cualquier OTRO fallo sí corta: si la base está ahí pero no contesta bien, es
 * mejor no firmar que firmar a ciegas.
 */
async function cabeUnaSubidaMas(evento: string, pase: string): Promise<boolean> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/permitir_subida`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_evento: evento, p_huella: await huellaDe(pase) }),
  });
  if (res.status === 404) return true; // migración 0015 pendiente
  if (!res.ok) return false;
  return (await res.json()) === true;
}

/** Extensión razonable a partir del nombre o del tipo MIME (igual que @salones/sync). */
function extensionDe(nombre: string, tipo: string): string {
  const porNombre = /\.([a-z0-9]{1,5})$/i.exec(nombre)?.[1];
  if (porNombre) return porNombre.toLowerCase();
  const porTipo = tipo.split("/")[1]?.replace(/[^a-z0-9]/gi, "");
  return (porTipo || "bin").toLowerCase();
}

/**
 * Pide al almacén una URL de subida firmada para una ruta concreta.
 * Responde `{ url: "/object/upload/sign/<bucket>/<ruta>?token=..." }`.
 */
async function firmarSubida(ruta: string): Promise<string> {
  const res = await fetch(`${URL_SUPABASE}/storage/v1/object/upload/sign/${BUCKET}/${ruta}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`firmar → ${res.status}`);
  const data = (await res.json()) as { url?: string; signedUrl?: string };
  const relativa = data.url ?? data.signedUrl;
  if (!relativa) throw new Error("firmar → respuesta sin url");
  // Puede venir relativa ("/object/upload/sign/...") o absoluta.
  return relativa.startsWith("http") ? relativa : `${URL_SUPABASE}/storage/v1${relativa}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);
  if (!URL_SUPABASE || !SERVICE_ROLE) return json({ error: "función sin configurar" }, 500);

  let cuerpo: { nombre?: unknown; tipo?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "cuerpo inválido" }, 400);
  }

  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre : "";
  const tipo = typeof cuerpo.tipo === "string" ? cuerpo.tipo : "";

  // Mismo candado que el bucket: solo fotos y videos.
  if (!tipo.startsWith("image/") && !tipo.startsWith("video/")) {
    return json({ error: "solo se admiten fotos y videos" }, 400);
  }

  try {
    const quien = await eventoDelPase(
      req.headers.get("x-evento-pase") ?? "",
      req.headers.get("x-evento-anfitrion") ?? "",
    );
    // Sin pase válido no se firma nada. No se dice por qué falló.
    if (!quien) return json({ error: "sin permiso para este evento" }, 403);
    const { evento, usado } = quien;

    /* ---- El tope (migración 0015) -----------------------------------------
     * Antes esto no llevaba ninguna cuenta, y como la llave pública viaja
     * dentro del JavaScript de las apps, cualquiera podía pedirse pases del
     * evento "demo" y con ellos permisos ILIMITADOS. Todos los eventos comparten
     * el mismo almacén, así que llenarlo dejaba sin subir una sola foto a TODAS
     * las bodas, incluida la que se estuviera celebrando esa noche.
     *
     * La cuenta la lleva la base (`permitir_subida`), no esta función: hay
     * varias instancias de ella y un contador en memoria no serviría de nada. */
    if (!(await cabeUnaSubidaMas(evento, usado))) {
      return json(
        {
          error: "demasiadas subidas seguidas",
          detalle: "Espera un momento antes de subir más archivos.",
        },
        429,
      );
    }

    // LA RUTA LA DECIDE EL SERVIDOR, a partir del evento que la base reconoció
    // en el pase. El cliente no puede escribir en la carpeta de otro evento.
    const azar = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const ruta = `${encodeURIComponent(evento)}/${Date.now()}-${azar}.${extensionDe(nombre, tipo)}`;

    return json({
      subirUrl: await firmarSubida(ruta),
      ruta,
      urlPublica: `${URL_SUPABASE}/storage/v1/object/public/${BUCKET}/${ruta}`,
    });
  } catch (e) {
    console.error("media-subir:", e instanceof Error ? e.message : e);
    return json({ error: "no se pudo preparar la subida" }, 500);
  }
});
