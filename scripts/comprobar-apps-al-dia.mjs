#!/usr/bin/env node
/**
 * ¿ESTÁN LAS APPS EN VIVO LISTAS PARA EL CORTE?
 * ---------------------------------------------------------------------------
 * Es la comprobación 1 y 2 del `docs/GUION-DEL-CORTE.md`, hecha a máquina.
 *
 * POR QUÉ EXISTE: el corte de la 0009 apaga el candado viejo (`x-evento`). Si
 * una sola app en vivo todavía no manda el pase firmado, esa app se queda MUDA
 * en plena boda. Mirar la fecha del despliegue en el panel de Vercel NO basta:
 * dice cuándo se construyó, no qué código quedó dentro.
 *
 * CÓMO LO COMPRUEBA: descarga la página de cada app y sus archivos de JavaScript
 * y busca las señales del código nuevo. Es la verdad de lo que corre en el
 * navegador del invitado, no lo que dice un panel.
 *
 *   · x-evento-pase       → la sync nueva (pase firmado, migración 0006)
 *   · x-evento-anfitrion  → la llave del anfitrión (migración 0009)
 *   · demo-               → la vitrina por visitante (migración 0022)
 *
 * USO:
 *   node scripts/comprobar-apps-al-dia.mjs
 *
 * ⚠️ Requiere `pnpm install` hecho: desde el rediseño las URLs vienen de
 * `@salones/directorio` (la lista única del workspace). En un clon fresco o un
 * worktree sin node_modules muere con ERR_MODULE_NOT_FOUND — instala primero.
 *
 * Devuelve 0 si TODAS están al día, 1 si alguna no lo está (así también sirve
 * para automatizar). Ante la duda, dice que NO está lista: equivocarse hacia ese
 * lado cuesta una revisión de más; hacia el otro, una boda rota.
 */

import { URLS } from "@salones/directorio";

/**
 * Las que el corte de la 0009 puede dejar mudas si van atrasadas.
 *
 * ⚠️ OJO CON LAS DIRECCIONES: NO son `<nombre-del-proyecto>.vercel.app`. Cuando
 * ese nombre ya está tomado por otra persona, Vercel le pega un sufijo al azar
 * (`album-fotos-gamma`, `rsvp-umber-pi`). Comprobado el 24 jul 2026:
 * `album-fotos.vercel.app` es de un desconocido — devuelve un "Ejemplo de
 * imágenes" que no tiene nada que ver con este proyecto. Desde el rediseño
 * salen de `@salones/directorio` — LA lista única que también consumen el
 * catálogo y el portal: si una cambia, se cambia en UN lugar.
 */
const APPS = [
  ["muro", URLS.muro],
  ["playlist", URLS.playlist],
  ["dinámicas", URLS.dinamicas],
  ["álbum", URLS["album-fotos"]],
  ["rsvp", URLS.rsvp],
  ["brindis", URLS.brindis],
  // Pases con QR usa sync desde el 6 ago 2026 (la lista y el registro de la
  // puerta). ⚠️ Se queda ATRASADA hasta que se le pongan sus dos variables de
  // Supabase en Vercel: sin ellas la app arranca en modo local y funciona, pero
  // la puerta vuelve a vivir en un solo aparato.
  ["pases QR", URLS["pases-qr"]],
  // El portal y el catálogo muestran las fotos: les afecta el corte de la 0013.
  // El proyecto se llama `proyectos-salones-portal` (Vercel regeneró el nombre al
  // elegir la carpeta apps/portal; encaja con la convención de las otras apps).
  // ⚠️ Se mira `/muro`, NO la home: la home del portal (`/?e=demo`) no carga las
  // piezas de sync (los módulos se cargan por ruta), así que daría un falso
  // "ATRASADA". Cualquier ruta de módulo (muro/album) sí trae el código real.
  ["portal", URLS.portal, "/muro?e=demo"],
  // La PORTADA del catálogo es el escaparate comercial y no toca el servidor:
  // sus piezas de sync se cargan solo al entrar al panel. Preguntando por la
  // portada saldría un "NO" que no es verdad, así que se mira `/eventos`.
  ["catálogo (panel)", URLS.catalogo, "/eventos"],
];

const SENALES = {
  pase: "x-evento-pase",
  anfitrion: "x-evento-anfitrion",
  medios: "media-ver",
  /*
   * `PREFIJO_VITRINA` de @salones/sync. Es un texto literal, así que sobrevive
   * al minificado — los nombres de función NO: comprobar `esVitrinaPropia` da
   * un falso "NO" en cuanto Next renombra. Aprendido el 21 ago 2026 buscando
   * por qué las demos seguían compartiendo el evento "demo".
   */
  vitrina: "demo-",
};

async function bajar(url) {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

/** El HTML más todos sus scripts, en un solo texto donde buscar. */
async function codigoQueCorre(base) {
  const html = await bajar(base);
  const raiz = new URL(base).origin;
  const rutas = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const trozos = await Promise.all(
    rutas.map((r) => bajar(r.startsWith("http") ? r : new URL(r, raiz).href).catch(() => "")),
  );
  return html + trozos.join("");
}

const marca = (hay) => (hay ? "sí" : "NO");

let todasListas = true;
const filas = [];

for (const [nombre, url, ruta = "/"] of APPS) {
  try {
    const codigo = await codigoQueCorre(url + ruta);
    const pase = codigo.includes(SENALES.pase);
    const anfitrion = codigo.includes(SENALES.anfitrion);
    const medios = codigo.includes(SENALES.medios);
    const vitrina = codigo.includes(SENALES.vitrina);
    /*
     * La vitrina NO entra en `lista` a propósito: el corte de la 0009 no
     * depende de ella. Si una app va atrasada de vitrina, la demo se ve pobre
     * —comparte el evento "demo" y abre vacía— pero ninguna boda se rompe.
     * Se informa, no se bloquea.
     */
    const lista = pase && anfitrion;
    if (!lista) todasListas = false;
    filas.push([
      nombre,
      marca(pase),
      marca(anfitrion),
      marca(medios),
      marca(vitrina),
      lista ? "LISTA" : "ATRASADA",
    ]);
  } catch (e) {
    todasListas = false;
    filas.push([nombre, "?", "?", "?", "?", `NO RESPONDE (${e.message})`]);
  }
}

const ancho = (i) => Math.max(...filas.map((f) => f[i].length), 12);
console.log(
  ["app".padEnd(ancho(0)), "pase", "anfitrión", "fotos", "vitrina", "estado"].join("  "),
);
for (const f of filas) {
  console.log(
    [f[0].padEnd(ancho(0)), f[1].padEnd(4), f[2].padEnd(9), f[3].padEnd(5), f[4].padEnd(7), f[5]].join("  "),
  );
}

console.log("");
if (todasListas) {
  console.log("✅ Todas al día: se puede seguir con el guión del corte.");
} else {
  console.log("🛑 NO cortar todavía. Alguna app corre código viejo y el corte la");
  console.log("   dejaría muda en vivo. Espera a que Vercel termine de desplegar");
  console.log("   (o revísala en el panel) y vuelve a correr esto.");
}
process.exit(todasListas ? 0 : 1);
