import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

/**
 * PRUEBAS DEL PORTERO DE CONSTRUCCIONES (`scripts/vercel-construir-si-cambio.mjs`).
 * ---------------------------------------------------------------------------
 * POR QUÉ IMPORTAN: este script decide, app por app, si Vercel construye o se
 * salta. Equivocarse hacia un lado cuesta cuota; equivocarse hacia el OTRO deja
 * una app vieja en producción el día del evento, y nadie se entera. Su REGLA DE
 * ORO es "ante la duda, construir", y eso es justo lo que aquí se fija por
 * escrito para que nadie la rompa sin darse cuenta.
 *
 * CÓMO ESTÁN HECHAS: no se prueban funciones sueltas — el script no exporta
 * nada, es un ejecutable que responde con un CÓDIGO DE SALIDA. Así que se monta
 * un monorepo de mentira en una carpeta temporal (con sus apps, sus paquetes y
 * su historial de git de verdad), se COPIA DENTRO EL SCRIPT REAL, y se le pide
 * que decida. Se comprueba lo único que Vercel mira: el código de salida.
 *
 *   código 1 = CONSTRUIR      código 0 = SALTAR    (los define Vercel, van al revés)
 *
 * El monorepo de mentira imita la forma del de verdad:
 *
 *   apps/miapp   → depende de @salones/ui   (es la app que se evalúa)
 *   apps/otra    → no depende de nada
 *   packages/ui  → depende de @salones/core (dependencia DIRECTA de miapp)
 *   packages/core                            (dependencia TRANSITIVA de miapp)
 *   packages/suelto                          (no lo usa nadie)
 *   docs/
 */

const CONSTRUIR = 1;
const SALTAR = 0;

/** El script de verdad, tal cual vive en el repo. */
const SCRIPT_REAL = resolve(__dirname, "../../scripts/vercel-construir-si-cambio.mjs");

let raiz = "";
let base = "";

