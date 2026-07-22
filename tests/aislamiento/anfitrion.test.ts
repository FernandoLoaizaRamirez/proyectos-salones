import { describe, it, expect, beforeAll } from "vitest";

/**
 * PRUEBAS DE LA LLAVE DE ANFITRIÓN contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Complementan a `rls.test.ts` (candado por evento) y `pase.test.ts` (pase de
 * invitado). Aquí se verifica la SEGUNDA llave, la del organizador: la única
 * que permite borrar una vez hecho el corte de la migración 0009.
 *
 * Lo que comprueban:
 *   1. La base emite un pase de anfitrión con el formato a.<evento>.<exp>.<firma>.
 *   2. No lo emite sin llave, con llave equivocada, ni para un evento inventado.
 *   3. Un pase de INVITADO **no** sirve como pase de anfitrión (son universos de
 *      firma separados: secretos distintos y formatos distintos).
 *   4. Un pase de anfitrión de un evento no abre la burbuja de otro.
 *   5. Un pase de anfitrión con la firma alterada no abre nada.
 *   6. El pase de anfitrión sí está cableado a las políticas (abre lo suyo).
 *
 * TODAS SON DE SOLO LECTURA. No crean ni borran nada en la base: una prueba que
 * destruye datos cuando falla es peor que no tenerla. La comprobación final
 * —que borrar con pase de invitado queda rechazado tras el corte— se hace UNA
 * vez, a mano y con un evento de usar y tirar, siguiendo docs/LLAVE-ANFITRION.md.
 *
 * Igual que las otras suites: TOCAN LA RED, se saltan si faltan las env de
 * Supabase, y se AUTO-SALTAN si la migración 0009 todavía no está aplicada.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

suite("Llave de anfitrión (migración 0009)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const rest = `${url}/rest/v1`;
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };

  /** Pide un pase de ANFITRIÓN (misma llamada que hace @salones/sync). */
  const pedirPaseAnfitrion = async (codigo: string, clave: string): Promise<Response> =>
    fetch(`${rest}/rpc/emitir_pase_anfitrion`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ p_codigo: codigo, p_clave: clave }),
    });

  /** Pide un pase de INVITADO (el de la migración 0006). */
  const pedirPaseInvitado = async (codigo: string): Promise<Response> =>
    fetch(`${rest}/rpc/emitir_pase`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ p_codigo: codigo }),
    });

  /** Lee `items` presentando SOLO los encabezados que se le pasen. */
  const leerCon = async (evento: string, headers: Record<string, string>): Promise<unknown[]> => {
    const res = await fetch(
      `${rest}/items?evento=eq.${encodeURIComponent(evento)}&select=id&limit=5`,
      { headers: { ...auth, ...headers } },
    );
    expect(res.status).toBe(200);
    const filas = await res.json();
    expect(Array.isArray(filas)).toBe(true);
    return filas as unknown[];
  };

  // ¿La migración 0009 ya está aplicada? Si la función no existe, se saltan todas.
  let aplicada = false;
  beforeAll(async () => {
    try {
      const res = await pedirPaseAnfitrion("demo", "");
      aplicada = res.ok;
    } catch {
      aplicada = false;
    }
  }, RED);

  it(
    "emite un pase de anfitrión con formato a.<evento>.<caducidad>.<firma> para demo",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      const res = await pedirPaseAnfitrion("demo", "");
      expect(res.status).toBe(200);
      const pase = (await res.json()) as unknown;
      expect(typeof pase).toBe("string");

      const partes = String(pase).split(".");
      expect(partes).toHaveLength(4);
      expect(partes[0]).toBe("a"); // la marca que lo distingue del de invitado
      expect(partes[1]).toBe("demo"); // el evento
      const exp = Number(partes[2]);
      expect(Number.isFinite(exp)).toBe(true);
      expect(exp * 1000).toBeGreaterThan(Date.now()); // aún vigente
      expect(partes[3]).toMatch(/^[0-9a-f]{64}$/); // HMAC-SHA256 en hexadecimal
    },
    RED,
  );

  it(
    "no emite pase de anfitrión sin llave, con llave equivocada, ni para un evento inventado",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      const intentos: [string, string][] = [
        ["evento-que-no-existe-zzz", ""], // evento inventado, sin llave
        ["evento-que-no-existe-zzz", "0123456789abcdef0123456789abcdef"], // e inventado + llave inventada
        ["no_valido!", "0123456789abcdef"], // código mal formado
      ];
      for (const [codigo, clave] of intentos) {
        const res = await pedirPaseAnfitrion(codigo, clave);
        expect(res.status).toBe(200); // la RPC responde, pero…
        expect(await res.json()).toBeNull(); // …sin pase
      }
    },
    RED,
  );

  it(
    "un pase de INVITADO no sirve como pase de anfitrión",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      // Este es el corazón del asunto: el invitado tiene un pase válido (el
      // suyo), pero presentarlo como si fuera de anfitrión no le da poderes de
      // anfitrión. Firman secretos distintos y tienen formatos distintos.
      const paseInvitado = (await (await pedirPaseInvitado("demo")).json()) as string;
      expect(typeof paseInvitado).toBe("string");

      const filas = await leerCon("demo", { "x-evento-anfitrion": paseInvitado });
      expect(filas).toHaveLength(0); // no lo reconoce como anfitrión
    },
    RED,
  );

  it(
    "el pase de anfitrión SÍ abre su propia burbuja (está cableado a las políticas)",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      const paseAnfitrion = (await (await pedirPaseAnfitrion("demo", "")).json()) as string;
      const soloAnfitrion = await leerCon("demo", { "x-evento-anfitrion": paseAnfitrion });

      // Se compara con lo que ve el candado viejo: deben coincidir. Si el pase
      // de anfitrión no estuviera cableado, esto daría 0 y la otra lista no.
      const conHeaderViejo = await leerCon("demo", { "x-evento": "demo" });
      expect(soloAnfitrion.length).toBe(conHeaderViejo.length);
    },
    RED,
  );

  it(
    "un pase de anfitrión NO abre la burbuja de otro evento",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      const pase = (await (await pedirPaseAnfitrion("demo", "")).json()) as string;
      const filas = await leerCon("otra-burbuja-zzz", { "x-evento-anfitrion": pase });
      expect(filas).toHaveLength(0);
    },
    RED,
  );

  it(
    "un pase de anfitrión manipulado (firma alterada) no abre nada",
    async (ctx) => {
      if (!aplicada) return ctx.skip();
      const pase = (await (await pedirPaseAnfitrion("demo", "")).json()) as string;
      const [marca, evento, exp, firma] = pase.split(".");
      const alterada = firma.slice(0, -1) + (firma.endsWith("a") ? "b" : "a");

      const filas = await leerCon("demo", {
        "x-evento-anfitrion": `${marca}.${evento}.${exp}.${alterada}`,
      });
      expect(filas).toHaveLength(0); // firma inválida → sin acceso
    },
    RED,
  );
});
