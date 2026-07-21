import { describe, it, expect, afterEach, vi } from "vitest";
import {
  esVideo,
  porFecha,
  enlaceSubir,
  descargarAlbum,
  type Foto,
} from "../../apps/catalogo/src/lib/album";

/**
 * PRUEBAS DEL ÁLBUM DEL EVENTO (`apps/catalogo/src/lib/album.ts`).
 * ---------------------------------------------------------------------------
 * Lo más importante que hay aquí es `descargarAlbum`: es LA ENTREGA al cliente.
 * Una boda pueden ser cientos de fotos y videos, y es la única vez que el salón
 * los baja; si se traga archivos en silencio, se pierden los recuerdos de la
 * gente y no hay segunda oportunidad. Por eso se comprueba, sobre todo, que
 * NUNCA se salta archivos sin contarlos.
 *
 * `descargarAlbum` habla con el navegador (fetch, blobs, enlaces de descarga) y
 * las pruebas corren en Node, así que se le pone delante un NAVEGADOR DE MENTIRA
 * que va apuntando qué se descargó y con qué nombre.
 */

const foto = (p: Partial<Foto>): Foto => ({
  id: "1",
  nombre: "recuerdo.jpg",
  url: "https://almacen.mx/1.jpg",
  tipo: "image/jpeg",
  fecha: 0,
  ...p,
});

// ── El navegador de mentira ─────────────────────────────────────────────────

/** Una respuesta de descarga que funciona. */
const archivoOk = () => ({ ok: true, blob: async () => ({ size: 10 }) });
/** El almacén contesta, pero con un error (archivo borrado, permiso vencido…). */
const archivoRoto = (status = 404) => ({ ok: false, status });

/**
 * Pone un navegador de mentira delante de `descargarAlbum` y devuelve el
 * cuaderno donde queda apuntado todo lo que hizo.
 */
function navegadorFalso(responder: (url: string) => unknown) {
  const guardados: string[] = [];
  const creados: string[] = [];
  const liberados: string[] = [];
  let n = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const r = responder(url);
      if (r instanceof Error) throw r;
      return r;
    }),
  );
  vi.stubGlobal("document", {
    createElement: () => {
      const a = {
        href: "",
        download: "",
        click: () => guardados.push(a.download),
        remove: () => {},
      };
      return a;
    },
    body: { appendChild: () => {} },
  });
  vi.stubGlobal("URL", {
    createObjectURL: () => {
      const u = `blob:falso/${++n}`;
      creados.push(u);
      return u;
    },
    revokeObjectURL: (u: string) => liberados.push(u),
  });

  return { guardados, creados, liberados };
}

const siempre = () => true;
const sinAvance = () => {};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("esVideo — distinguir un video de una foto", () => {
  it("reconoce los videos por su tipo", () => {
    expect(esVideo("video/mp4")).toBe(true);
    expect(esVideo("video/quicktime")).toBe(true);
  });

  it("una foto no es un video", () => {
    expect(esVideo("image/jpeg")).toBe(false);
    expect(esVideo("image/heic")).toBe(false);
    expect(esVideo("")).toBe(false);
  });
});

describe("porFecha — el orden del álbum", () => {
  it("pone primero lo más reciente", () => {
    const album = [
      foto({ id: "vieja", fecha: 1000 }),
      foto({ id: "nueva", fecha: 9000 }),
      foto({ id: "media", fecha: 5000 }),
    ].sort(porFecha);
    expect(album.map((f) => f.id)).toEqual(["nueva", "media", "vieja"]);
  });

  it("una foto sin fecha se va al final, no rompe el orden", () => {
    const album = [
      foto({ id: "sin-fecha", fecha: undefined }),
      foto({ id: "con-fecha", fecha: 1 }),
    ].sort(porFecha);
    expect(album.map((f) => f.id)).toEqual(["con-fecha", "sin-fecha"]);
  });
});

describe("enlaceSubir — la dirección que va dentro del QR", () => {
  const PORTAL = process.env.NEXT_PUBLIC_PORTAL_URL;
  afterEach(() => {
    if (PORTAL === undefined) delete process.env.NEXT_PUBLIC_PORTAL_URL;
    else process.env.NEXT_PUBLIC_PORTAL_URL = PORTAL;
  });

  it("si hay portal configurado, manda al portal", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx";
    expect(enlaceSubir("boda-ana", "https://album.mx")).toBe("https://portal.mx/album?e=boda-ana");
  });

  it("le quita la barra final al portal para no generar '//'", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx/";
    expect(enlaceSubir("boda-ana", "")).toBe("https://portal.mx/album?e=boda-ana");
  });

  it("sin portal, cae en la app album-fotos de siempre", () => {
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
    expect(enlaceSubir("boda-ana", "https://album.mx")).toBe("https://album.mx/?e=boda-ana");
  });

  it("sin portal y sin app, devuelve vacío en vez de un enlace roto", () => {
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
    expect(enlaceSubir("boda-ana", "")).toBe("");
  });

  it("codifica el código del evento (espacios y acentos no rompen el QR)", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx";
    const enlace = enlaceSubir("boda de Ana & José", "");
    expect(enlace).toBe("https://portal.mx/album?e=boda%20de%20Ana%20%26%20Jos%C3%A9");
    expect(enlace).not.toContain("&e");
  });
});

