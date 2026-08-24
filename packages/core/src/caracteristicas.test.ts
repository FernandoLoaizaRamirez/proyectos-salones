import { describe, expect, it } from "vitest";
import { resolveEntitlements } from "./entitlements";
import {
  CARACTERISTICAS_CONOCIDAS,
  esCaracteristica,
  moduloDe,
  tieneCaracteristica,
} from "./caracteristicas";

describe("moduloDe / esCaracteristica", () => {
  it("saca el módulo de una clave fina", () => {
    expect(moduloDe("album.descargas")).toBe("album");
    expect(moduloDe("muro.fotos")).toBe("muro");
  });

  it("una clave sin punto es su propio módulo", () => {
    expect(moduloDe("album")).toBe("album");
    expect(esCaracteristica("album")).toBe(false);
    expect(esCaracteristica("album.descargas")).toBe(true);
  });
});

describe("tieneCaracteristica — LA HERENCIA", () => {
  const plan = { id: "gestionado", nombre: "Gestionado", funciones: ["album", "muro"] };

  it("sin fila propia, HEREDA de su módulo", () => {
    const e = resolveEntitlements(plan);
    // Nadie opinó sobre las descargas: manda el álbum, que sí está.
    expect(tieneCaracteristica(e, CARACTERISTICAS_CONOCIDAS.AlbumDescargas)).toBe(true);
  });

  it("si el módulo está apagado, la característica también", () => {
    const e = resolveEntitlements(plan, {}, { album: false });
    expect(tieneCaracteristica(e, CARACTERISTICAS_CONOCIDAS.AlbumDescargas)).toBe(false);
  });

  it("con fila propia, esa MANDA sobre el módulo", () => {
    // El caso que vende: "el álbum sí, pero sin descargas".
    const e = resolveEntitlements(plan, {}, { "album.descargas": false });
    expect(tieneCaracteristica(e, "album")).toBe(true);
    expect(tieneCaracteristica(e, CARACTERISTICAS_CONOCIDAS.AlbumDescargas)).toBe(false);
  });

  it("y también al revés: encenderla sin que el módulo la traiga", () => {
    const e = resolveEntitlements({ id: "x", nombre: "X", funciones: [] }, {}, {
      "album.descargas": true,
    });
    expect(tieneCaracteristica(e, CARACTERISTICAS_CONOCIDAS.AlbumDescargas)).toBe(true);
  });

  it("un módulo que no se contrató no regala sus detalles", () => {
    const e = resolveEntitlements(plan);
    // La playlist no está en el plan.
    expect(tieneCaracteristica(e, CARACTERISTICAS_CONOCIDAS.PlaylistVotos)).toBe(false);
  });

  it("con una clave sin punto se comporta como tieneFuncion", () => {
    const e = resolveEntitlements(plan);
    expect(tieneCaracteristica(e, "album")).toBe(true);
    expect(tieneCaracteristica(e, "photobooth")).toBe(false);
  });
});

describe("el catálogo de características", () => {
  it("todas se llaman modulo.caracteristica", () => {
    for (const clave of Object.values(CARACTERISTICAS_CONOCIDAS)) {
      expect(clave, clave).toMatch(/^[a-z-]+\.[a-z-]+$/);
    }
  });
});
