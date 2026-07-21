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

// Vercel corre este comando DENTRO de la carpeta de la app (su "Root Directory").
const pkgApp = leerPaquete(resolve(process.cwd(), "package.json"));
if (!pkgApp?.name) construir("no pude leer el package.json de la app");

// La carpeta se deduce de DÓNDE nos ejecutan, no del nombre del paquete: así no
// dependemos de que ambos coincidan (hoy coinciden, pero nadie lo garantiza).
const carpetaApp = relative(RAIZ, process.cwd()).split("\\").join("/") + "/";
if (carpetaApp === "/" || !existsSync(join(RAIZ, carpetaApp))) {
  construir(`no ubiqué la carpeta de la app (cwd: ${process.cwd()})`);
}

// `VERCEL_GIT_PREVIOUS_SHA` = el commit de la última construcción BUENA de ESTA
// app. En el primer despliegue viene vacío: entonces no hay con qué comparar.
const anterior = process.env.VERCEL_GIT_PREVIOUS_SHA;
const actual = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
if (!anterior) construir("primera construcción de esta app (no hay con qué comparar)");

const cambios = archivosCambiados(anterior, actual);
if (cambios === null) construir("no pude comparar los commits (¿clon superficial?)");
if (cambios.length === 0) saltar("no cambió ningún archivo");

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
