#!/usr/bin/env node
/**
 * ¿HAY QUE CONSTRUIR ESTA APP? — el portero de las construcciones de Vercel.
 * ---------------------------------------------------------------------------
 * EL PROBLEMA QUE RESUELVE: en este monorepo hay 14 apps y cada una es un
 * proyecto de Vercel aparte. Sin este portero, CUALQUIER cambio dispara las 14
 * construcciones. Un PR que solo tocaba 4 archivos .md construyó 13 apps y no
 * cambió ni una línea de código de ninguna. Así se agotó la cuota del plan
 * gratis el 20 jul 2026.
 *
 * QUÉ HACE: Vercel lo llama antes de construir (ajuste "Ignore Build Step", que
 * cada app declara en su `vercel.json`). Mira qué archivos cambiaron desde la
 * última vez que ESTA app se desplegó bien y decide:
 *
 *   - cambió algo de esta app, o de un paquete del que depende  → CONSTRUIR
 *   - cambió la configuración de la raíz (lockfile, turbo.json…) → CONSTRUIR
 *   - cualquier duda, error, o no se sabe                        → CONSTRUIR
 *   - nada de lo anterior (docs, otra app, otro paquete)         → SALTAR
 *
 * REGLA DE ORO: **ante la duda, construir.** Construir de más cuesta cuota;
 * saltarse una construcción necesaria deja una app vieja en producción, que es
 * mucho peor. Por eso todos los caminos de error terminan en CONSTRUIR.
 *
 * CÓDIGOS DE SALIDA (los define Vercel, no nosotros):
 *   1 = seguir con la construcción      0 = saltarla
 * Sí, están al revés de lo que uno esperaría.
 *
 * NO usa turbo-ignore a propósito: quedó descontinuado en Turborepo 2.10 y hay
 * que descargarlo con `npx` en cada construcción — si la descarga falla, decide
 * construir, que es justo lo que queríamos evitar. Esto no descarga nada.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** La raíz del monorepo: la carpeta que contiene a `scripts/`. */
const RAIZ = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

/** Archivos de la raíz que afectan a TODAS las apps si cambian. */
const CONFIG_DE_LA_RAIZ = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
  "scripts/", // si cambia este mismo portero, no nos fiamos: construimos
];

function construir(motivo) {
  console.log(`✓ CONSTRUIR — ${motivo}`);
  process.exit(1);
}

function saltar(motivo) {
  console.log(`⏭ SALTAR — ${motivo}`);
  process.exit(0);
}

/** Lee un package.json y devuelve `null` si no se puede (nunca lanza). */
function leerPaquete(ruta) {
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch {
    return null;
  }
}

/** Mapa `@salones/loquesea` → la carpeta donde vive, leyendo cada package.json. */
function mapaDePaquetes() {
  const mapa = new Map();
  for (const carpeta of readdirSync(join(RAIZ, "packages"))) {
    const pkg = leerPaquete(join(RAIZ, "packages", carpeta, "package.json"));
    if (pkg?.name) mapa.set(pkg.name, `packages/${carpeta}/`);
  }
  return mapa;
}

/** Las dependencias `@salones/*` declaradas por un package.json. */
function dependenciasInternas(pkg) {
  return Object.keys({ ...pkg?.dependencies, ...pkg?.devDependencies }).filter((d) =>
    d.startsWith("@salones/"),
  );
}

/**
 * Cierre TRANSITIVO de dependencias: si la app usa `@salones/payments` y ese
 * usa `@salones/core`, un cambio en `core` también afecta a la app.
 */
function paquetesDeLosQueDepende(pkgApp, mapa) {
  const vistos = new Set();
  const cola = dependenciasInternas(pkgApp);
  while (cola.length) {
    const nombre = cola.pop();
    if (vistos.has(nombre) || !mapa.has(nombre)) continue;
    vistos.add(nombre);
    const suyo = leerPaquete(join(RAIZ, mapa.get(nombre), "package.json"));
    cola.push(...dependenciasInternas(suyo));
  }
  return [...vistos].map((n) => mapa.get(n));
}