describe("descargarAlbum — la entrega al cliente", () => {
  it("guarda todas las fotos y va avisando del avance", async () => {
    const cuaderno = navegadorFalso(archivoOk);
    const avances: [number, number][] = [];
    const fotos = [foto({ id: "a" }), foto({ id: "b" }), foto({ id: "c" })];

    const r = await descargarAlbum(fotos, (hechas, total) => avances.push([hechas, total]), siempre);

    expect(r).toEqual({ guardadas: 3, fallidas: 0, cancelada: false });
    expect(cuaderno.guardados).toHaveLength(3);
    // El aviso de avance es la barra que ve el salón: tiene que llegar al final.
    expect(avances).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("un archivo roto NO detiene la entrega: lo cuenta y sigue con los demás", async () => {
    // Es el caso que más importa. Si un permiso venció o borraron un archivo del
    // almacén, el salón tiene que llevarse TODO LO DEMÁS igualmente.
    const cuaderno = navegadorFalso((url) => (url.includes("2") ? archivoRoto() : archivoOk()));
    const fotos = [
      foto({ id: "a", url: "https://almacen.mx/1.jpg" }),
      foto({ id: "b", url: "https://almacen.mx/2.jpg" }),
      foto({ id: "c", url: "https://almacen.mx/3.jpg" }),
    ];

    const r = await descargarAlbum(fotos, sinAvance, siempre);

    expect(r).toEqual({ guardadas: 2, fallidas: 1, cancelada: false });
    expect(cuaderno.guardados).toHaveLength(2);
  });

  it("si se cae la red a mitad, tampoco se detiene", async () => {
    const cuaderno = navegadorFalso((url) =>
      url.includes("2") ? new Error("sin internet") : archivoOk(),
    );
    const fotos = [
      foto({ id: "a", url: "https://almacen.mx/1.jpg" }),
      foto({ id: "b", url: "https://almacen.mx/2.jpg" }),
      foto({ id: "c", url: "https://almacen.mx/3.jpg" }),
    ];

    const r = await descargarAlbum(fotos, sinAvance, siempre);

    expect(r).toEqual({ guardadas: 2, fallidas: 1, cancelada: false });
    expect(cuaderno.guardados).toHaveLength(2);
  });

  it("ninguna foto se pierde en silencio: guardadas + fallidas = total", async () => {
    // La red de seguridad de todo lo anterior, sea cual sea la mezcla de fallos.
    navegadorFalso((url) => {
      if (url.includes("2")) return archivoRoto();
      if (url.includes("4")) return new Error("sin internet");
      return archivoOk();
    });
    const fotos = [1, 2, 3, 4, 5].map((i) =>
      foto({ id: `f${i}`, url: `https://almacen.mx/${i}.jpg` }),
    );

    const r = await descargarAlbum(fotos, sinAvance, siempre);

    expect(r.guardadas + r.fallidas).toBe(fotos.length);
    expect(r.cancelada).toBe(false);
  });

  it("se puede cancelar a mitad y lo dice", async () => {
    const cuaderno = navegadorFalso(archivoOk);
    let quedan = 1; // deja pasar solo el primero
    const fotos = [foto({ id: "a" }), foto({ id: "b" }), foto({ id: "c" })];

    const r = await descargarAlbum(fotos, sinAvance, () => quedan-- > 0);

    expect(r).toEqual({ guardadas: 1, fallidas: 0, cancelada: true });
    expect(cuaderno.guardados).toHaveLength(1);
  });

  it("numera los archivos para que dos fotos con el mismo nombre no se pisen", async () => {
    // Es lo normal: tres invitados suben su "IMG_0001.jpg" desde el iPhone.
    const cuaderno = navegadorFalso(archivoOk);
    const fotos = [
      foto({ id: "a", nombre: "IMG_0001.jpg" }),
      foto({ id: "b", nombre: "IMG_0001.jpg" }),
    ];

    await descargarAlbum(fotos, sinAvance, siempre);

    expect(cuaderno.guardados).toEqual(["001-IMG_0001.jpg", "002-IMG_0001.jpg"]);
  });

  it("limpia los caracteres que Windows no admite en un nombre de archivo", async () => {
    const cuaderno = navegadorFalso(archivoOk);
    const fotos = [foto({ nombre: 'a/b\\c:d*e?f"g<h>i|j.jpg' })];

    await descargarAlbum(fotos, sinAvance, siempre);

    expect(cuaderno.guardados[0]).toBe("001-a-b-c-d-e-f-g-h-i-j.jpg");
  });

  it("con un nombre larguísimo, conserva el final y la extensión", async () => {
    const cuaderno = navegadorFalso(archivoOk);
    const fotos = [foto({ nombre: `${"x".repeat(80)}.jpg` })];

    await descargarAlbum(fotos, sinAvance, siempre);

    expect(cuaderno.guardados[0]).toMatch(/^001-x+\.jpg$/);
    expect(cuaderno.guardados[0]!.endsWith(".jpg")).toBe(true);
  });

  it("una foto sin nombre igual se guarda, como 'recuerdo'", async () => {
    const cuaderno = navegadorFalso(archivoOk);

    await descargarAlbum([foto({ nombre: "" })], sinAvance, siempre);

    expect(cuaderno.guardados).toEqual(["001-recuerdo"]);
  });

  it("libera la memoria de cada archivo: con cientos de fotos, si no, revienta la pestaña", async () => {
    const cuaderno = navegadorFalso(archivoOk);
    const fotos = [foto({ id: "a" }), foto({ id: "b" }), foto({ id: "c" })];

    await descargarAlbum(fotos, sinAvance, siempre);

    expect(cuaderno.creados).toHaveLength(3);
    expect(cuaderno.liberados).toEqual(cuaderno.creados);
  });

  it("un álbum vacío no descarga nada ni se queja", async () => {
    const cuaderno = navegadorFalso(archivoOk);

    const r = await descargarAlbum([], sinAvance, siempre);

    expect(r).toEqual({ guardadas: 0, fallidas: 0, cancelada: false });
    expect(cuaderno.guardados).toHaveLength(0);
  });
});
