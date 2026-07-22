import { describe, it, expect, beforeAll } from "vitest";

/**
 * PRUEBAS DE LAS DIRECCIONES QUE CADUCAN contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Verifican la Edge Function `media-ver` (migración 0013), que es la que
 * reparte direcciones de LECTURA firmadas una vez el bucket deja de ser público.
 *
 * Lo que comprueban:
 *   1. Sin pase no se firma nada.
 *   2. Con un pase forjado tampoco.
 *   3. **La importante:** con un pase válido de un evento, NO se firman rutas de
 *      otro evento. Sin esto, bastaría conocer el nombre de un archivo ajeno
 *      para sacar las fotos de otra boda.
 *   4. No se puede salir de la carpeta del evento (`..`, rutas absolutas,
 *      carpetas que solo *empiezan* igual: `demo-otra/`).
 *   5. Una petición legítima responde bien y solo devuelve rutas del evento.
 *
 * NINGUNA ESCRIBE NI BORRA NADA: firmar una dirección no toca el almacén, y las
 * direcciones que se obtienen no se usan.
 *
 * Se saltan solas si faltan las env o si la función no está desplegada.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

suite("Direcciones de lectura que caducan (migración 0013)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };
  const funcion = `${url}/functions/v1/media-ver`;

  const pedir = async (rutas: string[], headers: Record<string, string> = {}): Promise<Response> =>
    fetch(funcion, {
      method: "POST",
      headers: { ...auth, ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ rutas }),
    });

  const paseDemo = async (): Promise<string | null> => {
    const res = await fetch(`${url}/rest/v1/rpc/emitir_pase`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ p_codigo: "demo" }),
    });
    if (!res.ok) return null;
    const pase = await res.json();
    return typeof pase === "string" ? pase : null;
  };

  let desplegada = false;
  beforeAll(async () => {
    try {
      const res = await pedir(["demo/x.jpg"]);
      desplegada = res.status === 403; // su propio "sin permiso", no el 404 del router
    } catch {
      desplegada = false;
    }
  }, RED);

  it(
    "sin pase no firma ninguna dirección",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      expect((await pedir(["demo/foto.jpg"])).status).toBe(403);
    },
    RED,
  );

  it(
    "con un pase forjado tampoco",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const falso = "demo.9999999999." + "0".repeat(64);
      const res = await pedir(["demo/foto.jpg"], {
        "x-evento-pase": falso,
        "x-evento-anfitrion": `a.${falso}`,
      });
      expect(res.status).toBe(403);
    },
    RED,
  );

  it(
    "un pase de un evento NO firma rutas de otro evento",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await paseDemo();
      if (!pase) return ctx.skip();

      const ajenas = [
        "boda-de-otro/foto.jpg",
        "otro-evento-zzz/video.mp4",
        "demo-otra/foto.jpg", // empieza por "demo" pero NO es el evento demo
      ];
      const res = await pedir(ajenas, { "x-evento-pase": pase });
      expect(res.status).toBe(200);

      const { direcciones } = (await res.json()) as { direcciones: Record<string, string> };
      expect(Object.keys(direcciones)).toHaveLength(0);
    },
    RED,
  );

  it(
    "no se puede salir de la carpeta del evento",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await paseDemo();
      if (!pase) return ctx.skip();

      const trampas = [
        "demo/../boda-de-otro/foto.jpg",
        "../boda-de-otro/foto.jpg",
        "/demo/foto.jpg",
        "demo/subcarpeta/foto.jpg", // más hondo de lo que se guarda
        "demo/",
      ];
      const res = await pedir(trampas, { "x-evento-pase": pase });
      expect(res.status).toBe(200);

      const { direcciones } = (await res.json()) as { direcciones: Record<string, string> };
      expect(Object.keys(direcciones)).toHaveLength(0);
    },
    RED,
  );

  it(
    "una petición legítima responde bien y solo devuelve rutas del evento",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await paseDemo();
      if (!pase) return ctx.skip();

      // Se mezclan rutas del evento con ajenas: solo pueden volver las suyas.
      // (Puede que ninguna exista todavía; lo que se afirma es que jamás vuelve
      //  una que no sea de este evento.)
      const res = await pedir(["demo/prueba-inexistente.jpg", "boda-de-otro/foto.jpg"], {
        "x-evento-pase": pase,
      });
      expect(res.status).toBe(200);

      const { direcciones } = (await res.json()) as { direcciones: Record<string, string> };
      for (const ruta of Object.keys(direcciones)) {
        expect(ruta.startsWith("demo/")).toBe(true);
      }
    },
    RED,
  );
});
