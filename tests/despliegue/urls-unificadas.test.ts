/**
 * LAS URLS DE LAS APPS VIVEN EN UN SOLO LUGAR: @salones/directorio.
 *
 * Antes estaban copiadas en TRES: el catálogo (demoUrl de cada producto), el
 * portal (urlBase de cada módulo) y el script de comprobación — y el propio
 * script lo admitía: "si alguna cambia, se cambia ahí y aquí". El rediseño las
 * unificó; esta prueba impide que la duplicación vuelva a colarse.
 *
 * Se leen los ARCHIVOS como texto (patrón de vitrina-sitio.test.ts): importar
 * el catálogo arrastraría React e iconos a una prueba que solo busca cadenas.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MODULOS, URLS, baseDeModulo } from "@salones/directorio";

const leer = (relativa: string) =>
  readFileSync(fileURLToPath(new URL(`../../${relativa}`, import.meta.url)), "utf8");

const CONSUMIDORES = [
  "apps/catalogo/src/lib/catalogo.ts",
  "apps/portal/src/lib/modulos.ts",
  "scripts/comprobar-apps-al-dia.mjs",
];

describe("el directorio", () => {
  it("tiene las 14 apps, todas en https", () => {
    expect(Object.keys(URLS)).toHaveLength(14);
    for (const [id, url] of Object.entries(URLS)) {
      expect(url, id).toMatch(/^https:\/\/[a-z0-9-]+\.vercel\.app$/);
    }
  });

  it("los 9 módulos apuntan a apps que existen en el directorio", () => {
    expect(MODULOS).toHaveLength(9);
    for (const m of MODULOS) {
      expect(URLS[m.app], m.clave).toBeDefined();
      expect(baseDeModulo(m)).toBe(URLS[m.app]);
    }
  });

  it("los módulos internos del portal siguen siendo los 6 migrados", () => {
    const internos = MODULOS.filter((m) => m.rutaInterna).map((m) => m.clave);
    expect(internos).toEqual(["rsvp", "mesas", "album", "muro", "playlist", "dinamicas"]);
  });

  it("cada clave de módulo existe en FEATURES_CONOCIDAS de core", () => {
    // Antes las claves salían POR CONSTRUCCIÓN de core (F.Invitacion…); al
    // moverse al directorio quedaron como literales. Este es el candado: una
    // clave que core no conozca haría que `tieneFuncion` nunca dé true y la
    // tarjeta del módulo DESAPARECIERA del portal en silencio. Se lee el
    // archivo como texto (importar core arrastraría zod a esta prueba).
    const entitlements = leer("packages/core/src/entitlements.ts");
    const bloque = entitlements.match(/FEATURES_CONOCIDAS = \{([\s\S]*?)\} as const/)?.[1] ?? "";
    const conocidas = [...bloque.matchAll(/:\s*"([a-z-]+)"/g)].map((m) => m[1]);
    expect(conocidas.length).toBeGreaterThanOrEqual(9);
    for (const m of MODULOS) {
      expect(conocidas, `la clave "${m.clave}" no existe en core`).toContain(m.clave);
    }
  });
});

describe("los tres consumidores", () => {
  for (const ruta of CONSUMIDORES) {
    it(`${ruta} importa del directorio y no trae URLs quemadas`, () => {
      const fuente = leer(ruta);
      expect(fuente).toContain("@salones/directorio");
      // Ni una URL de app escrita a mano: la lista única es la única.
      expect(fuente).not.toMatch(/https:\/\/[a-z0-9-]+\.vercel\.app/);
    });
  }
});
