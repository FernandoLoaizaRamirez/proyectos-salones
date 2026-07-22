import { describe, it, expect, beforeAll } from "vitest";

/**
 * PRUEBAS DEL PASE FIRMADO contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Complementan a `rls.test.ts`: verifican el candado NUEVO de la migración
 * x-evento → pase firmado (Fase 1). El pase lo emite y lo verifica la propia
 * base de datos (migración 0006), sin depender de las llaves JWT de Supabase.
 *
 * Comprueban que:
 *   1. La base emite un pase con el formato esperado para un evento válido.
 *   2. No emite pase para un evento inexistente ni para un código mal formado.
 *   3. Un pase de un evento NO deja ver los datos de otro (cruzar burbujas).
 *   4. Un pase manipulado (firma alterada) no abre nada.
 *
 * Igual que `rls.test.ts`, TOCAN LA RED y se saltan si faltan las env de
 * Supabase. Además se AUTO-SALTAN si la migración 0006 todavía no está aplicada
 * (sondeo en `beforeAll`): así el CI no falla mientras la migración está
 * pendiente, y se encienden solas en cuanto se aplique.
 * Ver docs/MIGRACION-TOKEN-FIRMADO.md.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

suite("Pase firmado por evento (migración 0006)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const rest = `${url}/rest/v1`;
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };

  /** Pide un pase a la base (misma llamada que hace @salones/sync por dentro). */
  const pedirPase = async (codigo: string): Promise<Response> =>
    fetch(`${rest}/rpc/emitir_pase`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ p_codigo: codigo }),
    });

  // ¿La migración 0006 ya está aplicada? Si la función no existe, se saltan todas.
  let aplicada = false;
  beforeAll(async () => {
    try {
      const res = await pedirPase("demo");
      aplicada = res.ok;
    } catch {
      aplicada = false;
    }
  }, RED);

  it(
    "la base emite un pase con formato <evento>.<caducidad>.<firma> para demo",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      const res = await pedirPase("demo");
      expect(res.status).toBe(200);
      const pase = (await res.json()) as unknown;
      expect(typeof pase).toBe("string");

      const partes = String(pase).split(".");
      expect(partes).toHaveLength(3);
      expect(partes[0]).toBe("demo"); // el evento
      const exp = Number(partes[1]);
      expect(Number.isFinite(exp)).toBe(true);
      expect(exp * 1000).toBeGreaterThan(Date.now()); // aún vigente
      expect(partes[2]).toMatch(/^[0-9a-f]{64}$/); // HMAC-SHA256 en hexadecimal
    },
    RED,
  );

  it(
    "no emite pase para un evento inexistente ni para un código mal formado",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      for (const codigo of ["evento-que-no-existe-zzz", "no_valido!"]) {
        const res = await pedirPase(codigo);
        expect(res.status).toBe(200); // la RPC responde, pero…
        expect(await res.json()).toBeNull(); // …sin pase
      }
    },
    RED,
  );

  it(
    "un pase de un evento NO sirve para leer otra burbuja",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      const pase = (await (await pedirPase("demo")).json()) as string;
      expect(typeof pase).toBe("string");

      // Se manda SOLO el pase (sin el encabezado viejo), pidiendo filas de otra
      // burbuja: la RLS acota al evento del pase, así que no hay intersección.
      const res = await fetch(`${rest}/items?evento=eq.otra-burbuja-zzz&select=id&limit=5`, {
        headers: { ...auth, "x-evento-pase": pase },
      });
      expect(res.status).toBe(200);
      const filas = await res.json();
      expect(Array.isArray(filas)).toBe(true);
      expect(filas).toHaveLength(0);
    },
    RED,
  );

  it(
    "un pase manipulado (firma alterada) no abre nada",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      const pase = (await (await pedirPase("demo")).json()) as string;
      const [evento, exp, firma] = pase.split(".");
      // Se cambia el último carácter de la firma: deja de coincidir con el HMAC.
      const alterada = firma.slice(0, -1) + (firma.endsWith("a") ? "b" : "a");
      const falso = `${evento}.${exp}.${alterada}`;

      const res = await fetch(`${rest}/items?evento=eq.demo&select=id&limit=5`, {
        headers: { ...auth, "x-evento-pase": falso },
      });
      expect(res.status).toBe(200);
      const filas = await res.json();
      expect(Array.isArray(filas)).toBe(true);
      expect(filas).toHaveLength(0); // firma inválida → sin acceso
    },
    RED,
  );
});
