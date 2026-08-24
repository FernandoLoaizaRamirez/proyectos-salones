/**
 * LA MISMA IDENTIDAD EN TRES LUGARES, ATADA — el candado del rediseño.
 *
 * La identidad de la demo (Hacienda Santa Renata) vive tres veces, cada una
 * por una razón técnica que no se puede quitar:
 *
 *   1. `TEMA_DEMO` (este paquete) — la usan las vitrinas `demo-xxxxxx`, que NO
 *      existen en `events` (0022) y no pueden leer la base, y el modo local.
 *   2. La semilla 0026 en la base — la usa el evento `demo` real, vía la Edge
 *      Function `evento-config`.
 *   3. La paleta del sitio (apps/sitio-salon/src/app/globals.css) — el sitio
 *      NO consume tokens; la herencia corre al revés: la demo LO refleja.
 *
 * Si alguien cambia una copia y no las otras, el visitante ve DOS demos
 * distintas según el enlace por el que entró — exactamente lo contrario de lo
 * que el rediseño vende. Esta prueba pone el CI rojo antes de que pase.
 *
 * Se leen los ARCHIVOS, no se importan (el patrón de vitrina-sitio.test.ts):
 * el SQL no es importable, y el CSS del sitio tampoco.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { URLS } from "@salones/directorio";
import { DATOS_EVENTO_DEMO, EVENTO_DEMO, TEMA_DEMO, TEMA_DEMO_RESUELTO } from "./demo";

const leer = (relativa: string) =>
  readFileSync(fileURLToPath(new URL(relativa, import.meta.url)), "utf8");

/**
 * Un valor de variable CSS del bloque `:root` del sitio — DEL :root, no del
 * archivo entero: el `@theme inline` de arriba contiene `--radius:
 * var(--radius);` y una búsqueda global se lo tragaría primero.
 */
function varDelSitio(css: string, nombre: string): string {
  const raiz = css.match(/:root\s*\{([^}]+)\}/)?.[1];
  if (!raiz) throw new Error("No encontré el bloque :root en el globals.css del sitio");
  const valor = raiz.match(new RegExp(`${nombre}:\\s*([^;]+);`))?.[1];
  if (!valor) throw new Error(`No encontré ${nombre} en el :root del sitio`);
  return valor.trim();
}

describe("TEMA_DEMO refleja la paleta del sitio (globals.css)", () => {
  const css = leer("../../../../apps/sitio-salon/src/app/globals.css");

  it("primario = el vino del sitio", () => {
    expect(TEMA_DEMO.primario).toBe(varDelSitio(css, "--primary"));
  });
  it("texto sobre primario = el del sitio", () => {
    expect(TEMA_DEMO.primarioTexto).toBe(varDelSitio(css, "--primary-fg"));
  });
  it("acento = el oro del sitio (su --ring)", () => {
    expect(TEMA_DEMO.acento).toBe(varDelSitio(css, "--ring"));
  });
  it("fondo y tinta = los del sitio", () => {
    expect(TEMA_DEMO.fondo).toBe(varDelSitio(css, "--bg"));
    expect(TEMA_DEMO.tinta).toBe(varDelSitio(css, "--fg"));
  });
  it("radio = el del sitio", () => {
    expect(TEMA_DEMO.radio).toBe(varDelSitio(css, "--radius"));
  });
});

describe("TEMA_DEMO apunta al sitio que dice el directorio", () => {
  it("sitioUrl = URLS['sitio-salon'] — la 4.ª copia, atada", () => {
    // La constante no puede IMPORTAR el directorio (ui→directorio metería al
    // directorio en el radio de reconstrucción de las 14 apps, lo contrario
    // de su razón de ser: 2 builds por URL cambiada). El precio es esta
    // aserción: si el sitio se muda de dominio y solo se cambia el
    // directorio, el "volver a casa" de la demo apuntaría al dominio viejo.
    expect(TEMA_DEMO.sitioUrl).toBe(URLS["sitio-salon"]);
  });
});

describe("TEMA_DEMO coincide con la semilla 0026 (la base)", () => {
  const sql = leer("../../../../supabase/migrations/0026_semilla_demo_hacienda.sql");

  it("cada valor de la constante aparece en el SQL de la semilla", () => {
    for (const valor of [
      TEMA_DEMO.nombre,
      TEMA_DEMO.primario,
      TEMA_DEMO.primarioTexto,
      TEMA_DEMO.acento,
      TEMA_DEMO.fondo,
      TEMA_DEMO.tinta,
      TEMA_DEMO.radio,
      TEMA_DEMO.fuentes,
      TEMA_DEMO.sitioUrl,
    ]) {
      expect(valor).toBeDefined();
      expect(sql, `falta ${valor} en la 0026`).toContain(String(valor));
    }
  });

  it("el monograma y la frase del evento demo también", () => {
    expect(sql).toContain(String(EVENTO_DEMO.monograma));
    expect(sql).toContain(String(EVENTO_DEMO.frase));
  });
});

describe("el tema demo resuelto (lo que de verdad se pinta)", () => {
  it("arranca claro, con la pareja clásica y origen demo", () => {
    expect(TEMA_DEMO_RESUELTO.esquema).toBe("claro");
    expect(TEMA_DEMO_RESUELTO.fuentes).toBe("clasica");
    expect(TEMA_DEMO_RESUELTO.origen).toBe("demo");
  });

  it("ningún color de la demo se descartó al sanear", () => {
    expect(TEMA_DEMO_RESUELTO.colores.primario).toBe(TEMA_DEMO.primario);
    expect(TEMA_DEMO_RESUELTO.colores.acento).toBe(TEMA_DEMO.acento);
    expect(TEMA_DEMO_RESUELTO.colores.fondo).toBe(TEMA_DEMO.fondo);
    expect(TEMA_DEMO_RESUELTO.colores.tinta).toBe(TEMA_DEMO.tinta);
  });

  it("trae el nombre y la fecha de la muestra de siempre", () => {
    expect(TEMA_DEMO_RESUELTO.evento?.nombre).toBe(DATOS_EVENTO_DEMO.nombre);
    expect(TEMA_DEMO_RESUELTO.evento?.monograma).toBe("A·R");
  });
});
