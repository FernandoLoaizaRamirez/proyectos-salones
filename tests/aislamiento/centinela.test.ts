import { describe, it, expect, beforeAll } from "vitest";

/**
 * CENTINELA — ¿qué candados de seguridad están DE VERDAD encendidos?
 * ---------------------------------------------------------------------------
 * EL PROBLEMA QUE RESUELVE:
 *   Las suites de esta carpeta se auto-saltan cuando su migración o su función
 *   todavía no está desplegada. Es a propósito (así el CI no se pone rojo
 *   mientras el despliegue está pendiente), pero tiene un efecto feo: en el
 *   panel de GitHub, **una prueba saltada se ve igual que una que pasó**. Hoy
 *   hay 27 pruebas de seguridad dormidas y la palomita verde no lo dice.
 *
 *   Este centinela lo dice. No se salta: si hay conexión a Supabase, siempre
 *   corre y deja por escrito qué pieza está viva y cuál no.
 *
 * DOS MODOS:
 *   · Normal (el de hoy)  → informa y NO falla. El despliegue está en curso y
 *     un rojo permanente en el CI no ayudaría a nadie.
 *   · EXIGIR_SEGURIDAD=1  → falla si alguna pieza está apagada. Es el INTERRUPTOR
 *     que se enciende cuando termines la lista de encendido: a partir de ahí, si
 *     alguien revierte una migración o se cae una función, el CI se pone rojo.
 *     Se activa añadiendo `EXIGIR_SEGURIDAD: 1` al paso "Correr pruebas" de
 *     `.github/workflows/ci.yml`.
 *
 * También sirve a mano, como revisión ANTES de un evento:
 *   pnpm exec vitest run tests/aislamiento/centinela.test.ts
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

/** Con esto encendido, una pieza apagada pone el CI en rojo. */
const EXIGIR = process.env.EXIGIR_SEGURIDAD === "1";

type Pieza = {
  nombre: string;
  que: string;
  /** Qué queda sin comprobar mientras esta pieza esté apagada. */
  pruebasDormidas: number;
  viva: boolean;
  detalle: string;
};

suite("Centinela de seguridad — qué candados están encendidos", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };

  /** ¿Responde esta RPC con algo que no sea NULL? */
  const rpc = async (nombre: string, cuerpo: Record<string, string>): Promise<unknown> => {
    const res = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) return null;
    return res.json();
  };

  /**
   * ¿Está desplegada esta Edge Function?
   * Desplegada = contesta con SU PROPIO "sin permiso" (403). Un 404 es el
   * enrutador de funciones diciendo que no existe.
   */
  const funcionDesplegada = async (nombre: string): Promise<boolean> => {
    try {
      const res = await fetch(`${url}/functions/v1/${nombre}?e=demo`, { headers: auth });
      return res.status === 403;
    } catch {
      return false;
    }
  };

  const piezas: Pieza[] = [];

  beforeAll(async () => {
    const pase = await rpc("emitir_pase", { p_codigo: "demo" });
    piezas.push({
      nombre: "0006 · pase firmado del invitado",
      que: "cada evento es su propia burbuja",
      pruebasDormidas: 4,
      viva: typeof pase === "string",
      detalle: typeof pase === "string" ? "emite pases" : "la RPC emitir_pase no responde",
    });

    const paseAnfitrion = await rpc("emitir_pase_anfitrion", { p_codigo: "demo", p_clave: "" });
    piezas.push({
      nombre: "0009 · llave de anfitrión",
      que: "solo quien organiza puede BORRAR",
      pruebasDormidas: 6,
      viva: typeof paseAnfitrion === "string",
      detalle:
        typeof paseAnfitrion === "string"
          ? "emite pases de anfitrión"
          : "la migración 0009 no está aplicada",
    });

    for (const [funcion, nombre, que, dormidas] of [
      ["media-subir", "0010 · candado de las fotos", "subir exige permiso firmado", 5],
      ["media-ver", "0013 · fotos privadas", "las direcciones caducan", 5],
      ["diagnostico", "0012 · diagnóstico", "los fallos dejan rastro", 5],
      ["evento-cierre", "evento-cierre", "entregar y borrar una boda", 6],
    ] as const) {
      const viva = await funcionDesplegada(funcion);
      piezas.push({
        nombre,
        que,
        pruebasDormidas: dormidas,
        viva,
        detalle: viva ? `función ${funcion} desplegada` : `función ${funcion} SIN desplegar`,
      });
    }

    // El informe. Es lo que hace visible lo que hoy es invisible.
    const linea = (p: Pieza) =>
      `  ${p.viva ? "✅" : "💤"}  ${p.nombre.padEnd(32)} ${p.que.padEnd(34)} ${p.detalle}`;
    const dormidas = piezas.filter((p) => !p.viva);
    const total = dormidas.reduce((s, p) => s + p.pruebasDormidas, 0);

    console.log(
      [
        "",
        "┌─ CENTINELA DE SEGURIDAD " + "─".repeat(60),
        ...piezas.map(linea),
        "└" + "─".repeat(84),
        dormidas.length === 0
          ? "  Todas las piezas están encendidas."
          : `  ⚠️  ${dormidas.length} de ${piezas.length} piezas APAGADAS → ${total} pruebas de seguridad NO se están ejecutando.`,
        dormidas.length > 0 && !EXIGIR
          ? "     (informativo: pon EXIGIR_SEGURIDAD=1 para que esto ponga el CI en rojo)"
          : "",
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }, RED * 3);

  it(
    "el sondeo llegó a Supabase y midió todas las piezas",
    () => {
      // Si esto falla, el informe de arriba no vale: no se pudo medir nada.
      expect(piezas).toHaveLength(6);
      expect(piezas.every((p) => typeof p.viva === "boolean")).toBe(true);
    },
    RED,
  );

  it(
    "el pase firmado del invitado (0006) sigue en pie",
    () => {
      // Esta pieza YA está desplegada y es la base de todas las demás: si se
      // cayera, el candado de los eventos habría desaparecido. Se exige siempre.
      const base = piezas.find((p) => p.nombre.startsWith("0006"));
      expect(base?.viva, `la 0006 dejó de responder: ${base?.detalle}`).toBe(true);
    },
    RED,
  );

  it(
    "con EXIGIR_SEGURIDAD=1, ninguna pieza puede estar apagada",
    (ctx) => {
      if (!EXIGIR) {
        // Modo informativo: el despliegue está en curso, el informe ya quedó
        // arriba. Se salta A PROPÓSITO y el mensaje lo explica.
        return ctx.skip();
      }
      const dormidas = piezas.filter((p) => !p.viva);
      expect(
        dormidas.map((p) => `${p.nombre} (${p.detalle})`),
        "hay candados de seguridad apagados",
      ).toEqual([]);
    },
    RED,
  );
});
