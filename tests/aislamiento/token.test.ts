import { describe, it, expect, beforeAll } from "vitest";

/**
 * PRUEBAS DEL PASE FIRMADO (Edge Function `token`) contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Complementan a `rls.test.ts`: verifican el candado NUEVO (JWT firmado por
 * evento) de la migración x-evento → token (Fase 1). Comprueban que:
 *   1. La función emite un pase (JWT) para un evento válido.
 *   2. Rechaza códigos con formato inválido.
 *   3. Un pase de un evento NO deja leer los datos de otro (cruzar burbujas).
 *   4. Un token forjado/ inválido es rechazado por el servidor.
 *
 * Igual que `rls.test.ts`, TOCAN LA RED y se saltan si faltan las env de
 * Supabase. Además, se AUTO-SALTAN si la Edge Function `token` todavía no está
 * desplegada (sondeo en `beforeAll`): así el CI no falla mientras la migración
 * está a medio desplegar, y estas pruebas se ENCIENDEN solas en cuanto la
 * función existe. Ver docs/MIGRACION-TOKEN-FIRMADO.md.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

suite("Pase firmado por evento (Edge Function token)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const rest = `${url}/rest/v1`;
  const funciones = `${url}/functions/v1`;
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };

  // ¿La Edge Function ya está desplegada? Si no responde 200, se saltan todas.
  let desplegada = false;
  beforeAll(async () => {
    try {
      const res = await fetch(`${funciones}/token?e=demo`, { headers: auth });
      desplegada = res.ok;
    } catch {
      desplegada = false;
    }
  }, RED);

  it(
    "emite un pase (JWT de 3 partes) para un evento válido (demo)",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const res = await fetch(`${funciones}/token?e=demo`, { headers: auth });
      expect(res.status).toBe(200);
      const { token, exp } = (await res.json()) as { token?: string; exp?: number };
      expect(typeof token).toBe("string");
      expect((token ?? "").split(".")).toHaveLength(3); // cabecera.cuerpo.firma
      expect(typeof exp).toBe("number");
      expect((exp ?? 0) * 1000).toBeGreaterThan(Date.now()); // aún vigente
    },
    RED,
  );

  it(
    "rechaza un código de evento con formato inválido",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const res = await fetch(`${funciones}/token?e=no_valido!`, { headers: auth });
      await res.text().catch(() => {});
      expect(res.status).toBe(400);
    },
    RED,
  );

  it(
    "un pase de un evento NO sirve para leer otra burbuja",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      // Pase legítimo del evento demo…
      const t = await fetch(`${funciones}/token?e=demo`, { headers: auth });
      const { token } = (await t.json()) as { token?: string };
      expect(typeof token).toBe("string");
      // …usado para pedir filas de OTRA burbuja: la RLS lo acota al claim demo,
      // así que la intersección con el filtro es vacía.
      const res = await fetch(`${rest}/items?evento=eq.otra-burbuja-zzz&select=id&limit=5`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const filas = await res.json();
      expect(Array.isArray(filas)).toBe(true);
      expect(filas).toHaveLength(0);
    },
    RED,
  );

  it(
    "un token forjado/ inválido es rechazado",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const res = await fetch(`${rest}/items?select=id&limit=1`, {
        headers: { apikey: anon, Authorization: "Bearer no.es.un.jwt.valido" },
      });
      await res.text().catch(() => {});
      expect(res.ok).toBe(false);
      expect([401, 403]).toContain(res.status);
    },
    RED,
  );
});
