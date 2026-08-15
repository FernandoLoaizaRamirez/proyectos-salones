import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mensajeDeSubida } from "../../packages/sync/src/index";

/**
 * LO QUE SE LE DICE A UN INVITADO CUANDO ALGO FALLA AL SUBIR.
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTA SUITE (14 ago 2026):
 *   `comprimirImagen` lanzaba frases sueltas ("Imagen no válida."), y
 *   `mensajeDeSubida` no las reconocía, así que caían en el mensaje de reserva:
 *   **"Revisa tu conexión"**. O sea que un invitado elegía una foto que su
 *   teléfono no sabe abrir y la app lo mandaba a mirar el wifi en mitad de una
 *   boda. Buscaba un problema que no existía mientras se perdía la fiesta.
 *
 *   El fallo no estaba en el texto: estaba en que el error viajaba como PROSA.
 *   Cualquiera que añada un caso nuevo puede repetirlo sin darse cuenta, y por
 *   eso lo que se vigila aquí es la REGLA, no las frases.
 *
 * La regla, dicha corta: **"revisa tu conexión" es solo para la red.** Cualquier
 * otro fallo que sepamos nombrar tiene que decir algo que la persona pueda usar.
 */

const RAIZ = join(__dirname, "..", "..");
const leer = (...ruta: string[]) => readFileSync(join(RAIZ, ...ruta), "utf8");

/** Todos los fallos que hoy sabemos nombrar, y qué debería entender quien lee. */
const CONOCIDOS = [
  { codigo: "imagen-ilegible", pista: /otra/i },
  { codigo: "imagen-no-procesable", pista: /navegador|teléfono/i },
  { codigo: "archivo-muy-grande", pista: /25 MB/ },
  { codigo: "evento-sin-espacio", pista: /organiza/i },
  { codigo: "video-no-incluido", pista: /solo se pueden subir fotos/i },
  { codigo: "tope-de-subidas", pista: /espera/i },
  { codigo: "almacenamiento-lleno", pista: /espacio/i },
] as const;

describe("Cada fallo con nombre dice algo que la persona pueda usar", () => {
  for (const { codigo, pista } of CONOCIDOS) {
    it(`${codigo}: da un consejo útil y NO habla de la conexión`, () => {
      const msg = mensajeDeSubida(new Error(codigo));
      expect(msg).toMatch(pista);
      // La comprobación que de verdad importa: este es justo el fallo que hubo.
      expect(msg).not.toMatch(/conexión/i);
    });
  }

  it("un fallo desconocido SÍ manda a revisar la conexión (ahí es el consejo bueno)", () => {
    expect(mensajeDeSubida(new Error("algo-que-nadie-previo"))).toMatch(/conexión/i);
    expect(mensajeDeSubida(null)).toMatch(/conexión/i);
  });

  it("ningún mensaje se repite: si dos casos dicen lo mismo, uno sobra", () => {
    const textos = CONOCIDOS.map((c) => mensajeDeSubida(new Error(c.codigo)));
    expect(new Set(textos).size).toBe(CONOCIDOS.length);
  });

  it("a nadie se le habla de dinero, de planes ni de culpa", () => {
    // El invitado no contrató nada y no puede arreglar la factura de nadie.
    for (const { codigo } of CONOCIDOS) {
      expect(mensajeDeSubida(new Error(codigo))).not.toMatch(/pagar|plan|contrat|culpa/i);
    }
  });
});

describe("Los errores viajan como CÓDIGO, no como prosa", () => {
  const sync = leer("packages", "sync", "src", "index.ts");

  it("`comprimirImagen` distingue el archivo ilegible del navegador que no puede", () => {
    // Dos consejos distintos: con una foto rota se prueba otra; si el que falla
    // es el navegador, cambiar de foto no arregla nada.
    expect(sync).toMatch(/reject\(new Error\("imagen-ilegible"\)\)/);
    expect(sync).toMatch(/reject\(new Error\("imagen-no-procesable"\)\)/);
  });

  it("ya no quedan frases sueltas donde debería haber códigos", () => {
    // Son las que caían en "Revisa tu conexión" sin que nadie se enterara.
    expect(sync).not.toMatch(/new Error\("Imagen no válida\.?"\)/);
    expect(sync).not.toMatch(/new Error\("No se pudo procesar la imagen\.?"\)/);
  });
});

describe("Una sola copia de la compresión", () => {
  /**
   * El canvas estaba escrito TRES veces. Por eso arreglar el mensaje en un sitio
   * no lo arreglaba en los otros: el álbum suelto y el del portal tenían cada uno
   * su versión, con las frases viejas dentro.
   */
  const CON_CANVAS = 'createElement("canvas")';

  it("solo `@salones/sync` dibuja en canvas", () => {
    expect(leer("packages", "sync", "src", "index.ts")).toContain(CON_CANVAS);
  });

  for (const [cual, ruta] of [
    ["app suelta", join("apps", "album-fotos", "src", "lib", "album-data.ts")],
    ["portal", join("apps", "portal", "src", "modulos", "album", "lib.ts")],
    ["muro", join("apps", "muro", "src", "lib", "muro.ts")],
    ["muro del portal", join("apps", "portal", "src", "modulos", "muro", "lib.ts")],
  ] as const) {
    it(`${cual}: usa la compartida en vez de tener la suya`, () => {
      const fuente = leer(ruta);
      expect(fuente).not.toContain(CON_CANVAS);
      expect(fuente).toMatch(/from "@salones\/sync"/);
    });
  }
});
