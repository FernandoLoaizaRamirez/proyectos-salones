import { describe, it, expect } from "vitest";

/**
 * REGRESIÓN de la migración 0008 (RLS por tenant/rol).
 * ---------------------------------------------------------------------------
 * La 0008 abre las tablas del plano de control al STAFF autenticado (rol
 * `authenticated`), acotado a su propio salón. Estas pruebas comprueban lo
 * contrario: que NADA de eso se filtró a la llave PÚBLICA anónima (rol `anon`),
 * que es la que usan los invitados. Es decir, que las políticas quedaron bien
 * escritas como `to authenticated` y deny-by-default.
 *
 * Complementa a `rls.test.ts` (que ya cubre varias de estas tablas) y añade la
 * cobertura de `subscriptions` (creada en 0005, posterior a aquella suite).
 *
 * TOCAN LA RED: solo corren si están las dos variables públicas de Supabase; sin
 * ellas la suite se SALTA (para que `pnpm test` local no falle). En CI se
 * inyectan desde los secrets. Ninguna prueba escribe datos.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);

const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

// Tablas que la 0008 abre SOLO al staff autenticado. Con la llave pública (anon)
// deben seguir sin devolver NADA.
const TABLAS_SOLO_STAFF = [
  "tenants",
  "tenant_members",
  "events",
  "guests",
  "tenant_entitlements",
  "event_overrides",
  "subscriptions",
] as const;

suite("RLS por tenant/rol: sigue cerrado al público (anon)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const rest = `${url}/rest/v1`;

  // Mismos encabezados que usa @salones/sync para hablar con PostgREST: `apikey`
  // siempre y, solo si la llave es "legacy" (JWT que empieza con eyJ), Bearer.
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };

  it.each(TABLAS_SOLO_STAFF)(
    'la tabla "%s" no expone filas con la llave pública tras la 0008',
    async (tabla) => {
      const res = await fetch(`${rest}/${tabla}?select=*&limit=1`, { headers: auth });
      if (res.ok) {
        // RLS `to authenticated` + rol anon = sin política aplicable → lista vacía.
        const filas = await res.json();
        expect(Array.isArray(filas)).toBe(true);
        expect(filas).toHaveLength(0);
      } else {
        // O bien el servidor rechaza de plano.
        await res.text().catch(() => {});
        expect([401, 403, 404]).toContain(res.status);
      }
    },
    RED,
  );
});
