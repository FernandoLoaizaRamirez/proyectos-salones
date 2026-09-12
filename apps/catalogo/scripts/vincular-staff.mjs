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
 * ⚠️ PARA DAR DE ALTA UN SALÓN NUEVO, usa `alta-salon.mjs`: hace esto y además
 * crea el salón y la cuenta. Este script se queda como puerta de atrás para
 * reparar altas viejas o cambiarle el rol a alguien.
 *
 * ── Cómo correrlo ────────────────────────────────────────────────────────────
 *   Lo más cómodo (funciona IGUAL en PowerShell y en bash), con las dos llaves
 *   en el .env.local de la raíz:
 *
 *     node --env-file=.env.local apps/catalogo/scripts/vincular-staff.mjs --user=<uuid>
 *
 *   Si prefieres pasarlas a mano, OJO que la sintaxis cambia según la consola:
 *     PowerShell : $env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; node ...
 *     bash       : SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ...
 *
 *   Opcionales:
 *     --tenant=<uuid>   salón (por defecto: el salón demo)
 *     --rol=owner       owner | admin | staff (por defecto: owner)
 */
import { createClient } from "@supabase/supabase-js";
import { ROLES, vincularStaff } from "./lib/vincular.mjs";

const TENANT_DEMO = "d0000000-0000-4000-8000-000000000001";

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

// 1) El salón (tenant) debe existir (migración 0002).
const { data: salon, error: eTenant } = await admin
  .from("tenants")
  .select("id,nombre")
  .eq("id", TENANT_ID)
  .maybeSingle();
if (eTenant) abortar(`Error consultando el salón: ${eTenant.message}`);
if (!salon) abortar(`Ese salón (tenant) no existe: ${TENANT_ID}. ¿Aplicaste la migración 0002?`);

// 2) Ligarlo. El cuerpo vive en ./lib/vincular.mjs porque lo comparte con
//    alta-salon.mjs: es el mismo código probado, no una copia.
const r = await vincularStaff({ admin, userId: USER_ID, tenantId: TENANT_ID, rol: ROL });
if (!r.ok) abortar(r.error);
console.log("✅ tenant_members: usuario ligado al salón.");
console.log("✅ app_metadata: identidad grabada en el token.");

// 3) Leer de vuelta y mostrar la prueba.
const am = r.appMetadata;
console.log("\n🔎 Comprobación (app_metadata del usuario):");
console.log(`   tenant_id = ${am.tenant_id}`);
console.log(`   rol       = ${am.rol}`);
console.log(`   salón     = ${salon.nombre}`);
console.log(
  "\n✔ Listo. La próxima vez que este usuario inicie sesión, su token llevará tenant_id y rol.\n",
);
