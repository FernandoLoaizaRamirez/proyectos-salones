import { describe, it, expect, beforeAll } from "vitest";

/**
 * ¿PUEDE UN INVITADO PISAR LO DE OTRO? — contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Comprueba el candado de la migración 0016. No se fía del SQL: pide un pase de
 * INVITADO de verdad —el mismo que consigue cualquiera que abra el enlace de la
 * boda por WhatsApp— y ataca.
 *
 * LO QUE SE MIDIÓ EL 9 AGO 2026, ANTES DEL CANDADO, con este mismo método:
 *   · vaciar el contenido de una fila ajena ......... HTTP 200
 *   · cambiarle el identificador .................... HTTP 200
 *   · MOVERLA A OTRA COLECCIÓN ...................... HTTP 200
 *   · falsear su fecha .............................. HTTP 200
 *   · UNA petición filtrada por colección ........... HTTP 200, 4 filas en blanco
 *
 * Las dos últimas son las graves. Todo se consulta filtrando por evento +
 * colección, así que mover una fila a una colección inventada la hace
 * desaparecer de TODAS las pantallas: un borrado con otro nombre, que rodea el
 * candado de la 0009 sin romperlo. Y no hace falta ir de una en una: una sola
 * petición deja el álbum entero y el muro entero en blanco.
 *
 * POR QUÉ NO DESTRUYE NADA, aunque ataque de verdad (misma regla que
 * `anfitrion.test.ts`: una prueba que destruye datos cuando falla es peor que
 * no tenerla):
 *   1. Trabaja sobre UNA fila suya, en la colección `zz-pruebas-candado`, que no
 *      pinta ninguna pantalla. Nunca toca contenido de nadie.
 *   2. El id es FIJO, así que repetirla no acumula basura: la crea la primera
 *      vez y la reutiliza siempre. Deja una fila en el evento `demo`, y solo una.
 *   3. Si el candado NO está puesto, la suite se SALTA ENTERA antes de atacar,
 *      diciendo por qué. Así el CI no se pone rojo por una migración que
 *      todavía no se ha corrido a mano.
 *
 * Igual que las otras suites: TOCA LA RED y se salta si faltan las env.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);
const suite = hayEnv ? describe : describe.skip;
const RED = 20000;

/** Colección de usar y tirar: NO está en la lista blanca, así que está cerrada. */
const COL = "zz-pruebas-candado";
/** Id fijo a propósito: repetir la prueba no deja una fila más cada vez. */
const ID = "ZZ-CANDADO-0016";
const EVENTO = "demo";

/**
 * Con que estados dice la base "de aqui no pasas".
 *
 * El candado usa el codigo 42501 de Postgres ("privilegios insuficientes") y es
 * PostgREST quien elige el numero de HTTP: 403 en unas versiones, 401 en otras.
 * El numero es un detalle suyo, no un contrato: se aceptan los dos.
 */
const FRENADO = [401, 403];

