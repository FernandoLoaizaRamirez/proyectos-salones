/**
 * Alta de un usuario del STAFF: lo liga a un salón (tenant) y graba su identidad
 * (tenant_id + rol) en `app_metadata`, para que VIAJE dentro de su token.
 *
 * Por qué importa: el login (paso 1.1) ya deja entrar al staff, pero su sesión no
 * dice AÚN a qué salón pertenece ni con qué rol. Este script lo conecta:
 *   1) escribe la fila en `tenant_members` (salón ↔ usuario ↔ rol), y
 *   2) graba `{ tenant_id, rol }` en `app_metadata` del usuario en Supabase Auth.
 * Como `app_metadata` viaja firmado dentro del JWT, la RLS por tenant/rol (paso
 * siguiente) podrá leer `auth.jwt() -> app_metadata ->> 'tenant_id'` para que cada
 * salón vea SOLO lo suyo.
 *
 * Usa la llave SERVICE-ROLE (administrador), que salta la RLS. NUNCA se escribe en
 * el navegador ni se sube al repo: se pasa por variable de entorno al correr.
 *
 * Es idempotente: correrlo dos veces deja el mismo resultado.
 *
 * ── Cómo correrlo ────────────────────────────────────────────────────────────
 *   SUPABASE_URL=...                (o NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY=...   (llave secreta; Project Settings → API)
 *   node apps/catalogo/scripts/vincular-staff.mjs --user=<uuid-del-usuario>
 *
 *   Opcionales:
 *     --tenant=<uuid>   salón (por defecto: el salón demo)
 *     --rol=owner       owner | admin | staff (por defecto: owner)
 */
import { createClient } from "@supabase/supabase-js";

const TENANT_DEMO = "d0000000-0000-4000-8000-000000000001";
const ROLES = ["owner", "admin", "staff"];

/** Lee un argumento --nombre=valor de la línea de comandos. */
const arg = (nombre) => {
  const prefijo = `--${nombre}=`;
  const hallado = process.argv.find((a) => a.startsWith(prefijo));
  return hallado ? hallado.slice(prefijo.length) : undefined;
};

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = arg("user") ?? process.env.STAFF_USER_ID;
const TENANT_ID = arg("tenant") ?? process.env.STAFF_TENANT_ID ?? TENANT_DEMO;
const ROL = arg("rol") ?? process.env.STAFF_ROL ?? "owner";

function abortar(mensaje) {
  console.error(`\n❌ ${mensaje}\n`);
  process.exit(1);
}

if (!URL) abortar("Falta SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL).");
if (!SERVICE_ROLE)
  abortar("Falta SUPABASE_SERVICE_ROLE_KEY (la llave secreta de administrador, NO la publishable).");
if (!USER_ID)
  abortar(
    "Falta el usuario. Pásalo con --user=<uuid> (o la variable STAFF_USER_ID).\n" +
      "   Ejemplo: node apps/catalogo/scripts/vincular-staff.mjs --user=29e84a6d-e9f1-4ff4-8cd5-73632f7716dc",
  );
if (!ROLES.includes(ROL)) abortar(`Rol inválido: "${ROL}". Debe ser uno de: ${ROLES.join(", ")}.`);

const admin = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("\n🔗 Vinculando staff → salón");
console.log(`   Usuario : ${USER_ID}`);
console.log(`   Salón   : ${TENANT_ID}`);
console.log(`   Rol     : ${ROL}\n`);

// 0) El usuario debe existir en Supabase Auth.
const { data: cuenta, error: eUser } = await admin.auth.admin.getUserById(USER_ID);
if (eUser || !cuenta?.user)
  abortar(`No encontré ese usuario en Supabase Auth: ${eUser?.message ?? "no existe"}.`);

// 1) El salón (tenant) debe existir (migración 0002).
const { data: salon, error: eTenant } = await admin
  .from("tenants")
  .select("id,nombre")
  .eq("id", TENANT_ID)
  .maybeSingle();
if (eTenant) abortar(`Error consultando el salón: ${eTenant.message}`);
if (!salon) abortar(`Ese salón (tenant) no existe: ${TENANT_ID}. ¿Aplicaste la migración 0002?`);

// 2) Ligar usuario ↔ salón en tenant_members (idempotente por su llave primaria).
const { error: eMember } = await admin
  .from("tenant_members")
  .upsert({ tenant_id: TENANT_ID, user_id: USER_ID, rol: ROL }, { onConflict: "tenant_id,user_id" });
if (eMember) abortar(`No pude escribir en tenant_members: ${eMember.message}`);
console.log("✅ tenant_members: usuario ligado al salón.");

// 3) Grabar la identidad en app_metadata (viaja firmada dentro del token).
//    Se preserva lo que ya hubiera (p. ej. datos del proveedor de login).
const metaPrevio = cuenta.user.app_metadata ?? {};
const { data: actualizado, error: eMeta } = await admin.auth.admin.updateUserById(USER_ID, {
  app_metadata: { ...metaPrevio, tenant_id: TENANT_ID, rol: ROL },
});
if (eMeta) abortar(`No pude actualizar app_metadata: ${eMeta.message}`);
console.log("✅ app_metadata: identidad grabada en el token.");

// 4) Leer de vuelta y mostrar la prueba.
const am = actualizado.user.app_metadata ?? {};
console.log("\n🔎 Comprobación (app_metadata del usuario):");
console.log(`   tenant_id = ${am.tenant_id}`);
console.log(`   rol       = ${am.rol}`);
console.log(`   salón     = ${salon.nombre}`);
console.log(
  "\n✔ Listo. La próxima vez que este usuario inicie sesión, su token llevará tenant_id y rol.\n",
);
