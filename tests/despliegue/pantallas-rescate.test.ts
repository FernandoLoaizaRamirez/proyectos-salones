import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * TODA APP TIENE QUE SABER FALLAR BIEN.
 * ---------------------------------------------------------------------------
 * Ninguna de las 14 apps tenía pantallas de rescate: cuando algo se rompía a
 * media fiesta, el invitado veía el mensaje que trae Next **en inglés, sin la
 * marca del salón y sin decir qué hacer**.
 *
 * Esta prueba es el candado para que una app NUEVA no se despliegue sin ellas.
 * Lee los archivos, así que corre sin Supabase y sin navegador: nunca se salta.
 */

const APPS = join(__dirname, "..", "..", "apps");

/** Las carpetas de `apps/` que son de verdad una app de Next. */
function appsDeNext(): string[] {
  return readdirSync(APPS).filter((d) => existsSync(join(APPS, d, "src", "app", "layout.tsx")));
}

const OBLIGATORIAS = [
  { archivo: "error.tsx", para: "algo revienta al pintar una pantalla" },
  { archivo: "not-found.tsx", para: "la dirección no existe (enlace o QR a medias)" },
  { archivo: "global-error.tsx", para: "revienta el armazón de la app" },
];

describe("Pantallas de rescate en todas las apps", () => {
  const apps = appsDeNext();

  it("hay apps que revisar (si esto falla, el descubridor está roto)", () => {
    expect(apps.length).toBeGreaterThanOrEqual(14);
  });

  for (const { archivo, para } of OBLIGATORIAS) {
    it(`todas tienen ${archivo} — ${para}`, () => {
      const sin = apps.filter((a) => !existsSync(join(APPS, a, "src", "app", archivo)));
      expect(sin, `sin ${archivo}: ${sin.join(", ")}`).toEqual([]);
    });
  }

  it("ninguna pantalla de rescate le enseña el error técnico al invitado", () => {
    // Un invitado no puede hacer nada con un stack trace, y enseñarlo delante de
    // la gente es justo lo que se quería evitar.
    const culpables: string[] = [];
    for (const app of apps) {
      for (const { archivo } of OBLIGATORIAS) {
        const ruta = join(APPS, app, "src", "app", archivo);
        if (!existsSync(ruta)) continue;
        const src = readFileSync(ruta, "utf8");
        if (/\{\s*error\.(message|stack|digest)\s*\}/.test(src)) culpables.push(`${app}/${archivo}`);
      }
    }
    expect(culpables).toEqual([]);
  });

  it("`global-error` no depende de la hoja de estilos", () => {
    // `global-error` sustituye al layout raíz, así que el CSS de la app NO se
    // carga. Si usara clases de Tailwind, saldría texto sin formato: tiene que ir
    // con estilos en línea (propios o del componente compartido).
    const culpables: string[] = [];
    for (const app of apps) {
      const ruta = join(APPS, app, "src", "app", "global-error.tsx");
      if (!existsSync(ruta)) continue;
      const src = readFileSync(ruta, "utf8");
      const usaTailwind = /className="[^"]*\b(bg-|text-|grid|flex|min-h-)/.test(src);
      if (usaTailwind) culpables.push(`${app}/global-error.tsx`);
    }
    expect(culpables).toEqual([]);
  });
});
