/**
 * Cliente de Supabase para la SESIÓN DEL STAFF (login del operador / salón).
 *
 * Es INDEPENDIENTE de `@salones/sync` (que habla por REST con la llave pública y
 * el candado por evento, para los invitados). Aquí usamos el SDK oficial solo
 * para manejar la sesión del staff: iniciar sesión, refrescar el token y cerrar.
 * El token del staff —con su tenant y rol (Fase 1)— es lo que la RLS por tenant
 * leerá para decidir qué puede ver/tocar cada salón.
 *
 * La llave "anon/publishable" es PÚBLICA por diseño (viaja en el navegador). Si
 * faltan las variables de entorno, devolvemos `null` y la UI avisa que el login
 * aún no está configurado (así la app sigue compilando y sirviendo la tienda).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

export function obtenerSupabase(): SupabaseClient | null {
  if (cliente) return cliente;
  // La sesión vive en el navegador; no se crea el cliente del lado del servidor.
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  cliente = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cliente;
}
