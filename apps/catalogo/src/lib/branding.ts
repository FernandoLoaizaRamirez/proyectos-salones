/**
 * Lector del BRANDING de un salón desde la base (`tenant_branding`).
 *
 * El branding (nombre, logo, colores, redondeo) es PÚBLICO por diseño —el
 * invitado ve la marca del salón—, así que la tabla tiene lectura abierta y se
 * consulta con la misma llave pública del navegador. El resultado se convierte
 * al tipo `BrandingSalon` de @salones/ui, que ya sabe pintarlo en runtime.
 *
 * DEGRADACIÓN ELEGANTE: si Supabase no está configurado, si la tabla aún no
 * existe (migración 0007 sin aplicar) o si el salón no tiene branding, devuelve
 * `null` y la UI cae a valores de ejemplo. Nunca lanza.
 */
import type { BrandingSalon } from "@salones/ui";
import { obtenerSupabase } from "./supabase";

/**
 * Salón demo: UUID fijo y conocido (semilla de la migración 0002). Mientras la
 * Fase 1 no meta el tenant en el token del staff, leemos el branding de este
 * salón; después se resolverá el tenant real desde la sesión.
 */
export const TENANT_DEMO = "d0000000-0000-4000-8000-000000000001";

/** Fila de `tenant_branding` (snake_case, como en la base). */
type FilaBranding = {
  nombre: string | null;
  logo_url: string | null;
  primario: string | null;
  primario_texto: string | null;
  acento: string | null;
  radio: string | null;
};

/** Lee el branding de un salón. Devuelve `null` si no se puede (ver arriba). */
export async function obtenerBrandingSalon(
  tenantId: string = TENANT_DEMO,
): Promise<BrandingSalon | null> {
  const supabase = obtenerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tenant_branding")
    .select("nombre, logo_url, primario, primario_texto, acento, radio")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) return null;
  const fila = data as FilaBranding;

  return {
    nombre: fila.nombre ?? "Salón",
    logoUrl: fila.logo_url ?? undefined,
    primario: fila.primario ?? undefined,
    primarioTexto: fila.primario_texto ?? undefined,
    acento: fila.acento ?? undefined,
    radio: fila.radio ?? undefined,
  };
}
