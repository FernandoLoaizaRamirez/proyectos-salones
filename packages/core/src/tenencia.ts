/**
 * @salones/core — Tenencia (quién es dueño de qué).
 *
 * Vocabulario de la plataforma multi-cliente:
 *   Tenant (el salón/cliente dueño de sus datos)
 *     └─ TenantMember (usuarios del staff, cada uno con un Role)
 *
 * El STAFF se autentica (Supabase Auth, Fase 1). El INVITADO no: entra por el
 * enlace `?e=...` con una llave de capacidad (token firmado por evento).
 *
 * Nota: `Salon` (en index.ts) es el perfil "de cara al público" de un salón;
 * `Tenant` es ese mismo salón visto como CLIENTE/CUENTA de la plataforma
 * (con su slug para subdominio, su plan y su estado).
 */
import { z } from "zod";

/** Roles del staff dentro de un tenant. */
export const Role = {
  Owner: "owner",
  Admin: "admin",
  Staff: "staff",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TenantSchema = z.object({
  id: z.string(),
  /** Subdominio futuro: `<slug>.suite-salones.app`. */
  slug: z.string(),
  nombre: z.string(),
  ciudad: z.string().optional(),
  logoUrl: z.string().url().optional(),
  /** Plan comercial: "gestionado" | "renta" | "compra". */
  planId: z.string().optional(),
  estado: z.enum(["activo", "suspendido"]).default("activo"),
});
export type Tenant = z.infer<typeof TenantSchema>;

/** Usuario del staff. `id` es el mismo de Supabase Auth (auth.users.id). */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  nombre: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

/** Membresía: un usuario pertenece a un tenant con un rol. */
export const TenantMemberSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  rol: z.enum([Role.Owner, Role.Admin, Role.Staff]).default(Role.Staff),
});
export type TenantMember = z.infer<typeof TenantMemberSchema>;