/** Corre git dentro del monorepo de mentira. Lanza si git falla. */
function git(...args: string[]): string {
  const r = spawnSync("git", args, { cwd: raiz, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} falló: ${r.stderr}`);
  return r.stdout.trim();
}

function escribir(ruta: string, contenido: string): void {
  const completa = join(raiz, ruta);
  mkdirSync(join(completa, ".."), { recursive: true });
  writeFileSync(completa, contenido);
}

function paquete(ruta: string, nombre: string, deps: string[] = []): void {
  escribir(
    `${ruta}/package.json`,
    JSON.stringify({
      name: nombre,
      version: "0.0.0",
      dependencies: Object.fromEntries(deps.map((d) => [d, "workspace:*"])),
    }),
  );
}

/**
 * El caso de prueba completo: parte del commit BASE, aplica los cambios que se
 * le pasen, los commitea y le pregunta al portero qué hacer.
 *
 * @param cambios  archivo → contenido nuevo (rutas relativas a la raíz)
 * @param app      carpeta desde la que Vercel llamaría al script
 */
function decidir(
  cambios: Record<string, string>,
  {
    app = "apps/miapp",
    desde = base,
    hasta = "",
    entorno = {} as Record<string, string>,
  } = {},
): { codigo: number; salida: string } {
  git("reset", "--hard", base);
  for (const [ruta, contenido] of Object.entries(cambios)) escribir(ruta, contenido);
  if (Object.keys(cambios).length > 0) {
    git("add", "-A");
    git("commit", "-m", "caso de prueba");
  }
  const actual = hasta || git("rev-parse", "HEAD");

  // `undefined` en el env significa "esta variable no viene" (primera construcción).
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  delete env.VERCEL_GIT_PREVIOUS_SHA;
  delete env.VERCEL_ENV;
  delete env.VERCEL_GIT_COMMIT_REF;
  if (desde) env.VERCEL_GIT_PREVIOUS_SHA = desde;
  env.VERCEL_GIT_COMMIT_SHA = actual;
  Object.assign(env, entorno);

  const r = spawnSync("node", [join(raiz, "scripts", "vercel-construir-si-cambio.mjs")], {
    cwd: join(raiz, app),
    encoding: "utf8",
    env,
  });
  return { codigo: r.status ?? -1, salida: `${r.stdout}${r.stderr}` };
}

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), "portero-"));

  // ── El monorepo de mentira ────────────────────────────────────────────────
  escribir("package.json", JSON.stringify({ name: "raiz-falsa", private: true }));
  escribir("pnpm-workspace.yaml", 'packages:\n  - "apps/*"\n  - "packages/*"\n');
  escribir("pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
  escribir("turbo.json", JSON.stringify({ tasks: {} }));
  escribir("docs/algo.md", "documentación\n");

  paquete("packages/core", "@salones/core");
  paquete("packages/ui", "@salones/ui", ["@salones/core"]);
  paquete("packages/suelto", "@salones/suelto");
  paquete("apps/miapp", "miapp", ["@salones/ui"]);
  paquete("apps/otra", "otra");
  escribir("apps/miapp/src/pagina.tsx", "export default function P() {}\n");
  escribir("apps/otra/src/pagina.tsx", "export default function P() {}\n");

  // El script REAL, para que lo que se prueba sea el de producción y no una copia.
  mkdirSync(join(raiz, "scripts"), { recursive: true });
  copyFileSync(SCRIPT_REAL, join(raiz, "scripts", "vercel-construir-si-cambio.mjs"));

  git("init", "-q", "-b", "main");
  git("config", "user.email", "pruebas@salones.test");
  git("config", "user.name", "Pruebas");
  // Que la prueba no dependa de la configuración global de quien la corra: en
  // Windows `autocrlf` está en `true` y git se niega a indexar estos archivos.
  git("config", "core.autocrlf", "false");
  git("config", "core.safecrlf", "false");
  git("add", "-A");
  git("commit", "-q", "-m", "monorepo de mentira");
  base = git("rev-parse", "HEAD");
});

afterAll(() => {
  if (raiz) rmSync(raiz, { recursive: true, force: true });
});

describe("El portero CONSTRUYE cuando el cambio le toca a la app", () => {
  it("cambió un archivo de la propia app", () => {
    const { codigo, salida } = decidir({ "apps/miapp/src/pagina.tsx": "// tocado\n" });
    expect(codigo).toBe(CONSTRUIR);
    expect(salida).toContain("apps/miapp/src/pagina.tsx");
  });

  it("cambió un paquete del que depende DIRECTAMENTE (@salones/ui)", () => {
    const { codigo } = decidir({ "packages/ui/src/boton.tsx": "// tocado\n" });
    expect(codigo).toBe(CONSTRUIR);
  });

  it("cambió un paquete del que depende SIN SABERLO — dependencia transitiva", () => {
    // miapp → @salones/ui → @salones/core. Nadie declara `core` en miapp, pero
    // si `core` cambia, miapp queda vieja. Este es el caso que más fácil se rompe.
    const { codigo } = decidir({ "packages/core/src/motor.ts": "// tocado\n" });
    expect(codigo).toBe(CONSTRUIR);
  });

  it("cambió la configuración de la raíz (el lockfile)", () => {
    const { codigo } = decidir({ "pnpm-lock.yaml": "lockfileVersion: '9.0'\n# otra dep\n" });
    expect(codigo).toBe(CONSTRUIR);
  });

  it("cambió el propio portero — ante un cambio en scripts/, no se fía", () => {
    const { codigo } = decidir({ "scripts/otra-cosa.mjs": "// tocado\n" });
    expect(codigo).toBe(CONSTRUIR);
  });
});

describe("El portero SALTA cuando el cambio no le toca a la app", () => {
  it("solo cambió documentación", () => {
    const { codigo } = decidir({ "docs/algo.md": "otra cosa\n" });
    expect(codigo).toBe(SALTAR);
  });

  it("solo cambió OTRA app", () => {
    const { codigo } = decidir({ "apps/otra/src/pagina.tsx": "// tocado\n" });
    expect(codigo).toBe(SALTAR);
  });

  it("cambió un paquete que esta app no usa", () => {
    const { codigo } = decidir({ "packages/suelto/src/nada.ts": "// tocado\n" });
    expect(codigo).toBe(SALTAR);
  });

  it("desde la carpeta de OTRA app, un cambio en miapp no la construye", () => {
    // La carpeta se deduce del cwd, no del nombre del paquete: se comprueba que
    // cada app decide por SÍ MISMA y no arrastra a las demás.
    const { codigo } = decidir({ "apps/miapp/src/pagina.tsx": "// tocado\n" }, { app: "apps/otra" });
    expect(codigo).toBe(SALTAR);
  });
});

describe("Regla de oro: ante la duda, CONSTRUIR", () => {
  it("primera construcción de la app (Vercel no manda commit anterior)", () => {
    const { codigo, salida } = decidir({ "docs/algo.md": "otra cosa\n" }, { desde: "" });
    // Aunque solo cambió documentación: sin con qué comparar, se construye.
    expect(codigo).toBe(CONSTRUIR);
    expect(salida).toContain("primera construcción");
  });

  it("el commit anterior no existe en el clon (clon superficial)", () => {
    const { codigo } = decidir(
      { "docs/algo.md": "otra cosa\n" },
      { desde: "0000000000000000000000000000000000000000" },
    );
    expect(codigo).toBe(CONSTRUIR);
  });

  it("nos llaman desde una carpeta sin package.json", () => {
    const { codigo } = decidir({ "docs/algo.md": "otra cosa\n" }, { app: "docs" });
    expect(codigo).toBe(CONSTRUIR);
  });

  /**
   * EL COMMIT VACÍO TIENE QUE CONSTRUIR. Esta prueba decía lo contrario —que se
   * saltara— hasta el 16 ago 2026, y esa regla costó caro: `suite-salones` estuvo
   * DOS DÍAS con precios viejos en producción teniendo el arreglo ya fusionado.
   *
   * Lo que pasó: se empujó un commit vacío para forzar el redespliegue, que es el
   * truco de siempre cuando la app en vivo se quedó atrás. Vercel lo comparó
   * contra su padre, vio cero archivos, este portero dijo SALTAR, y Vercel lo
   * canceló con "este proyecto no fue afectado".
   *
   * Cero archivos NO es "no hay nada que hacer": es "no me consta que lo haya", y
   * eso cae de lleno en la regla de oro de este bloque. Cuesta cuota —14 apps por
   * commit vacío— pero pasa muy poco, y ya pagamos el precio de equivocarnos al
   * otro lado.
   */
  it("no cambió ningún archivo: es el commit vacío que pide un redespliegue", () => {
    const { codigo, salida } = decidir({}, { hasta: base });
    expect(codigo).toBe(CONSTRUIR);
    // El motivo se imprime en el registro de Vercel: sin él, quien vea 14
    // construcciones de golpe no sabrá de dónde salieron.
    expect(salida).toMatch(/ningún archivo cambiado|app en vivo esté atrasada/);
  });
});

/**
 * El atajo de Dependabot: sus PRs no se previsualizan.
 *
 * POR QUÉ: cada uno toca el lockfile, que obliga a construir las 14 apps. Con el
 * plan gratis (100 despliegues al día), media docena de esos PRs se comen la
 * cuota — y el 22 jul 2026 se agotó a mitad de un despliegue de PRODUCCIÓN,
 * dejando tres apps sin actualizar. No se pierde cobertura: el CI de GitHub
 * compila las 14 apps en cada PR.
 *
 * Lo que estas pruebas fijan es el LÍMITE del atajo: solo previsualizaciones y
 * solo de esas ramas. Si alguna vez llegara a saltarse producción, una app se
 * quedaría vieja en vivo el día del evento sin que nadie se entere.
 */
describe("El atajo de Dependabot (solo previsualizaciones)", () => {
  const LOCKFILE = { "pnpm-lock.yaml": "lockfileVersion: '9.0'\n# subida\n" };

  it("PREVIEW de una rama de Dependabot: se SALTA aunque cambie el lockfile", () => {
    const { codigo, salida } = decidir(LOCKFILE, {
      entorno: {
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "dependabot/npm_and_yarn/npm_and_yarn-abc123",
      },
    });
    expect(codigo).toBe(SALTAR);
    expect(salida).toContain("Dependabot");
  });

  it("PRODUCCIÓN nunca se salta, aunque el nombre de la rama lo parezca", () => {
    const { codigo } = decidir(LOCKFILE, {
      entorno: {
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "dependabot/npm_and_yarn/npm_and_yarn-abc123",
      },
    });
    expect(codigo).toBe(CONSTRUIR);
  });

  it("una rama normal en preview NO se ve afectada: sigue construyendo", () => {
    const { codigo } = decidir(LOCKFILE, {
      entorno: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feat/lo-que-sea" },
    });
    expect(codigo).toBe(CONSTRUIR);
  });

  it("una rama que solo EMPIEZA parecido no cuela (dependabot-mio)", () => {
    const { codigo } = decidir(LOCKFILE, {
      entorno: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "dependabot-mio/parche" },
    });
    expect(codigo).toBe(CONSTRUIR);
  });
});