/**
 * Archivos cambiados entre dos commits. Devuelve `null` si no se puede saber
 * (clon superficial sin ese commit, git ausente…) para que quien llame construya.
 */
function archivosCambiados(base, cabeza) {
  try {
    const salida = execFileSync("git", ["diff", "--name-only", `${base}`, `${cabeza}`], {
      cwd: RAIZ,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return salida.split("\n").filter(Boolean);
  } catch {
    return null;
  }
}

// ── Aquí empieza la decisión ────────────────────────────────────────────────

// Los PRs de Dependabot NO se previsualizan, y esto ahorra media cuota diaria.
//
// Cada uno toca `pnpm-lock.yaml`, que está en CONFIG_DE_LA_RAIZ: el portero
// —con razón— manda construir las 14 apps. Son ~13 despliegues por PR, y en el
// plan gratis de Vercel (100 al día) media docena de PRs de Dependabot se comen
// la cuota entera. El 22 jul 2026 se agotó a mitad de un despliegue de
// producción y dejó tres apps sin actualizar.
//
// Se saltan sin perder nada porque el CI de GitHub SÍ los compila enteros:
// el trabajo `compilar` corre `pnpm typecheck` + `pnpm build` de las 14 apps en
// cada PR. Una previsualización de Vercel no añadiría información; solo gasta.
//
// Solo afecta a la PREVISUALIZACIÓN de esas ramas. Cuando el PR se fusiona, el
// despliegue de producción sale de `main` y este atajo ni se mira.
const rama = process.env.VERCEL_GIT_COMMIT_REF || "";
if (process.env.VERCEL_ENV === "preview" && rama.startsWith("dependabot/")) {
  saltar(`rama de Dependabot ("${rama}"): el CI ya compila las 14 apps`);
}

// Vercel corre este comando DENTRO de la carpeta de la app (su "Root Directory").
const pkgApp = leerPaquete(resolve(process.cwd(), "package.json"));
if (!pkgApp?.name) construir("no pude leer el package.json de la app");

// La carpeta se deduce de DÓNDE nos ejecutan, no del nombre del paquete: así no
// dependemos de que ambos coincidan (hoy coinciden, pero nadie lo garantiza).
const carpetaApp = relative(RAIZ, process.cwd()).split("\\").join("/") + "/";
if (carpetaApp === "/" || !existsSync(join(RAIZ, carpetaApp))) {
  construir(`no ubiqué la carpeta de la app (cwd: ${process.cwd()})`);
}

// `VERCEL_GIT_PREVIOUS_SHA` = el commit del despliegue anterior de ESTA app.
// En el primer despliegue viene vacío: entonces no hay con qué comparar.
//
// ⚠️ OJO, comprobado el 16 ago 2026: apunta al último INTENTO, no a la última
// construcción BUENA. Tras el tope del 14-15 ago ("rate limited", nada se
// construyó), un commit vacío comparó contra el intento rechazado, vio cero
// cambios y saltó las 14 apps — dejándolas viejas en producción. La salida es
// empujar un commit que toque este mismo archivo (o `scripts/`): la regla de
// arriba de "no nos fiamos del portero cambiado" reconstruye todo.
//
// ⚠️ Y VUELVE A MORDER CON DOS COMMITS SEGUIDOS (21 ago 2026). No hace falta
// tope de cuota: basta con empujar dos veces con poco margen.
//
//   1. `4db3a17` (las vitrinas por visitante) tocó `packages/sync` y siete
//      apps. Vercel construyó cuatro (pases-qr, rsvp, álbum, portal) y a las
//      demás ni les disparó construcción: cuando llegó el commit siguiente,
//      descartó los intermedios y saltó directo al último.
//   2. `667430a` (de otra sesión, solo fotos del sitio) sí disparó todas. Pero
//      el portero de cada app comparó contra `4db3a17` —el último INTENTO— en
//      vez de contra su último despliegue bueno (`b6647b4`). En ese rango de un
//      solo commit no había nada suyo, así que canceló.
//
// Resultado: playlist, muro, mesas, dinámicas, brindis, invitaciones,
// photobooth, mi-mesa y el catálogo se quedaron SIN el código de las vitrinas,
// con producción atrasada y sin ninguna señal de error. El síntoma es que el
// historial de la app salta un commit: `... READY b6647b4 → CANCELED 667430a`,
// sin rastro del de en medio.
//
// ⚠️ TERCERA VEZ, 24 ago 2026 — y esta la provocamos nosotros. Se empujó la
// Fase 2 del rediseño (`2d1f365`, el portal editorial: tocaba `packages/ui` y
// por tanto ~13 apps) y OCHO MINUTOS después la Fase 3 (`a1ac7f4`, solo el
// sitio). Vercel descartó los intermedios, y el portero del PORTAL comparó
// `a1ac7f4` contra `2d1f365`: en ese rango solo hay `apps/sitio-salon` y un
// test de `tests/`, así que canceló. Resultado: el portal se quedó con el
// código de la Fase 1 y en producción seguía saliendo el título viejo
// ("Portal del evento" en vez de "Boda Ana & Rodrigo · Hacienda Santa
// Renata"), sin una sola señal de error.
//
// LA REGLA PRÁCTICA, hasta que se arregle de raíz: **una fase por empujón, y
// esperar a que la fila de Vercel termine antes del siguiente.** Si ya se
// empujaron dos seguidos, el remedio es tocar `scripts/` (este archivo) para
// que la regla de "no nos fiamos del portero cambiado" reconstruya las 14.
//
// La salida es la misma de siempre y por eso este comentario vive aquí: tocar
// `scripts/` reconstruye las 14. Si algún día conviene arreglarlo de raíz, hay
// que dejar de fiarse de `VERCEL_GIT_PREVIOUS_SHA` y preguntarle a la API de
// Vercel cuál fue el último despliegue READY de ESTA app.
const anterior = process.env.VERCEL_GIT_PREVIOUS_SHA;
const actual = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
if (!anterior) construir("primera construcción de esta app (no hay con qué comparar)");

const cambios = archivosCambiados(anterior, actual);
if (cambios === null) construir("no pude comparar los commits (¿clon superficial?)");

// CERO ARCHIVOS = CONSTRUIR, no saltar. Antes esto saltaba, y el 16 ago 2026 dejó
// `suite-salones` DOS DÍAS con una versión vieja en producción:
//
//   - Un arreglo del catálogo llevaba días fusionado en `main` y sin publicarse.
//   - Se empujó un commit VACÍO (`--allow-empty`) para forzar el redespliegue,
//     que es el truco de siempre.
//   - Vercel comparó ese commit contra su padre, vio 0 archivos, y este portero
//     dijo SALTAR. Vercel lo canceló con "este proyecto no fue afectado".
//
// El truco del commit vacío existe justo para cuando la app en vivo se quedó
// atrás, así que saltarlo es lo contrario de lo que hace falta. Y encaja con la
// REGLA DE ORO de arriba: cero archivos no es "no hay nada que hacer", es "no me
// consta que haya algo que hacer", y ante la duda se construye.
//
// Cuesta cuota (14 apps por commit vacío), pero pasa muy poco y el precio de
// equivocarse al revés ya lo pagamos: dos días de precios viejos en la tienda.
if (cambios.length === 0) {
  construir("no veo ningún archivo cambiado: puede que la app en vivo esté atrasada");
}

// Las carpetas que le importan a ESTA app: la suya y la de sus dependencias.
const mapa = mapaDePaquetes();
const carpetasQueImportan = [carpetaApp, ...paquetesDeLosQueDepende(pkgApp, mapa)];

const culpable = cambios.find(
  (archivo) =>
    carpetasQueImportan.some((c) => archivo.startsWith(c)) ||
    CONFIG_DE_LA_RAIZ.some((c) => (c.endsWith("/") ? archivo.startsWith(c) : archivo === c)),
);

if (culpable) {
  construir(`cambió "${culpable}"`);
}

saltar(
  `${cambios.length} archivo(s) cambiaron, ninguno afecta a "${pkgApp.name}" ` +
    `(mira: ${carpetasQueImportan.join(", ")})`,
);
