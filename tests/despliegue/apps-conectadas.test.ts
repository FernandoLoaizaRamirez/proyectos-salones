import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * ¿LAS APPS PUBLICADAS ESTÁN HABLANDO CON LA BASE?
 * ---------------------------------------------------------------------------
 * POR QUÉ IMPORTA: `obtenerSync()` (packages/sync/src/index.ts) mira dos
 * variables de entorno y decide en silencio cómo va a trabajar:
 *
 *   con NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY → SERVIDOR
 *   sin ellas                                                    → LOCAL
 *
 * En modo LOCAL la app **no da ningún error**: guarda todo en el navegador del
 * teléfono y se ve perfecta. Lo que capturó el salón no sale de ahí. El día del
 * evento eso significa una invitación que el invitado nunca ve, o fotos del
 * photobooth que nunca llegan al álbum.
 *
 * EL 21 AGO 2026 ESO ESTABA PASANDO DE VERDAD, en dos apps a la vez
 * (`invitaciones` y `photobooth`), y nadie se había enterado en semanas:
 *   · compilaban en verde,               · las pruebas pasaban,
 *   · el lint pasaba,                    · y en local funcionaban, porque en
 *     local sí existe `apps/<app>/.env.local`.
 * Lo único que lo delata es mirar la app YA PUBLICADA. Eso es esto.
 *
 * CÓMO ESTÁ HECHA: Next mete el valor de cada `NEXT_PUBLIC_*` DENTRO del
 * JavaScript que sirve al navegador. Así que no hace falta un navegador ni
 * tocar la base: se descarga la página publicada, se siguen sus `chunks` y se
 * comprueba que ahí dentro viajan la dirección Y la llave. Si el proyecto de
 * Vercel se quedó sin variables, no están, y esta prueba se pone roja.
 *
 * DOS CAPAS, a propósito:
 *
 *   1. EL CENSO (sin red, corre SIEMPRE). Cada app del repo tiene que estar
 *      clasificada: o usa `@salones/sync` y entonces está en PUBLICADAS con su
 *      dirección, o no la usa y está en SIN_BASE. Una app nueva que nadie
 *      registre pone esto rojo. Sin esta capa, el día que se añada la app 15
 *      nadie se acordaría de vigilarla — que es exactamente cómo se coló el
 *      fallo de agosto.
 *
 *   2. LA MEDICIÓN (con red, con interruptor). Igual que el centinela de
 *      seguridad:
 *        · sin `EXIGIR_CONEXION` → se salta DE VERDAD (`ctx.skip()`), para
 *          quien trabaja sin internet. Sale como "saltada", NUNCA como pasada.
 *        · con `EXIGIR_CONEXION=1` —así corre el CI de main— una app
 *          desconectada es un FALLO.
 *
 * ⚠️ ESTO MIRA PRODUCCIÓN, NO EL COMMIT. Es a propósito: la pregunta que
 * responde es "¿lo que está en vivo AHORA está conectado?", y esa no depende de
 * lo que traiga el commit. Una app puede llevar meses sin tocarse y romperse
 * igual, porque quien le quita las variables es una persona en el panel de
 * Vercel, no un cambio de código.
 */

/** Lo mismo que hace el centinela de seguridad: informativo fuera del CI. */
const EXIGIR = process.env.EXIGIR_CONEXION === "1";

/** Una app puede tardar: son ~12 archivos por app y algunos pesan. */
const RED = 120_000;

/** La raíz del repo, desde tests/despliegue/. */
const RAIZ = resolve(__dirname, "../..");

/**
 * LAS APPS QUE HABLAN CON LA BASE, con **la página donde la usan**.
 *
 * Están escritas aquí a mano y no sacadas del catálogo a propósito: el catálogo
 * es una vitrina comercial que cambia por razones de venta, y esto es una lista
 * de vigilancia. Si una dirección cambia, esta prueba se pone roja al no poder
 * descargarla — que es justo lo que queremos que pase.
 *
 * ⚠️ POR QUÉ ALGUNAS LLEVAN RUTA Y NO SOLO EL DOMINIO. Next parte el JavaScript
 * por rutas: cada página carga solo los trozos que necesita. La portada del
 * CATÁLOGO es la tienda pública, que no toca la base — y por eso sus trozos NO
 * llevan las llaves aunque el proyecto las tenga puestas. Mirar ahí daba un
 * FALSO ROJO (comprobado el 21 ago 2026: en `/` no aparece la llave, en
 * `/entrar` y `/eventos` sí). Así que aquí va la página donde la app SÍ habla
 * con la base. Si mañana una app mueve esa pantalla, esto se pone rojo y hay
 * que actualizar la ruta — mejor eso que vigilar una página que no prueba nada.
 */
