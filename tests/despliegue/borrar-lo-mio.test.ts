import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * QUE EL INVITADO PUEDA QUITAR LO SUYO — Y SOLO LO SUYO.
 * ---------------------------------------------------------------------------
 * Lee los ARCHIVOS, así que corre sin Supabase y no se salta nunca.
 *
 * EL PROBLEMA QUE RESUELVE: desde el corte de la 0009, borrar exige el pase de
 * ANFITRIÓN. Quien subía una foto por error tenía que buscar a los novios en
 * mitad de su boda. Y el aviso de participación PROMETE que puedes retirar lo
 * que subes, así que la app estaba prometiendo algo que no cumplía.
 *
 * LO QUE HAY QUE VIGILAR, que es donde esto se rompe:
 *
 *   1. QUE LA PRUEBA SEA UN SECRETO, NO UN NOMBRE. El portal ya guardaba `autor`
 *      con el nombre del perfil. Si algún día alguien decide que eso basta para
 *      dejar borrar, cualquiera podría escribir el nombre de otro y llevarse sus
 *      recuerdos. La única prueba válida es la huella de la llave del teléfono.
 *
 *   2. QUE LA LLAVE NO VIAJE EN LA COLECCIÓN. Cualquier invitado puede leer las
 *      fotos del evento. Si ahí fuera la llave en vez de su huella, se podría
 *      borrar el álbum entero leyéndolo.
 *
 *   3. QUE BORRAR LIBERE EL ESPACIO. Antes se quitaba la fila y el archivo se
 *      quedaba en el almacén para siempre: la foto desaparecía de la vista pero
 *      seguía gastando cupo (0018/0019). Un evento podía quedarse sin sitio por
 *      recuerdos que ya nadie veía.
 */

const RAIZ = join(__dirname, "..", "..");
const leer = (...ruta: string[]) => readFileSync(join(RAIZ, ...ruta), "utf8");

describe("La llave de autor: un secreto, y su huella", () => {
  const sync = leer("packages", "sync", "src", "index.ts");

  it("la llave es aleatoria de verdad, no algo adivinable", () => {
    // Nada de Math.random ni de derivarla del nombre o de la fecha: si se
    // pudiera reconstruir, se podría borrar lo de cualquiera.
    expect(sync).toMatch(/crypto\.getRandomValues\(bytes\)/);
    expect(sync).toMatch(/new Uint8Array\(32\)/);
  });

  it("en la foto viaja la HUELLA, nunca la llave", () => {
    expect(sync).toMatch(/crypto\.subtle\.digest\("SHA-256"/);
    // La llave solo sale del navegador dentro de la petición de borrado.
    const enviosDeLlave = sync.match(/llave:\s*llaveDeAutor\(evento\)/g) ?? [];
    expect(enviosDeLlave).toHaveLength(1);
  });

  for (const [cual, ruta] of [
    ["app suelta", join("apps", "album-fotos", "src", "components", "album.tsx")],
    ["portal", join("apps", "portal", "src", "modulos", "album", "album-modulo.tsx")],
  ] as const) {
    it(`${cual}: firma lo que sube con la huella`, () => {
      expect(leer(ruta)).toMatch(/autorHuella:\s*huella/);
    });

    it(`${cual}: NO manda la llave dentro de la foto`, () => {
      // El fallo que dejaría el álbum abierto de par en par.
      expect(leer(ruta)).not.toMatch(/autorLlave|llaveDeAutor\(\)/);
    });
  }
});

describe("El candado está en el servidor, no en el botón", () => {
  const fn = leer("supabase", "functions", "media-borrar", "index.ts");

  it("la función existe y se despliega", () => {
    expect(readdirSync(join(RAIZ, "supabase", "functions"))).toContain("media-borrar");
  });

  it("el evento sale del PASE, no del cuerpo de la petición", () => {
    // Si lo eligiera quien llama, con el pase de su boda borraría en otra.
    expect(fn).toMatch(/evento_del_pase_anfitrion/);
    expect(fn).toMatch(/evento_del_pase/);
    expect(fn).not.toMatch(/cuerpo\.evento/);
  });

  it("compara la huella, no el nombre del autor", () => {
    expect(fn).toMatch(/fila\.dato\?\.autorHuella/);
    // Si esto apareciera, cualquiera se llevaría los recuerdos de María.
    expect(fn).not.toMatch(/dato\?\.autor\b/);
  });

  it("sin huella guardada solo puede el anfitrión", () => {
    // Las fotos anteriores a esto no llevan firma: no hay forma de saber de
    // quién son, así que no se puede dejar que las quite cualquiera.
    expect(fn).toMatch(/if \(!guardada \|\| !llave\) return json\([\s\S]{0,60}403\)/);
  });

  it("compara en tiempo constante", () => {
    // Con un `===` normal se puede medir cuánto tarda e ir adivinando la llave.
    expect(fn).toMatch(/igualesSiempreEnLoMismo/);
    expect(fn).toMatch(/\^/); // el XOR de la comparación
  });

  it("borra el ARCHIVO además de la fila, y en ese orden", () => {
    const fila = fn.indexOf("method: \"DELETE\", headers: cabeceras");
    const archivo = fn.indexOf("/storage/v1/object/");
    expect(fila).toBeGreaterThan(-1);
    expect(archivo).toBeGreaterThan(fila); // primero la fila, luego el archivo
  });

  it("solo se puede quitar de las colecciones previstas", () => {
    expect(fn).toMatch(/COLECCIONES = new Set\(\["fotos"\]\)/);
    expect(fn).toMatch(/!COLECCIONES\.has\(coleccion\)/);
  });

  it("un id que ya no está no se cuenta como fallo", () => {
    // Dos toques seguidos en el mismo botón no deben asustar a nadie.
    expect(fn).toMatch(/yaNoEstaba/);
  });
});

describe("Los dos álbumes enseñan el botón a quien de verdad puede", () => {
  it("la app suelta: al anfitrión y a quien subió esa foto", () => {
    const album = leer("apps", "album-fotos", "src", "components", "album.tsx");
    expect(album).toMatch(/anfitrion \|\| esMia\(f\)/);
    // "mía" se decide comparando huellas, que es justo lo que el servidor
    // aceptará: así el botón no promete algo que luego se niega.
    expect(album).toMatch(/f\.autorHuella === miHuella/);
  });

  it("el portal: al anfitrión y a quien subió esa foto", () => {
    const modulo = leer("apps", "portal", "src", "modulos", "album", "album-modulo.tsx");
    expect(modulo).toMatch(/anfitrion \|\| mias\.includes\(f\.id\)/);
  });

  for (const [cual, ruta] of [
    ["app suelta", join("apps", "album-fotos", "src", "components", "album.tsx")],
    ["portal", join("apps", "portal", "src", "modulos", "album", "album-modulo.tsx")],
  ] as const) {
    it(`${cual}: si la función no está desplegada, el anfitrión sigue moderando`, () => {
      // Es lo que permite publicar las apps antes que el servidor sin dejar a
      // nadie sin moderar a media boda.
      expect(leer(ruta)).toMatch(/sin-desplegar/);
    });
  }
});
