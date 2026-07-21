/**
 * Identidad del staff, leída de la sesión de Supabase.
 *
 * Tras el script de alta (`scripts/vincular-staff.mjs`), el usuario del staff
 * lleva en su token —dentro de `app_metadata`— a qué salón (tenant) pertenece y
 * con qué rol. Este ayudante lee esos datos de forma segura para que la app sepa
 * "quién es y de qué salón". La verdad la hará valer la RLS en el servidor (paso
 * siguiente); esto es para mostrar/decidir en la interfaz.
 */
import type { User } from "@supabase/supabase-js";

/** Roles del staff dentro de un salón (los mismos que `tenant_members.rol`). */
export type RolStaff = "owner" | "admin" | "staff";

const ROLES: RolStaff[] = ["owner", "admin", "staff"];

/** Salón (tenant) + rol del usuario, tal como viajan en su token. */
export type Identidad = {
  tenantId: string;
  rol: RolStaff;
};

/**
 * Lee la identidad del staff desde `app_metadata`. Devuelve `null` si el usuario
 * aún no está ligado a un salón (todavía no pasó por el script de alta).
 */
export function leerIdentidad(user: User | null | undefined): Identidad | null {
  const meta = (user?.app_metadata ?? {}) as Record<string, unknown>;
  const tenantId = typeof meta.tenant_id === "string" ? meta.tenant_id : null;
  if (!tenantId) return null;
  const rol: RolStaff = ROLES.includes(meta.rol as RolStaff) ? (meta.rol as RolStaff) : "staff";
  return { tenantId, rol };
}

/** ¿El usuario ya está ligado a un salón (tiene identidad de staff)? */
export function estaVinculado(user: User | null | undefined): boolean {
  return leerIdentidad(user) !== null;
}
