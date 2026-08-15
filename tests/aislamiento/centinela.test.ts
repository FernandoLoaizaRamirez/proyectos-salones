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

  /**
   * ¿Responde esta RPC con algo que no sea NULL?
   * Nunca lanza: si no hay red, es una pieza que no se pudo medir, no un error
   * que deba tumbar el informe entero.
   */
  const rpc = async (nombre: string, cuerpo: Record<string, string>): Promise<unknown> => {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  /**
   * ¿Está desplegada esta Edge Function?
   *
   * Desplegada = contesta ELLA. Sin desplegar = 404 del enrutador de funciones.
   *
   * Se mira "distinto de 404" y no "igual a 403" a propósito: `media-subir` y
   * `media-ver` solo aceptan POST y responden 405 a cualquier otra cosa. Dar por
   * apagada una función que contestó 405 sería una falsa alarma — y justo la que
   * aparecería el día que se desplieguen.
   */
  const sondearFuncion = async (
    nombre: string,
    metodo: "GET" | "POST",
  ): Promise<{ viva: boolean; estado: number | null }> => {
    try {
      const res = await fetch(`${url}/functions/v1/${nombre}?e=demo`, {
        method: metodo,
        headers: { ...auth, ...(metodo === "POST" ? { "Content-Type": "application/json" } : {}) },
        ...(metodo === "POST" ? { body: JSON.stringify({ e: "demo" }) } : {}),
      });
      return { viva: res.status !== 404, estado: res.status };
    } catch {
      return { viva: false, estado: null };
    }
  };

  /**
   * ¿Existe esta tabla en la base?
   *
   * PostgREST contesta **404** (`PGRST205`) a una tabla que no existe y **200**
   * a una que sí, aunque la RLS esconda todas sus filas y devuelva `[]`. Eso
   * permite medir una migración SIN ESCRIBIR NADA, que es la regla de esta
   * pantalla: el centinela mira, no toca.
   */
  const sondearTabla = async (tabla: string): Promise<{ viva: boolean; estado: number | null }> => {
    try {
      const res = await fetch(`${url}/rest/v1/${tabla}?select=*&limit=1`, { headers: auth });
      return { viva: res.status !== 404, estado: res.status };
    } catch {
      return { viva: false, estado: null };
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

    // El método importa: media-subir y media-ver SOLO aceptan POST.
    for (const [funcion, metodo, nombre, que, dormidas] of [
      ["media-subir", "POST", "0010 · candado de las fotos", "subir exige permiso firmado", 5],
      ["media-ver", "POST", "0013 · fotos privadas", "las direcciones caducan", 5],
      ["diagnostico", "GET", "0012 · diagnóstico", "los fallos dejan rastro", 5],
      ["evento-cierre", "GET", "evento-cierre", "entregar y borrar una boda", 6],
    ] as const) {
      const { viva, estado } = await sondearFuncion(funcion, metodo);
      piezas.push({
        nombre,
        que,
        pruebasDormidas: dormidas,
        viva,
        detalle: viva
          ? `función ${funcion} desplegada (responde ${estado})`
          : `función ${funcion} SIN desplegar${estado === null ? " (no respondió)" : ""}`,
      });
    }

    /*
     * 0016 · EL CANDADO DE SOBRESCRIBIR. La propia migración dejó escrito que
     * había que apuntarla aquí EN CUANTO se corriera, y no antes: mientras
     * estuviera pendiente habría puesto el CI en rojo por algo sabido. Se
     * corrió el 14 ago 2026, así que ya le toca.
     *
     * Se mide por su tabla, que es lo único que se puede mirar sin escribir.
     * ⚠️ Eso prueba que la migración PASÓ, no que el disparador siga
     * enganchado: quien lo comprueba de verdad —atacando— es
     * `sobrescritura.test.ts`, que con EXIGIR_SEGURIDAD=1 ya no puede saltarse
     * en silencio. Las dos juntas cubren el hueco: si se revierte la migración
     * entera, se cae esta; si alguien solo suelta el disparador, se cae la otra.
     */
    const candado0016 = await sondearTabla("items_reescribibles");
    piezas.push({
      nombre: "0016 · candado de sobrescribir",
      que: "nadie vacía lo que subió otro",
      pruebasDormidas: 8,
      viva: candado0016.viva,
      detalle: candado0016.viva
        ? "la lista blanca `items_reescribibles` existe"
        : `la migración 0016 no está aplicada${candado0016.estado === null ? " (no respondió)" : ""}`,
    });

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
      // Siete desde el 14 ago 2026, cuando entró el candado de la 0016.
      expect(piezas).toHaveLength(7);
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
