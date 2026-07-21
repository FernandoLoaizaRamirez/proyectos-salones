/**
 * GET /api/yo — devuelve la identidad del staff que hace la petición.
 *
 * El navegador manda su token de sesión en el encabezado `Authorization: Bearer
 * <token>`. Aquí lo verificamos contra Supabase (valida la firma y la vigencia) y
 * devolvemos el correo, el salón (tenant) y el rol que lleva en `app_metadata`.
 *
 * Sirve para comprobar de punta a punta que el paso de "vincular staff → salón"
 * quedó bien: si `vinculado` es true y trae tenant_id + rol, la identidad ya viaja
 * en el token. Es un primitivo reutilizable: cualquier app podrá preguntar
 * "¿quién soy y de qué salón?" sin repetir la lógica.
 */
import { createClient } from "@supabase/supabase-js";
import { leerIdentidad } from "@/lib/sesion";

// getUser hace una llamada de red a Supabase Auth: runtime Node (no Edge).
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return Response.json({ error: "login no configurado" }, { status: 503 });
  }

  // Sacar el token del encabezado Authorization: Bearer <token>.
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.toLowerCase().startsWith("bearer ") ? authz.slice(7).trim() : "";
  if (!token) {
    return Response.json({ error: "falta el token de sesión" }, { status: 401 });
  }

  // Verificar el token con Supabase y recuperar el usuario.
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return Response.json({ error: "sesión inválida" }, { status: 401 });
  }

  const identidad = leerIdentidad(data.user);
  return Response.json({
    email: data.user.email ?? null,
    tenantId: identidad?.tenantId ?? null,
    rol: identidad?.rol ?? null,
    vinculado: identidad !== null,
  });
}