const PUBLICADAS: Record<string, string> = {
  "album-fotos": "https://album-fotos-gamma.vercel.app",
  brindis: "https://proyectos-salones-brindis.vercel.app",
  // La tienda no usa la base; el panel del operador, sí.
  catalogo: "https://suite-salones.vercel.app/entrar",
  dinamicas: "https://proyectos-salones-dinamicas.vercel.app",
  invitaciones: "https://invitaciones-weld.vercel.app",
  mesas: "https://proyectos-salones-mesas.vercel.app",
  muro: "https://proyectos-salones-muro.vercel.app",
  "pases-qr": "https://pases-qr.vercel.app",
  photobooth: "https://proyectos-salones-photobooth.vercel.app",
  playlist: "https://proyectos-salones-playlist.vercel.app",
  portal: "https://proyectos-salones-portal.vercel.app",
  rsvp: "https://rsvp-umber-pi.vercel.app",
};

/**
 * Las que NO usan `@salones/sync` y por lo tanto NO necesitan llaves.
 * Si alguna empieza a usarla, la capa 1 obliga a moverla arriba.
 */
const SIN_BASE = ["mi-mesa", "sitio-salon"];

/** La dirección de Supabase, sea cual sea el proyecto. */
const DIRECCION = /https:\/\/[a-z0-9-]+\.supabase\.co/;

/**
 * La llave pública, en sus DOS formatos válidos: el nuevo (`sb_publishable_…`,
 * que es el que usa este proyecto) y el viejo tipo JWT (`eyJ…`), por si algún
 * proyecto se quedó con el anterior.
 *
 * Que la llave tenga que PARECER una llave no es un capricho: el 21 ago 2026 el
 * fallo se arregló mal la primera vez porque en la casilla de la llave se pegó
 * OTRA VEZ LA DIRECCIÓN. La app quedó conectada y contestando 401 a todo. Con
 * esta forma exigida, ese error también sale rojo.
 */
const LLAVE = /sb_publishable_[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./;

/** Todos los archivos bajo una carpeta, en plano. */
function archivosDe(carpeta: string): string[] {
  let salida: string[] = [];
  let entradas: string[];
  try {
    entradas = readdirSync(carpeta);
  } catch {
    return salida;
  }
  for (const entrada of entradas) {
    const ruta = join(carpeta, entrada);
    if (statSync(ruta).isDirectory()) salida = salida.concat(archivosDe(ruta));
    else salida.push(ruta);
  }
  return salida;
}

/** ¿Esta app importa `@salones/sync` en alguna parte de su código? */
function usaLaBase(app: string): boolean {
  return archivosDe(join(RAIZ, "apps", app, "src")).some((f) =>
    readFileSync(f, "utf8").includes("@salones/sync"),
  );
}

/** Las carpetas de `apps/`, que son las apps de verdad. */
function appsDelRepo(): string[] {
  return readdirSync(join(RAIZ, "apps")).filter((d) =>
    statSync(join(RAIZ, "apps", d)).isDirectory(),
  );
}

/** Descarga texto. Devuelve "" si algo falla: el que decide es quien llama. */
async function bajar(url: string): Promise<string> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return "";
    return await r.text();
  } catch {
    return "";
  }
}

type Hallazgo = { direccion: boolean; llave: boolean; trozos: number; pagina: boolean };

/**
 * Abre la app publicada y busca la dirección y la llave dentro de su
 * JavaScript. Va parando en cuanto encuentra las dos, para no descargar de
 * balde los 12 archivos de cada una de las 12 apps en cada corrida del CI.
 */
