/**
 * Edge Function `evento-config` — configuración PÚBLICA de un evento.
 *
 * Dado el código del enlace del invitado (`?e=<codigo>`), devuelve lo que el
 * PORTAL necesita para pintarse: el nombre del evento, el plan y sus funciones,
 * los overrides (del salón y del evento) y el branding del salón.
 *
 * POR QUÉ EXISTE: las tablas del plano de control están cerradas por RLS (el
 * invitado, con la llave pública, no puede leerlas). Esta función las consulta
 * con la llave SERVICE-ROLE que Supabase inyecta **dentro** de la función, así la
 * llave secreta NUNCA vive en la app del portal ni viaja al navegador.
 *
 * NO resuelve los entitlements aquí: devuelve los datos CRUDOS (plan + overrides)
 * y el portal corre `resolveEntitlements` de `@salones/core`. Así el motor
 * comercial sigue teniendo UNA sola implementación, probada con vitest.
 *
 * QUÉ NO DEVUELVE: ni `tenant_id`, ni datos de invitados, ni nada del contenido
 * del evento. Solo la configuración que el invitado ya ve de todas formas.
 *
 * Se despliega PÚBLICA (`--no-verify-jwt`): el código del evento es la llave.
 */

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** Mismo formato de código que el resto de la suite. */
const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

/** Consulta a PostgREST con la llave de servicio (salta RLS). */
async function rest<T>(ruta: string): Promise<T[]> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/${ruta}`, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`rest ${ruta} → ${res.status}`);
  return (await res.json()) as T[];
}

/** [{feature_clave, habilitado}] → { clave: habilitado }. */
function aMapa(filas: { feature_clave: string; habilitado: boolean }[]): Record<string, boolean> {
  const mapa: Record<string, boolean> = {};
  for (const f of filas) mapa[f.feature_clave] = f.habilitado;
  return mapa;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "método no permitido" }, 405);
  if (!URL_SUPABASE || !SERVICE_ROLE) return json({ error: "función sin configurar" }, 500);

  const codigo = new URL(req.url).searchParams.get("e") ?? "";
  if (!CODIGO_VALIDO.test(codigo)) return json({ error: "código inválido" }, 400);

  try {
    // 1) El evento. El código del enlace es la llave.
    const eventos = await rest<{
      id: string;
      nombre: string;
      tenant_id: string;
      estado: string;
    }>(`events?codigo=eq.${encodeURIComponent(codigo)}&select=id,nombre,tenant_id,estado&limit=1`);
    const evento = eventos[0];
    if (!evento) return json({ error: "evento no encontrado" }, 404);

    // 2) El salón dueño y su plan.
    const tenants = await rest<{ nombre: string; plan_id: string | null }>(
      `tenants?id=eq.${evento.tenant_id}&select=nombre,plan_id&limit=1`,
    );
    const salon = tenants[0];
    const planId = salon?.plan_id ?? null;

    // 3) Funciones que trae el plan.
    const funciones = planId
      ? (
          await rest<{ feature_clave: string }>(
            `plan_features?plan_id=eq.${encodeURIComponent(planId)}&select=feature_clave`,
          )
        ).map((f) => f.feature_clave)
      : [];

    // 4) Overrides del salón y del evento (el evento manda; lo resuelve el portal).
    const ovSalon = await rest<{ feature_clave: string; habilitado: boolean }>(
      `tenant_entitlements?tenant_id=eq.${evento.tenant_id}&select=feature_clave,habilitado`,
    );
    const ovEvento = await rest<{ feature_clave: string; habilitado: boolean }>(
      `event_overrides?event_id=eq.${evento.id}&select=feature_clave,habilitado`,
    );

    // 5) Branding del salón (puede no existir → el portal usa el tema por defecto).
    const brandings = await rest<{
      nombre: string | null;
      logo_url: string | null;
      primario: string | null;
      primario_texto: string | null;
      acento: string | null;
      radio: string | null;
    }>(
      `tenant_branding?tenant_id=eq.${evento.tenant_id}` +
        `&select=nombre,logo_url,primario,primario_texto,acento,radio&limit=1`,
    );
    const b = brandings[0];

    return json({
      evento: { codigo, nombre: evento.nombre, estado: evento.estado },
      plan: { id: planId ?? "sin-plan", nombre: planId ?? "Sin plan", funciones },
      overridesTenant: aMapa(ovSalon),
      overridesEvento: aMapa(ovEvento),
      branding: b
        ? {
            nombre: b.nombre ?? salon?.nombre ?? evento.nombre,
            logoUrl: b.logo_url ?? undefined,
            primario: b.primario ?? undefined,
            primarioTexto: b.primario_texto ?? undefined,
            acento: b.acento ?? undefined,
            radio: b.radio ?? undefined,
          }
        : null,
    });
  } catch {
    return json({ error: "no se pudo resolver la configuración" }, 502);
  }
});
