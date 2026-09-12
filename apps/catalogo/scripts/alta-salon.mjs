/**
 * ALTA DE UN SALÓN NUEVO, de un tirón.
 *
 * EL PROBLEMA QUE RESUELVE: dar de alta un cliente eran TRES pasos manuales y
 * dos de ellos exigían escribir SQL o entrar a la consola de Supabase:
 *   1) `insert into tenants` a mano,
 *   2) crear el usuario a mano en Supabase Auth (la pantalla /entrar solo hace
 *      login: no hay registro, a propósito),
 *   3) `node vincular-staff.mjs --user=… --tenant=…`.
 * Aquí es UN comando, e imprime al final las credenciales listas para pegar en
 * un WhatsApp.
 *
 * ES IDEMPOTENTE: correrlo dos veces deja lo mismo. Si el salón ya existe (por
 * su `slug`) lo reutiliza; si el correo ya tiene cuenta, la reutiliza sin
 * cambiarle la contraseña.
 *
 * POR QUÉ CREA LA CUENTA CON CONTRASEÑA Y NO MANDA UNA INVITACIÓN POR CORREO:
 * en el plan gratis de Supabase el correo integrado es de juguete (unos pocos
 * por hora y suele caer en spam). Cerrar una venta, apretar el botón y quedarte
 * sin nada que enviarle al cliente es peor que un comando feo que sí entrega
 * credenciales.
 *
 * ── Cómo correrlo ────────────────────────────────────────────────────────────
 *   Con las dos llaves en el .env.local de la raíz (que ya está en .gitignore).
 *   Esta línea funciona IGUAL en PowerShell y en bash:
 *
 *     node --env-file=.env.local apps/catalogo/scripts/alta-salon.mjs \
 *       --nombre="Jardín Los Encinos" --slug=los-encinos --correo=ana@losencinos.mx
 *
 *   Al .env.local le hacen falta una sola vez:
 *     SUPABASE_URL=https://<proyecto>.supabase.co
 *     SUPABASE_SERVICE_ROLE_KEY=<la llave secreta: Project Settings → API>
 *
 *   Opcionales:
 *     --plan=gestionado    (por defecto)   --ciudad="Culiacán"
 *     --rol=owner          (por defecto)
 *
 *   Si prefieres pasar las llaves a mano, OJO que la sintaxis cambia:
 *     PowerShell : $env:SUPABASE_URL="..."; node apps/catalogo/scripts/alta-salon.mjs ...
 *     bash       : SUPABASE_URL=... node apps/catalogo/scripts/alta-salon.mjs ...
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ROLES, vincularStaff } from "./lib/vincular.mjs";

const SITIO = "https://suite-salones.vercel.app";

/** Lee un argumento --nombre=valor de la línea de comandos. */
const arg = (nombre) => {
  const prefijo = `--${nombre}=`;
  const hallado = process.argv.find((a) => a.startsWith(prefijo));
  return hallado ? hallado.slice(prefijo.length) : undefined;
};

function abortar(mensaje) {
  console.error(`\n❌ ${mensaje}\n`);
  process.exit(1);
}

const URL_SUPABASE = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const NOMBRE = arg("nombre");
const SLUG = arg("slug");
const CORREO = arg("correo");
const CIUDAD = arg("ciudad") ?? null;
const PLAN = arg("plan") ?? "gestionado";
const ROL = arg("rol") ?? "owner";

// Validación a mano, que son cuatro argumentos. NADA de zod aquí: el catálogo
// no lo declara, añadirlo tocaría el lockfile de la raíz y el portero de Vercel
// reconstruiría LAS 14 APPS por un renglón.
if (!URL_SUPABASE) abortar("Falta SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL).");
if (!SERVICE_ROLE)
  abortar("Falta SUPABASE_SERVICE_ROLE_KEY (la llave secreta de administrador, NO la publishable).");
if (!NOMBRE) abortar('Falta el nombre del salón. Ejemplo: --nombre="Jardín Los Encinos"');
if (!SLUG || !/^[a-z0-9-]{2,40}$/.test(SLUG))
  abortar('Falta un identificador corto válido. Ejemplo: --slug=los-encinos (minúsculas y guiones)');
if (!CORREO || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(CORREO))
  abortar("Falta el correo de quien va a entrar al panel. Ejemplo: --correo=ana@losencinos.mx");
if (!ROLES.includes(ROL)) abortar(`Rol inválido: "${ROL}". Debe ser uno de: ${ROLES.join(", ")}.`);

