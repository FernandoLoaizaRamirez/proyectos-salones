import { describe, it, expect, afterEach } from "vitest";
import {
  porVotos,
  plataformaDeLink,
  enlacePedir,
  EstadoCancion,
  type Cancion,
} from "../../apps/catalogo/src/lib/playlist";

/**
 * PRUEBAS DEL PANEL DEL DJ (`apps/catalogo/src/lib/playlist.ts`).
 * ---------------------------------------------------------------------------
 * Lo que se fija aquí es lo que el DJ ve en pantalla durante la fiesta:
 *
 *   - `porVotos`         → EL ORDEN de la cola. Si se rompe, el DJ pone las
 *                          canciones equivocadas y la pista se vacía.
 *   - `plataformaDeLink` → la etiqueta (Spotify / YouTube / …) del enlace que
 *                          pegó el invitado, que puede ser cualquier cosa.
 *   - `enlacePedir`      → la dirección que va DENTRO DEL QR de la mesa. Si sale
 *                          mal, nadie puede pedir canciones en toda la noche.
 *
 * Son funciones puras: no tocan la red ni la base. Corren en cualquier sitio.
 */

const cancion = (p: Partial<Cancion>): Cancion => ({
  id: "1",
  titulo: "Una canción",
  votos: 0,
  estado: EstadoCancion.Pendiente,
  fecha: 0,
  ...p,
});

describe("porVotos — el orden de la cola del DJ", () => {
  it("pone primero la más votada", () => {
    const cola = [
      cancion({ id: "poca", votos: 2 }),
      cancion({ id: "mucha", votos: 9 }),
      cancion({ id: "media", votos: 5 }),
    ].sort(porVotos);
    expect(cola.map((c) => c.id)).toEqual(["mucha", "media", "poca"]);
  });

  it("a igualdad de votos, primero la pedida MÁS RECIENTE", () => {
    const cola = [
      cancion({ id: "vieja", votos: 3, fecha: 1000 }),
      cancion({ id: "nueva", votos: 3, fecha: 5000 }),
    ].sort(porVotos);
    expect(cola.map((c) => c.id)).toEqual(["nueva", "vieja"]);
  });

  it("una canción sin votos no se cuela por delante de una votada", () => {
    // Aunque sea muchísimo más reciente: mandan los votos.
    const cola = [
      cancion({ id: "recien-pedida", votos: 0, fecha: 9_999_999 }),
      cancion({ id: "votada", votos: 1, fecha: 1 }),
    ].sort(porVotos);
    expect(cola[0]!.id).toBe("votada");
  });

  it("con la cola vacía o con una sola canción no se rompe", () => {
    expect([].sort(porVotos)).toEqual([]);
    const una = [cancion({ id: "sola" })];
    expect(una.sort(porVotos).map((c) => c.id)).toEqual(["sola"]);
  });
});

describe("plataformaDeLink — de dónde es el enlace que pegó el invitado", () => {
  it("reconoce las tres plataformas", () => {
    expect(plataformaDeLink("https://open.spotify.com/track/abc")).toBe("Spotify");
    expect(plataformaDeLink("https://www.youtube.com/watch?v=abc")).toBe("YouTube");
    expect(plataformaDeLink("https://youtu.be/abc")).toBe("YouTube");
    expect(plataformaDeLink("https://music.apple.com/mx/album/abc")).toBe("Apple Music");
    expect(plataformaDeLink("https://apple.co/abc")).toBe("Apple Music");
  });

  it("no le importan las mayúsculas", () => {
    expect(plataformaDeLink("HTTPS://OPEN.SPOTIFY.COM/TRACK/ABC")).toBe("Spotify");
  });

  it("cualquier otra dirección es solo un 'Enlace'", () => {
    expect(plataformaDeLink("https://soundcloud.com/algo")).toBe("Enlace");
    expect(plataformaDeLink("http://loquesea.mx")).toBe("Enlace");
  });

  it("si no hay enlace, o no es una dirección, no etiqueta nada", () => {
    expect(plataformaDeLink(undefined)).toBeNull();
    expect(plataformaDeLink("")).toBeNull();
    // El invitado escribió el nombre de la canción en la casilla del enlace.
    expect(plataformaDeLink("La Bamba - Los Lobos")).toBeNull();
  });
});

describe("enlacePedir — la dirección que va dentro del QR", () => {
  const PORTAL = process.env.NEXT_PUBLIC_PORTAL_URL;
  afterEach(() => {
    if (PORTAL === undefined) delete process.env.NEXT_PUBLIC_PORTAL_URL;
    else process.env.NEXT_PUBLIC_PORTAL_URL = PORTAL;
  });

  it("si hay portal configurado, manda al portal", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx";
    expect(enlacePedir("boda-ana", "https://playlist.mx")).toBe(
      "https://portal.mx/playlist?e=boda-ana",
    );
  });

  it("le quita la barra final al portal para no generar '//'", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx/";
    expect(enlacePedir("boda-ana", "")).toBe("https://portal.mx/playlist?e=boda-ana");
  });

  it("sin portal, cae en la app playlist de siempre", () => {
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
    expect(enlacePedir("boda-ana", "https://playlist.mx")).toBe(
      "https://playlist.mx/pedir?e=boda-ana",
    );
  });

  it("sin portal y sin app, devuelve vacío en vez de un enlace roto", () => {
    delete process.env.NEXT_PUBLIC_PORTAL_URL;
    expect(enlacePedir("boda-ana", "")).toBe("");
  });

  it("codifica el código del evento (espacios y acentos no rompen el QR)", () => {
    process.env.NEXT_PUBLIC_PORTAL_URL = "https://portal.mx";
    const enlace = enlacePedir("boda de Ana & José", "");
    expect(enlace).toBe("https://portal.mx/playlist?e=boda%20de%20Ana%20%26%20Jos%C3%A9");
    // El `&` codificado es lo importante: si no, corta la query en dos.
    expect(enlace).not.toContain("&e");
  });
});
