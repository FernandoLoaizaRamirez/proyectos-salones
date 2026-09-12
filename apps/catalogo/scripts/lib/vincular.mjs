/**
 * Ligar un usuario a un salón: la fila de `tenant_members` MÁS la identidad
 * grabada en `app_metadata` (que es la que viaja firmada dentro del token y la
 * que lee la RLS de la 0008).
 *
 * VIVE AQUÍ Y NO EN `vincular-staff.mjs` porque ahora tiene dos clientes: ese
 * script (que sigue funcionando igual, como puerta de atrás para reparar altas
 * viejas) y `alta-salon.mjs`. Este código ya estaba probado en producción; se
 * extrajo TAL CUAL en vez de reescribirlo, incluida la preservación del
 * `app_metadata` previo.
 */

export const ROLES = ["owner", "admin", "staff"];

/**
 * @param {object} opciones
 * @param {import("@supabase/supabase-js").SupabaseClient} opciones.admin cliente con service-role
 * @param {string} opciones.userId
 * @param {string} opciones.tenantId
 * @param {string} opciones.rol  owner | admin | staff
 * @returns {Promise<{ok: true, appMetadata: Record<string, unknown>} | {ok: false, error: string}>}
 */
export async function vincularStaff({ admin, userId, tenantId, rol }) {
  if (!ROLES.includes(rol)) return { ok: false, error: `Rol inválido: "${rol}".` };

  // El usuario debe existir en Supabase Auth.
  const { data: cuenta, error: eUser } = await admin.auth.admin.getUserById(userId);
  if (eUser || !cuenta?.user)
    return { ok: false, error: `No encontré ese usuario: ${eUser?.message ?? "no existe"}.` };

  // Ligar usuario ↔ salón (idempotente por su llave primaria).
  const { error: eMember } = await admin
    .from("tenant_members")
    .upsert({ tenant_id: tenantId, user_id: userId, rol }, { onConflict: "tenant_id,user_id" });
  if (eMember) return { ok: false, error: `No pude escribir en tenant_members: ${eMember.message}` };

  // Grabar la identidad en app_metadata, PRESERVANDO lo que ya hubiera (por
  // ejemplo, los datos del proveedor de login).
  const metaPrevio = cuenta.user.app_metadata ?? {};
  const { data: actualizado, error: eMeta } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...metaPrevio, tenant_id: tenantId, rol },
  });
  if (eMeta) return { ok: false, error: `No pude actualizar app_metadata: ${eMeta.message}` };

  return { ok: true, appMetadata: actualizado.user.app_metadata ?? {} };
}