suite("Candado de sobrescritura (migración 0016)", () => {
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const rest = `${url}/rest/v1`;
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
    "Content-Type": "application/json",
  };

  let H: Record<string, string> = {};
  /** null = todavía no se sabe; true = el candado está puesto. */
  let candadoPuesto: boolean | null = null;

  const fila = `${rest}/items?evento=eq.${EVENTO}&coleccion=eq.${COL}&id=eq.${ID}`;

  /** Un ataque. Devuelve el estado y cuántas filas dice haber tocado. */
  const atacar = async (
    query: string,
    cuerpo: Record<string, unknown>,
  ): Promise<{ estado: number; filas: number }> => {
    const res = await fetch(query, {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) return { estado: res.status, filas: 0 };
    const j = (await res.json()) as unknown[];
    return { estado: res.status, filas: Array.isArray(j) ? j.length : 0 };
  };

  beforeAll(async () => {
    if (!hayEnv) return;

    // El pase de invitado: lo consigue cualquiera con el código del evento.
    const rp = await fetch(`${rest}/rpc/emitir_pase`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ p_codigo: EVENTO }),
    });
    if (!rp.ok) return;
    H = { ...auth, "x-evento-pase": (await rp.json()) as string };

    // La fila de pruebas: se crea SOLO si no existe. Si ya está, un upsert
    // sería un update sobre una colección cerrada y lo frenaría el candado.
    const hay = ((await (await fetch(`${fila}&select=id`, { headers: H })).json()) as unknown[])
      .length;
    if (hay === 0) {
      await fetch(`${rest}/items`, {
        method: "POST",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({
          evento: EVENTO,
          coleccion: COL,
          id: ID,
          dato: { nota: "Fila de PRUEBAS del candado 0016. No la pinta ninguna pantalla." },
        }),
      });
    }

    // ¿Está puesto el candado? Se prueba con lo más inocuo: cambiar `module`.
    // Si pasa, la migración no está corrida y no tiene sentido seguir.
    const sonda = await atacar(fila, { module: "sonda-candado" });
    // ⚠️ 401 **o** 403. El candado levanta un error de Postgres con el codigo
    // 42501, y PostgREST lo traduce a uno u otro segun su version: cuando se
    // escribio la 0016 daba 403 y el 14 ago 2026 daba 401. Mirar solo el 403
    // hacia que esta suite se declarara "no aplicada" y se saltara TODOS sus
    // casos —en verde— con el candado puesto y funcionando. Es justo el fallo
    // que estas pruebas existen para no tener.
    candadoPuesto = FRENADO.includes(sonda.estado);
    if (!candadoPuesto) {
      // Deshacer la sonda para no dejar la fila tocada.
      await atacar(fila, { module: COL });
    }
  }, RED);

  /** Salta el caso si el candado todavía no está corrido en la base. */
  const exigirCandado = (): boolean => {
    if (candadoPuesto === true) return true;
    console.warn(
      `⏭️  La migración 0016 no está aplicada en ${url} — se salta. ` +
        "Correr supabase/migrations/0016_candado_sobrescritura.sql en el SQL Editor.",
    );
    return false;
  };

  it(
    "no se puede VACIAR el contenido de una fila ajena",
    async () => {
      if (!exigirCandado()) return;
      const r = await atacar(fila, { dato: {} });
      expect(FRENADO).toContain(r.estado);
      expect(r.filas).toBe(0);
    },
    RED,
  );

  it(
    "no se puede ESCONDER una fila cambiándole la colección",
    async () => {
      // El peor de todos: rodea el candado de borrar de la 0009 sin romperlo.
      if (!exigirCandado()) return;
      const r = await atacar(fila, { coleccion: "una-coleccion-inventada" });
      expect(FRENADO).toContain(r.estado);
    },
    RED,
  );

  it(
    "no se puede SECUESTRAR el identificador de una fila",
    async () => {
      if (!exigirCandado()) return;
      const r = await atacar(fila, { id: "ZZ-SECUESTRADO" });
      expect(FRENADO).toContain(r.estado);
    },
    RED,
  );

  it(
    "no se puede FALSEAR la fecha de una fila",
    async () => {
      if (!exigirCandado()) return;
      const r = await atacar(fila, { creado: "2000-01-01T00:00:00Z" });
      expect(FRENADO).toContain(r.estado);
    },
    RED,
  );

  it(
    "UNA sola petición no puede vaciar la colección entera",
    async () => {
      // Sin nombrar ni un id: es como se vaciaría un álbum de verdad.
      if (!exigirCandado()) return;
      const r = await atacar(`${rest}/items?evento=eq.${EVENTO}&coleccion=eq.${COL}`, { dato: {} });
      expect(FRENADO).toContain(r.estado);
      expect(r.filas).toBe(0);
    },
    RED,
  );

  it(
    "después de todos los ataques, la fila sigue intacta",
    async () => {
      // Lo que de verdad importa: no es el código de estado, es que el recuerdo
      // siga ahí. Un 403 con la fila ya pisada no valdría de nada.
      if (!exigirCandado()) return;
      const filas = (await (
        await fetch(`${fila}&select=id,coleccion,dato`, { headers: H })
      ).json()) as { id: string; coleccion: string; dato: { nota?: string } }[];
      expect(filas).toHaveLength(1);
      expect(filas[0]?.coleccion).toBe(COL);
      expect(filas[0]?.dato?.nota).toMatch(/Fila de PRUEBAS/);
    },
    RED,
  );

  it(
    "DAR DE ALTA sigue abierto: el invitado puede seguir firmando el muro",
    async () => {
      // El candado no debe convertirse en "los invitados ya no participan".
      //
      // El id es FIJO y el POST va SIN `merge-duplicates`, así que la primera
      // vez da 201 y las siguientes 409 (choque de clave). Las dos respuestas
      // dicen lo mismo y es lo único que se quiere saber: la petición LLEGÓ a
      // la tabla, no la paró un permiso. Un 403 sí sería noticia. Y así no se
      // queda una fila más en el evento cada vez que corre la prueba.
      if (!exigirCandado()) return;
      const res = await fetch(`${rest}/items`, {
        method: "POST",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({
          evento: EVENTO,
          coleccion: COL,
          id: "ZZ-ALTA-0016",
          dato: { nota: "alta de prueba del candado 0016" },
        }),
      });
      expect([201, 409], `dar de alta devolvió ${res.status}`).toContain(res.status);
    },
    RED,
  );

  it(
    "al dar de alta NO se puede elegir la fecha (taparía el muro entero)",
    async () => {
      /*
       * El servidor sirve `order=creado.desc` y la suscripción se queda con las
       * 500 más recientes. Quien pueda ponerse su propia fecha puede clavar su
       * mensaje arriba del muro proyectado y, con unas cuantas filas fechadas
       * en el futuro, EMPUJAR FUERA de la ventana todo lo que subió la gente:
       * un apagón del muro y del álbum sin borrar ni una fila.
       *
       * Se manda una fecha absurda y se comprueba que la base la ignoró. Vale
       * tanto si la fila se acaba de crear como si ya existía de otra corrida
       * (en los dos casos su fecha es la de verdad, nunca 2099).
       */
      if (!exigirCandado()) return;
      const ID_FECHA = "ZZ-FECHA-0016";
      await fetch(`${rest}/items`, {
        method: "POST",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({
          evento: EVENTO,
          coleccion: COL,
          id: ID_FECHA,
          creado: "2099-01-01T00:00:00Z",
          dato: { nota: "alta con fecha falsa (prueba del candado 0016)" },
        }),
      });
      const filas = (await (
        await fetch(
          `${rest}/items?evento=eq.${EVENTO}&coleccion=eq.${COL}&id=eq.${ID_FECHA}&select=creado`,
          { headers: H },
        )
      ).json()) as { creado: string }[];
      expect(filas).toHaveLength(1);
      expect(
        new Date(filas[0]!.creado).getUTCFullYear(),
        "la base se tragó la fecha inventada",
      ).toBeLessThan(2099);
    },
    RED,
  );
});
