// ============================================================================
// Edge Function: token  ·  "el que reparte los pases del evento"
// ----------------------------------------------------------------------------
// Recibe el codigo del evento (?e=<codigo>), comprueba que el evento exista y
// este ACTIVO, y devuelve un PASE: un JWT firmado y de corta duracion (30 min)
// con el claim { evento: <codigo> } y role "anon".
//
// Por que existe (Fase 1, migracion de seguridad x-evento -> token firmado):
//   Hoy la llave del evento viaja en crudo como encabezado `x-evento` en cada
//   peticion (candado de la Fase 5). Funciona, pero el codigo va y viene sin
//   caducar. Este pase lo sustituye por algo firmado por el servidor y efimero:
//   PostgREST verifica la firma con el JWT secret del proyecto, y las politicas
//   RLS leen el claim `evento` (ver migracion 0006). El invitado no nota nada:
//   @salones/sync pide el pase por dentro y lo manda como Authorization.
//
// Se despliega PUBLICA (--no-verify-jwt): no exige sesion, porque el "permiso"
// es justamente conocer el codigo del evento (misma capacidad que el enlace de
// hoy, pero ahora entregada como pase firmado y con caducidad). La validacion
// del codigo se hace aqui dentro, con el service-role (que salta la RLS solo
// para leer la tabla `events`).
//
// Variables de entorno que necesita (se ponen como secrets de la funcion):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  -> los inyecta Supabase solo.
//   EVENT_TOKEN_JWT_SECRET                   -> el "JWT Secret" del proyecto
//       (Supabase > Project Settings > API > JWT Settings). Con el se firma el
//       pase para que PostgREST lo acepte. Hay que ponerlo a mano (ver runbook).
// ============================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

/** El pase dura poco: si se filtra, caduca solo. */
const VIGENCIA_SEG = 30 * 60; // 30 minutos

/** Mismo formato de codigo que `eventoActual()` en @salones/sync. */
const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

/** Permite que las apps del navegador (otros dominios) llamen a la funcion. */
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const codigo = (new URL(req.url).searchParams.get("e") ?? "").trim();
    if (!CODIGO_VALIDO.test(codigo)) return json({ error: "codigo-invalido" }, 400);

    // El evento "demo" es el de las vitrinas publicas: siempre valido, sin mirar
    // la BD (para que las demos nunca se queden sin pase).
    if (codigo !== "demo") {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data, error } = await admin
        .from("events")
        .select("codigo, estado")
        .eq("codigo", codigo)
        .maybeSingle();
      if (error || !data || data.estado !== "activo") {
        return json({ error: "evento-no-disponible" }, 404);
      }
    }

    const secreto = Deno.env.get("EVENT_TOKEN_JWT_SECRET");
    if (!secreto) return json({ error: "sin-secreto-de-firma" }, 500);

    const ahora = Math.floor(Date.now() / 1000);
    const exp = ahora + VIGENCIA_SEG;
    // role "anon": el pase tiene los MISMOS permisos publicos de hoy; lo unico
    // que agrega es el claim `evento`, que la RLS usa para acotar el acceso.
    const token = await firmarJWT({ role: "anon", evento: codigo, iat: ahora, exp }, secreto);

    return json({ token, exp }, 200);
  } catch {
    return json({ error: "fallo-interno" }, 500);
  }
});

/* -------------------------------------------------------------------------- */
/* Firma HS256 a mano (Web Crypto), sin dependencias externas.                */
/* -------------------------------------------------------------------------- */

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function firmarJWT(payload: Record<string, unknown>, secreto: string): Promise<string> {
  const cabecera = { alg: "HS256", typ: "JWT" };
  const cuerpo = `${b64url(JSON.stringify(cabecera))}.${b64url(JSON.stringify(payload))}`;
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(cuerpo));
  return `${cuerpo}.${b64url(new Uint8Array(firma))}`;
}

function json(cuerpo: unknown, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
