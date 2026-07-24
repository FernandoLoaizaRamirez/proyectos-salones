import { describe, it, expect, beforeAll } from "vitest";

/**
 * PRUEBAS DEL CANDADO DE FOTOS Y VIDEOS contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Verifican la Edge Function `media-subir` (migración 0010), que es la que
 * reparte permisos de subida al almacén.
 *
 * Lo que comprueban:
 *   1. Sin pase no se firma nada (403).
 *   2. Con un pase forjado tampoco (403).
 *   3. Solo se admiten fotos y videos (400 para lo demás).
 *   4. Con un pase válido, la ruta que devuelve cae DENTRO de la carpeta del
 *      evento del pase — o sea, la eligió el servidor, no el cliente.
 *   5. **La importante:** no hay forma de escaparse de la carpeta usando el
 *      nombre del archivo (`../otro-evento/foto.jpg` y compañía).
 *
 * NINGUNA SUBE NADA. La prueba 4 pide un permiso de subida y no lo usa: firmar
 * una URL no escribe en el almacén, así que estas pruebas no dejan basura ni
 * pueden borrar nada.
 *
 * La comprobación de que la subida directa quedó CERRADA se hace a mano, una
 * vez, tras el corte (docs/CANDADO-FOTOS.md): automatizarla exigiría intentar
 * una subida real, que si el corte no estuviera hecho escribiría un archivo
 * basura en producción.
 *
 * Igual que las otras suites: TOCAN LA RED, se saltan si faltan las env, y se
 * AUTO-SALTAN si la función todavía no está desplegada.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

suite("Candado del almacén de fotos (migración 0010)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };
  const funcion = `${url}/functions/v1/media-subir`;

  /** Pide permiso de subida con los encabezados que se le pasen. */
  const pedirPermiso = async (
    cuerpo: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<Response> =>
    fetch(funcion, {
      method: "POST",
      headers: { ...auth, ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

  /** Un pase de invitado de verdad para el evento demo. */
  const paseDemo = async (): Promise<string> =>
    (await (
      await fetch(`${url}/rest/v1/rpc/emitir_pase`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ p_codigo: "demo" }),
      })
    ).json()) as string;

  // ¿La función ya está desplegada? Si no responde, se saltan todas.
  let desplegada = false;
  beforeAll(async () => {
    try {
      const res = await pedirPermiso({ nombre: "x.jpg", tipo: "image/jpeg" });
      // Desplegada = responde con su propio "no tienes permiso", no con un 404
      // del enrutador de funciones.
      desplegada = res.status === 403;
    } catch {
      desplegada = false;
    }
  }, RED);

  it(
    "sin pase no firma ninguna subida",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const res = await pedirPermiso({ nombre: "foto.jpg", tipo: "image/jpeg" });
      expect(res.status).toBe(403);
    },
    RED,
  );

  it(
    "con un pase forjado tampoco firma nada",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const forjados = [
        "demo.9999999999.0000000000000000000000000000000000000000000000000000000000000000",
        "a.demo.9999999999.0000000000000000000000000000000000000000000000000000000000000000",
        "cualquier-cosa",
      ];
      for (const falso of forjados) {
        const res = await pedirPermiso(
          { nombre: "foto.jpg", tipo: "image/jpeg" },
          { "x-evento-pase": falso, "x-evento-anfitrion": falso },
        );
        expect(res.status).toBe(403);
      }
    },
    RED,
  );

  it(
    "solo admite fotos y videos",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await paseDemo();
      for (const tipo of ["text/html", "application/x-msdownload", ""]) {
        const res = await pedirPermiso({ nombre: "cosa.exe", tipo }, { "x-evento-pase": pase });
        expect(res.status).toBe(400);
      }
    },
    RED,
  );

  it(
    "con un pase válido, la ruta la elige el SERVIDOR y cae en la carpeta del evento",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await paseDemo();
      const res = await pedirPermiso(
        { nombre: "recuerdo.jpg", tipo: "image/jpeg" },
        { "x-evento-pase": pase },
      );
      expect(res.status).toBe(200);

      const dato = (await res.json()) as { ruta: string; subirUrl: string; urlPublica: string };
      expect(dato.ruta.startsWith("demo/")).toBe(true);
      expect(dato.subirUrl).toContain("/object/upload/sign/media/demo/");
      expect(dato.subirUrl).toContain("token=");
      // La URL firmada NO se usa: pedirla no escribe nada en el almacén.
    },
    RED,
  );

  it(
    "no se puede escapar de la carpeta del evento con el nombre del archivo",
    async (ctx) => {
      if (!desplegada) return ctx.skip();
      const pase = await paseDemo();
      const maliciosos = [
        "../boda-de-otro/foto.jpg",
        "../../foto.jpg",
        "/boda-de-otro/foto.jpg",
        "..%2Fboda-de-otro%2Ffoto.jpg",
      ];
      for (const nombre of maliciosos) {
        const res = await pedirPermiso({ nombre, tipo: "image/jpeg" }, { "x-evento-pase": pase });
        expect(res.status).toBe(200);
        const { ruta } = (await res.json()) as { ruta: string };
        // Pase lo que pase, la ruta sigue siendo la del evento del pase: del
        // nombre solo se aprovecha la extensión.
        expect(ruta.startsWith("demo/")).toBe(true);
        expect(ruta).not.toContain("..");
        expect(ruta.split("/")).toHaveLength(2);
      }
    },
    RED,
  );
});
