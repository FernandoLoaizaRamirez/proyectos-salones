import { describe, it, expect, beforeAll } from "vitest";

/**
 * PRUEBAS DEL DIAGNÓSTICO contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Verifican la tabla `app_errores` (migración 0011) y la Edge Function
 * `diagnostico`.
 *
 * Lo que comprueban:
 *   1. El registro de fallos está CERRADO a la llave pública: ni se lee ni se
 *      escribe directamente. Solo entra por la función. Si alguien abriera esa
 *      tabla por descuido, el registro de errores de todos los salones quedaría
 *      a la vista.
 *   2. La revisión de un evento exige sesión de staff.
 *   3. Registrar un fallo valida lo que recibe.
 *   4. El camino feliz funciona de punta a punta.
 *
 * NOTA SOBRE LA ÚNICA PRUEBA QUE ESCRIBE: la 4 registra un fallo de mentira,
 * marcado como `prueba-automatica` para que se distinga de un fallo real en el
 * panel. Es una fila en una tabla de registro —diseñada para recibir ruido— y
 * se borra sola a los 30 días. Es el precio de comprobar que el aviso llega.
 *
 * Lo que NO se puede comprobar desde aquí: que el servidor recorta la query de
 * la dirección (donde viaja la llave de anfitrión). Para verlo haría falta leer
 * la tabla, y la tabla está cerrada — que es justamente lo que prueba el punto 1.
 * Ese recorte está cubierto por dos cosas: el cliente manda `location.pathname`,
 * que por construcción no lleva query, y el servidor la vuelve a cortar.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

suite("Diagnóstico (migración 0011 + función diagnostico)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const rest = `${url}/rest/v1`;
  const funcion = `${url}/functions/v1/diagnostico`;
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };

  let tablaAplicada = false;
  let desplegada = false;

  beforeAll(async () => {
    try {
      const res = await fetch(`${rest}/app_errores?select=id&limit=1`, { headers: auth });
      // Existe (aunque no deje leer) = la migración está aplicada.
      tablaAplicada = res.status !== 404;
    } catch {
      tablaAplicada = false;
    }
    try {
      const res = await fetch(funcion, { headers: { apikey: anon } });
      desplegada = res.status === 403; // su propio "sin sesión", no el 404 del router
    } catch {
      desplegada = false;
    }
  }, RED);

  it(
    "el registro de fallos NO se puede leer con la llave pública",
    async (ctx) => {
      if (!tablaAplicada) return ctx.skip();
      const res = await fetch(`${rest}/app_errores?select=*&limit=5`, { headers: auth });
      if (res.ok) {
        // RLS cerrada devuelve 200 con lista vacía.
        expect(await res.json()).toEqual([]);
      } else {
        expect([401, 403, 404]).toContain(res.status);
      }
    },
    RED,
  );

  it(
    "el registro de fallos NO se puede escribir con la llave pública",
    async (ctx) => {
      if (!tablaAplicada) return ctx.skip();
      const res = await fetch(`${rest}/app_errores`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ app: "intruso", tipo: "intruso" }),
      });
      // Rechazado por RLS. Si respondiera 2xx, cualquiera podría llenar la tabla.
      expect(res.ok).toBe(false);
      expect([401, 403, 404]).toContain(res.status);
    },
    RED,
  );

  it(
    "la revisión de un evento exige sesión de staff",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      for (const query of ["", "?e=demo"]) {
        const res = await fetch(`${funcion}${query}`, { headers: auth });
        expect(res.status).toBe(403);
      }
    },
    RED,
  );

  it(
    "registrar un fallo valida lo que recibe",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const invalidos = [{}, { app: "muro" }, { tipo: "sondeo" }];
      for (const cuerpo of invalidos) {
        const res = await fetch(funcion, {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        });
        expect(res.status).toBe(400);
      }
    },
    RED,
  );

  it(
    "un fallo bien formado se registra",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const res = await fetch(funcion, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "prueba-automatica",
          tipo: "sondeo",
          evento: "demo",
          mensaje: "fallo de mentira, generado por la suite de pruebas",
          ruta: "/pruebas",
        }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ registrado: true });
    },
    RED,
  );
});
