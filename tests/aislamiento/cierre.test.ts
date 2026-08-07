import { describe, it, expect, beforeAll } from "vitest";

/**
 * PRUEBAS DEL CIERRE DE EVENTO contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Verifican la Edge Function `evento-cierre`, que entrega el material de un
 * evento y —lo delicado— lo borra para siempre.
 *
 * CÓMO SE PRUEBA EL BORRADO SIN RIESGO:
 *   Las pruebas del camino destructivo usan un evento QUE NO EXISTE. La función
 *   comprueba la sesión ANTES de buscar el evento, así que:
 *     · si el candado funciona  → responde 403 y no mira nada (lo que afirmamos)
 *     · si el candado se rompe  → llega a buscar el evento, no lo encuentra, y
 *                                 devuelve 404 sin borrar nada (la prueba falla
 *                                 y avisa, pero no se pierde ni un dato)
 *   En los dos casos es imposible que la prueba destruya contenido real.
 *
 * Lo que comprueban:
 *   1. El inventario exige permiso (403 sin nada).
 *   2. Un pase de INVITADO no abre el inventario: hace falta el de anfitrión.
 *   3. El pase de ANFITRIÓN sí lo abre, y devuelve el inventario de SU evento.
 *   4. **Borrar sin sesión de staff → 403**, aunque se mande el pase de anfitrión.
 *   5. La llave pública no cuela como si fuera una sesión.
 *   6. Sin repetir el código del evento no se borra (400).
 *   7. **El inventario entrega direcciones FIRMADAS que abren de verdad.**
 *      Esta es la que caza la regresión del 5 ago 2026: la función repartía la
 *      dirección `/object/public/`, que quedó muerta con el corte de la 0013, así
 *      que la "entrega" bajaba cero fotos y aun así se ofrecía borrar la boda.
 *
 * Se saltan solas si faltan las env o si la función no está desplegada.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

/** Un evento que no existe: el camino destructivo nunca toca datos reales. */
const INEXISTENTE = "evento-de-prueba-que-no-existe-zzz";

suite("Cierre de evento (función evento-cierre)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const auth: Record<string, string> = { apikey: anon };
  const funcion = `${url}/functions/v1/evento-cierre`;

  const inventario = async (codigo: string, headers: Record<string, string> = {}) =>
    fetch(`${funcion}?e=${encodeURIComponent(codigo)}`, { headers: { ...auth, ...headers } });

  const borrar = async (cuerpo: Record<string, unknown>, headers: Record<string, string> = {}) =>
    fetch(funcion, {
      method: "POST",
      headers: { ...auth, ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

  const pedirPase = async (rpc: string, cuerpo: Record<string, string>): Promise<string | null> => {
    const res = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) return null;
    const pase = await res.json();
    return typeof pase === "string" ? pase : null;
  };

  let desplegada = false;
  beforeAll(async () => {
    try {
      const res = await inventario("demo");
      // Desplegada = contesta con su propio "sin permiso", no con el 404 del
      // enrutador de funciones.
      desplegada = res.status === 403;
    } catch {
      desplegada = false;
    }
  }, RED);

  it(
    "el inventario exige permiso",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      expect((await inventario("demo")).status).toBe(403);
    },
    RED,
  );

  it(
    "un pase de INVITADO no abre el inventario",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await pedirPase("emitir_pase", { p_codigo: "demo" });
      expect(typeof pase).toBe("string");
      // Se manda en las dos ranuras: ni así debe valer.
      const res = await inventario("demo", {
        "x-evento-pase": pase ?? "",
        "x-evento-anfitrion": pase ?? "",
      });
      expect(res.status).toBe(403);
    },
    RED,
  );

  it(
    "el pase de ANFITRIÓN abre el inventario de su evento",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await pedirPase("emitir_pase_anfitrion", { p_codigo: "demo", p_clave: "" });
      if (!pase) return ctx.skip(); // la 0009 todavía no está aplicada

      const res = await inventario("demo", { "x-evento-anfitrion": pase });
      expect(res.status).toBe(200);

      const inv = (await res.json()) as {
        evento: { codigo: string };
        resumen: { registros: number; archivos: number };
        registros: unknown[];
      };
      expect(inv.evento.codigo).toBe("demo");
      expect(typeof inv.resumen.registros).toBe("number");
      expect(inv.registros.length).toBe(inv.resumen.registros);
    },
    RED,
  );

  it(
    "el inventario entrega direcciones FIRMADAS que abren de verdad",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await pedirPase("emitir_pase_anfitrion", { p_codigo: "demo", p_clave: "" });
      if (!pase) return ctx.skip();

      const res = await inventario("demo", { "x-evento-anfitrion": pase });
      expect(res.status).toBe(200);

      const inv = (await res.json()) as {
        archivos: { nombre: string; url: string }[];
        sinFirmar?: number;
      };
      const primero = inv.archivos[0];
      // Sin archivos no hay nada que afirmar (el evento demo puede estar vacío).
      if (!primero) return ctx.skip();

      for (const a of inv.archivos) {
        // La pública responde 400 desde el corte de la 0013: si alguna vuelve a
        // colarse aquí, la entrega baja archivos rotos y esto tiene que avisar.
        expect(a.url, `archivo ${a.nombre}`).not.toContain("/object/public/");
        expect(a.url, `archivo ${a.nombre}`).toContain("/object/sign/");
        expect(a.url, `archivo ${a.nombre}`).toContain("token=");
      }
      expect(inv.sinFirmar).toBe(0);

      // Y que ABRA: una dirección firmada mal formada entregaría archivos vacíos
      // igual que antes del arreglo.
      expect((await fetch(primero.url)).status).toBe(200);
    },
    RED,
  );

  it(
    "BORRAR sin sesión de staff se rechaza, aunque se mande el pase de anfitrión",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await pedirPase("emitir_pase_anfitrion", { p_codigo: "demo", p_clave: "" });

      const res = await borrar(
        { e: INEXISTENTE, confirmar: INEXISTENTE },
        { "x-evento-anfitrion": pase ?? "" },
      );
      // 403 = el candado paró la petición antes de mirar nada.
      // (Si esto devolviera 404, el candado se habría roto: la petición habría
      //  llegado a buscar el evento. Nada se pierde porque no existe.)
      expect(res.status).toBe(403);
    },
    RED,
  );

  it(
    "la llave pública no cuela como si fuera una sesión de staff",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const res = await borrar(
        { e: INEXISTENTE, confirmar: INEXISTENTE },
        { Authorization: `Bearer ${anon}` },
      );
      expect(res.status).toBe(403);
    },
    RED,
  );

  it(
    "sin repetir el código del evento no se borra nada",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      for (const confirmar of ["", "otra-cosa", INEXISTENTE.toUpperCase()]) {
        const res = await borrar({ e: INEXISTENTE, confirmar });
        expect(res.status).toBe(400);
      }
    },
    RED,
  );
});