const admin = createClient(URL_SUPABASE, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("\n🏛  Alta de salón");
console.log(`   Salón  : ${NOMBRE} (${SLUG})`);
console.log(`   Cuenta : ${CORREO}`);
console.log(`   Plan   : ${PLAN}\n`);

// ── 1) El salón ─────────────────────────────────────────────────────────────
// Se busca por `slug` (que es unique desde la 0002) para que correrlo dos veces
// no cree dos salones con el mismo nombre.
const { data: existente, error: eBusca } = await admin
  .from("tenants")
  .select("id,nombre")
  .eq("slug", SLUG)
  .maybeSingle();
if (eBusca) abortar(`Error consultando salones: ${eBusca.message}`);

let tenantId = existente?.id;
if (tenantId) {
  console.log(`ℹ️  El salón ya existía (${existente.nombre}); se reutiliza.`);
} else {
  tenantId = randomUUID();
  const { error } = await admin
    .from("tenants")
    .insert({ id: tenantId, nombre: NOMBRE, slug: SLUG, ciudad: CIUDAD, plan_id: PLAN });
  if (error) abortar(`No pude crear el salón: ${error.message}`);
  console.log("✅ tenants: salón creado.");
}

// ── 2) La cuenta ────────────────────────────────────────────────────────────
// `listUsers` no filtra por correo en todas las versiones del SDK, así que se
// recorre la primera página: para el volumen de este proyecto sobra.
let userId;
let contrasena = null;
const { data: lista, error: eLista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (eLista) abortar(`No pude consultar las cuentas: ${eLista.message}`);
const yaTiene = (lista?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === CORREO.toLowerCase());

if (yaTiene) {
  userId = yaTiene.id;
  console.log("ℹ️  Ese correo ya tenía cuenta; se reutiliza (no se le cambia la contraseña).");
} else {
  // Contraseña temporal legible: base64url sin caracteres que se confundan al
  // dictarla por teléfono.
  contrasena = randomBytes(9).toString("base64url").replace(/[-_]/g, "x");
  const { data, error } = await admin.auth.admin.createUser({
    email: CORREO,
    password: contrasena,
    email_confirm: true,
  });
  if (error || !data?.user) abortar(`No pude crear la cuenta: ${error?.message ?? "sin usuario"}`);
  userId = data.user.id;
  console.log("✅ auth: cuenta creada.");
}

// ── 3) Ligarla al salón (mismo código probado que vincular-staff.mjs) ───────
const r = await vincularStaff({ admin, userId, tenantId, rol: ROL });
if (!r.ok) abortar(r.error);
console.log("✅ tenant_members + app_metadata: la cuenta ya es del salón.");

// ── 4) La marca, casi en blanco ─────────────────────────────────────────────
// Solo el nombre: que el salón se vista solo es parte de la venta (mismo
// criterio que la caja de arena de la 0029).
const { error: eMarca } = await admin
  .from("tenant_branding")
  .upsert({ tenant_id: tenantId, nombre: NOMBRE }, { onConflict: "tenant_id" });
if (eMarca) console.warn(`⚠️  No pude sembrar la marca: ${eMarca.message}`);
else console.log("✅ tenant_branding: marca inicial puesta.");

// ── 5) La fila legal, VACÍA y sin publicar ──────────────────────────────────
// A propósito: así el aviso ámbar del panel se enciende desde el minuto uno y
// el salón sabe qué le falta. Si la 0033 no está corrida, se avisa y ya.
const { error: eLegal } = await admin
  .from("tenant_legal")
  .upsert({ tenant_id: tenantId, publicado: false }, { onConflict: "tenant_id" });
if (eLegal)
  console.warn(`⚠️  No pude preparar los datos legales (¿falta correr la 0033?): ${eLegal.message}`);
else console.log("✅ tenant_legal: pendiente de que el salón lo rellene.");

// ── 6) Lo que se le manda al cliente ────────────────────────────────────────
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Para mandarle al salón por WhatsApp:\n");
console.log(`  Entra aquí:   ${SITIO}/entrar`);
console.log(`  Correo:       ${CORREO}`);
if (contrasena) console.log(`  Contraseña:   ${contrasena}     (cámbiala al entrar)`);
else console.log("  Contraseña:   la que ya tenía esa cuenta");
console.log(`\n  Lo PRIMERO que tiene que hacer: ${SITIO}/panel/legal`);
console.log("  Ahí pone su razón social, su domicilio y su correo, y aprieta Publicar.");
console.log("  Hasta que lo haga, el aviso de privacidad de sus eventos no lleva sus datos.");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log(`   (salón ${tenantId})\n`);