async function inspeccionar(pagina: string): Promise<Hallazgo> {
  const html = await bajar(pagina);
  const hallazgo: Hallazgo = {
    direccion: DIRECCION.test(html),
    llave: LLAVE.test(html),
    trozos: 0,
    pagina: html.length > 0,
  };
  if (!hallazgo.pagina) return hallazgo;

  // Los trozos cuelgan del DOMINIO, no de la ruta: `/entrar` + `/_next/…` sería
  // una dirección que no existe.
  const dominio = new URL(pagina).origin;

  // Los `chunks` que la propia página manda cargar, sin repetir.
  const trozos = [...new Set(html.match(/\/_next\/static\/[^"'\s\\]+?\.js/g) ?? [])];
  hallazgo.trozos = trozos.length;

  // De 4 en 4: ni tan lento como uno por uno ni tan bruto como todos de golpe.
  for (let i = 0; i < trozos.length && !(hallazgo.direccion && hallazgo.llave); i += 4) {
    const textos = await Promise.all(trozos.slice(i, i + 4).map((t) => bajar(dominio + t)));
    for (const texto of textos) {
      if (DIRECCION.test(texto)) hallazgo.direccion = true;
      if (LLAVE.test(texto)) hallazgo.llave = true;
    }
  }
  return hallazgo;
}

/** El recado que se lee cuando algo falla. Tiene que decir QUÉ HACER. */
function comoArreglarlo(app: string, base: string): string {
  return [
    `La app "${app}" (${base}) está publicada SIN sus llaves: trabaja contra el`,
    "navegador del invitado y nada de lo que capture el salón sale de ahí.",
    "",
    "Arreglo, en el panel de Vercel del proyecto de esa app:",
    "  1. Settings → Environment Variables → añadir las DOS, en Production and Preview:",
    "       NEXT_PUBLIC_SUPABASE_URL       la dirección del proyecto de Supabase",
    "       NEXT_PUBLIC_SUPABASE_ANON_KEY  la llave publishable (empieza con sb_publishable_)",
    "  2. Deployments → ⋯ del último → Redeploy, y **DESMARCAR 'Use project's",
    "     Ignore Build Step'**: si se deja marcado, el portero salta la",
    "     construcción y las variables no entran nunca.",
    "",
    "⚠️ Al pegar la llave, comprobar que NO se pegó la dirección otra vez: eso",
    "   deja la app conectada pero con 401 en todo, y cuesta encontrarlo.",
    "",
    "Contexto largo: memoria del proyecto, 'Apps sin llaves en Vercel' (21 ago 2026).",
  ].join("\n");
}

describe("las apps publicadas hablan con la base", () => {
  /* ------------------------------------------------------------------ */
  /* CAPA 1 — el censo. Sin red, corre siempre.                          */
  /* ------------------------------------------------------------------ */

  it("toda app del repo está clasificada: o vigilada, o marcada como que no usa la base", () => {
    const sinClasificar = appsDelRepo().filter(
      (app) => !(app in PUBLICADAS) && !SIN_BASE.includes(app),
    );
    expect(
      sinClasificar,
      "Estas apps no están en ninguna de las dos listas de este archivo. Si usan " +
        "@salones/sync, añádelas a PUBLICADAS con su dirección publicada; si no, a " +
        "SIN_BASE. Nadie vigila lo que no está en la lista.",
    ).toEqual([]);
  });

  it("ninguna app marcada como 'sin base' usa @salones/sync a escondidas", () => {
    const traidoras = SIN_BASE.filter((app) => usaLaBase(app));
    expect(
      traidoras,
      "Estas apps empezaron a usar @salones/sync pero siguen marcadas como que no " +
        "necesitan llaves. Muévelas a PUBLICADAS o se publicarán desconectadas.",
    ).toEqual([]);
  });

  it("toda app vigilada usa de verdad @salones/sync", () => {
    const dePaso = Object.keys(PUBLICADAS).filter((app) => !usaLaBase(app));
    expect(
      dePaso,
      "Estas apps están en la lista de vigilancia pero ya no usan @salones/sync. " +
        "Si dejaron de necesitar la base, muévelas a SIN_BASE para no exigirles " +
        "unas llaves que no usan.",
    ).toEqual([]);
  });

  /* ------------------------------------------------------------------ */
  /* CAPA 2 — la medición. Con red, con interruptor.                     */
  /* ------------------------------------------------------------------ */

  for (const [app, base] of Object.entries(PUBLICADAS)) {
    it(
      `${app}: la versión publicada lleva dentro la dirección y la llave`,
      async (ctx) => {
        // Sin el interruptor no se toca la red: si no, cada `pnpm test` en la
        // laptop se pondría a descargar 12 apps para acabar saltándose la
        // prueba. Sale como SALTADA, que es la verdad — no como pasada.
        if (!EXIGIR) {
          console.warn(
            `⏭️  ${app}: mirar producción está apagado. Pon EXIGIR_CONEXION=1 ` +
              "para comprobarlo de verdad (así corre el CI de main). Se salta.",
          );
          ctx.skip();
          return;
        }

        const r = await inspeccionar(base);

        // Un "no pude comprobarlo" que sale verde es justo el agujero que esto
        // tapa. Con el interruptor puesto, no poder mirar es fallar.
        expect(
          r.pagina,
          `No se pudo descargar ${base}. O la app se cayó, o cambió de dirección ` +
            "y hay que corregirla en PUBLICADAS, en este mismo archivo.",
        ).toBe(true);

        expect(r.trozos, `${base} no sirvió ni un archivo .js: algo raro pasa.`).toBeGreaterThan(0);
        expect(r.direccion, comoArreglarlo(app, base)).toBe(true);
        expect(r.llave, comoArreglarlo(app, base)).toBe(true);
      },
      RED,
    );
  }
});
