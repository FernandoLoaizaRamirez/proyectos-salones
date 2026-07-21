import { describe, it, expect, afterEach } from "vitest";
import {
  porPuntaje,
  promedioAciertos,
  enlaceJugar,
  type Jugador,
} from "../../apps/catalogo/src/lib/dinamicas";

/**
 * PRUEBAS DEL TABLERO DE JUEGOS (`apps/catalogo/src/lib/dinamicas.ts`).
 * ---------------------------------------------------------------------------
 * De los tres juegos, el único colectivo es la TRIVIA, y su ranking se proyecta
 * en pantalla delante de todos los invitados. Aquí se fija:
 *
 *   - `porPuntaje`       → quién queda primero. Es lo que se proyecta; si el
 *                          desempate falla, se premia a quien no toca.
 *   - `promedioAciertos` → el número que se muestra junto al ranking.
 *   - `enlaceJugar`      → la dirección que va DENTRO DEL QR de la mesa.
 *
 * Son funciones puras: no tocan la red ni la base. Corren en cualquier sitio.
 */

const jugador = (p: Partial<Jugador>): Jugador => ({
  id: "1",
  nombre: "Alguien",
  aciertos: 0,
  total: 10,
  fecha: 0,
  ...p,
});

describe("porPuntaje — quién gana la trivia", () => {
  it("pone primero a quien más acertó", () => {
    const ranking = [
      jugador({ nombre: "Ana", aciertos: 5 }),
      jugador({ nombre: "Beto", aciertos: 9 }),
      jugador({ nombre: "Cris", aciertos: 7 }),
    ].sort(porPuntaje);
    expect(ranking.map((j) => j.nombre)).toEqual(["Beto", "Cris", "Ana"]);
  });

  it("a igualdad de aciertos gana quien terminó ANTES", () => {
    // Al revés que la playlist: aquí premia la rapidez, no la novedad.
    const ranking = [
      jugador({ nombre: "Lenta", aciertos: 8, fecha: 5000 }),
      jugador({ nombre: "Rapida", aciertos: 8, fecha: 1000 }),
    ].sort(porPuntaje);
    expect(ranking.map((j) => j.nombre)).toEqual(["Rapida", "Lenta"]);
  });

  it("quien terminó rapidísimo pero falló todo NO gana", () => {
    const ranking = [
      jugador({ nombre: "Veloz", aciertos: 0, fecha: 1 }),
      jugador({ nombre: "Acertada", aciertos: 4, fecha: 90_000 }),
    ].sort(porPuntaje);
    expect(ranking[0]!.nombre).toBe("Acertada");
  });

  it("con nadie jugando, o con un solo jugador, no se rompe", () => {
    expect([].sort(porPuntaje)).toEqual([]);
    const uno = [jugador({ nombre: "Solo" })];
    expect(uno.sort(porPuntaje).map((j) => j.nombre)).toEqual(["Solo"]);
  });
});

describe("promedioAciertos — el número que acompaña al ranking", () => {
  it("saca el promedio de la partida", () => {
    const jugadores = [jugador({ aciertos: 10 }), jugador({ aciertos: 6 }), jugador({ aciertos: 8 })];
    expect(promedioAciertos(jugadores)).toBe(8);
  });

  it("redondea a un decimal", () => {
    // 10 + 6 + 7 = 23 / 3 = 7.666… → 7.7
    const jugadores = [jugador({ aciertos: 10 }), jugador({ aciertos: 6 }), jugador({ aciertos: 7 })];
    expect(promedioAciertos(jugadores)).toBe(7.7);
  });

  it("si todavía no juega nadie, da 0 y no 'NaN'", () => {
    // Es lo que se proyecta antes de que empiece la trivia: un NaN en pantalla
    // delante de los invitados es exactamente lo que hay que evitar.
    expect(promedioAciertos([])).toBe(0);
    expect(Number.isNaN(promedioAciertos([]))).toBe(false);
  });

  it("con un solo jugador, el promedio son sus aciertos", () => {
    expect(promedioAciertos([jugador({ aciertos: 3 })])).toBe(3);
  });
});

describe("enlaceJugar — la dirección que va dentro del QR", () => {
  const PORTAL = process.env.NEXT_PUBLIC_PORTAL_URL;
  afterEach(() => {
    if (PORTAL === undefined) delete process.env.NEXT_PUBLIC_PORTAL_URL;
    else process.env.NEXT_PUBLIC_PORTAL_URL = PORTAL;
  });

  it("si hay portal configurado, manda al portal", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx";
    expect(enlaceJugar("boda-ana", "https://dinamicas.mx")).toBe(
      "https://portal.mx/dinamicas?e=boda-ana",
    );
  });

  it("le quita la barra final al portal para no generar '//'", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx/";
    expect(enlaceJugar("boda-ana", "")).toBe("https://portal.mx/dinamicas?e=boda-ana");
  });

  it("sin portal, cae en la app dinamicas de siempre", () => {
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
    expect(enlaceJugar("boda-ana", "https://dinamicas.mx")).toBe(
      "https://dinamicas.mx/jugar?e=boda-ana",
    );
  });

  it("sin portal y sin app, devuelve vacío en vez de un enlace roto", () => {
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
    expect(enlaceJugar("boda-ana", "")).toBe("");
  });

  it("codifica el código del evento (espacios y acentos no rompen el QR)", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx";
    const enlace = enlaceJugar("boda de Ana & José", "");
    expect(enlace).toBe("https://portal.mx/dinamicas?e=boda%20de%20Ana%20%26%20Jos%C3%A9");
    expect(enlace).not.toContain("&e");
  });
});
