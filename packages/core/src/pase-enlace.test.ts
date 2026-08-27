import { describe, it, expect } from "vitest";
import {
  codificarPaseEnlace,
  decodificarPaseEnlace,
  leerPaseDeHash,
  idPaseDeInvitado,
  decodificarInvitadoEnlace,
} from "./index";

describe("el enlace del pase: ida y vuelta", () => {
  it("codificar y decodificar devuelven el mismo pase completo, acentos incluidos", () => {
    const pase = {
      id: "a1b2c3d4-0000-0000-0000-000000000001",
      nombre: "Familia Núñez Peña",
      cupos: 4,
      mesa: "Mesa Ángel",
      tipo: "VIP" as const,
    };
    expect(decodificarPaseEnlace(codificarPaseEnlace(pase))).toEqual(pase);
  });

  it("sin mesa ni tipo, el pase vuelve sin inventarlos", () => {
    const pase = { id: "IN-7", nombre: "Rodrigo", cupos: 1 };
    const leido = decodificarPaseEnlace(codificarPaseEnlace(pase));
    expect(leido).toEqual(pase);
    expect(leido?.mesa).toBeUndefined();
    expect(leido?.tipo).toBeUndefined();
  });
});

describe("compatibilidad con el formato viejo de pases-qr (es un CONTRATO)", () => {
  /*
   * EL FALLO QUE ESTO VIGILA: el codificarPase viejo de apps/pases-qr emite el
   * invitado con `personas` y NO conoce `cupos`. Hay pases ya repartidos con
   * ese formato; si core dejara de entender `personas`, esos enlaces morirían.
   */
  it("un enlace armado con la receta vieja (personas, sin cupos) se lee con cupos", () => {
    const datos = btoa(
      encodeURIComponent(
        JSON.stringify({ id: "SR-2087", nombre: "Familia Loaiza Ramírez", mesa: "4", personas: 4, tipo: "General" }),
      ),
    );
    expect(decodificarPaseEnlace(datos)).toEqual({
      id: "SR-2087",
      nombre: "Familia Loaiza Ramírez",
      cupos: 4,
      mesa: "4",
      tipo: "General",
    });
  });

  it("el enlace nuevo también lo entiende el /pase viejo: emite personas junto a cupos", () => {
    const datos = codificarPaseEnlace({ id: "IN-1", nombre: "Ana", cupos: 3 });
    // La receta vieja lee el JSON a pelo y busca `personas`.
    const crudo = JSON.parse(decodeURIComponent(atob(datos))) as { personas?: number };
    expect(crudo.personas).toBe(3);
  });

  it("el mismo hash lo entiende el enlace personal de la suite (cupos correcto)", () => {
    // Un solo enlace sirve en los dos mundos: el pase Y el portal/photobooth,
    // que leen con decodificarInvitadoEnlace y solo conocen id/nombre/cupos.
    const datos = codificarPaseEnlace({ id: "IN-9", nombre: "Familia Núñez", cupos: 5, mesa: "2" });
    expect(decodificarInvitadoEnlace(datos)).toEqual({
      id: "IN-9",
      nombre: "Familia Núñez",
      cupos: 5,
    });
  });
});

describe("decodificar nunca lanza (el enlace llega manoseado)", () => {
  it("basura, base64 inválido o JSON sin id devuelven null", () => {
    expect(decodificarPaseEnlace("💥 esto no es base64")).toBeNull();
    expect(decodificarPaseEnlace("no-es-base64-válido!!!")).toBeNull();
    expect(
      decodificarPaseEnlace(btoa(encodeURIComponent(JSON.stringify({ nombre: "Ana" })))),
    ).toBeNull();
    expect(decodificarPaseEnlace(btoa(encodeURIComponent(JSON.stringify("hola"))))).toBeNull();
  });

  it("cupos y personas inválidos valen por 1; personas rescata a cupos ausente", () => {
    const armar = (extra: Record<string, unknown>) =>
      btoa(encodeURIComponent(JSON.stringify({ id: "IN-1", nombre: "Ana", ...extra })));
    expect(decodificarPaseEnlace(armar({ cupos: 0, personas: 0 }))?.cupos).toBe(1);
    expect(decodificarPaseEnlace(armar({ cupos: "cuatro" }))?.cupos).toBe(1);
    expect(decodificarPaseEnlace(armar({}))?.cupos).toBe(1);
    // Cupos raro pero personas sano: se rescata personas.
    expect(decodificarPaseEnlace(armar({ cupos: -2, personas: 3 }))?.cupos).toBe(3);
  });

  it("un tipo que no es General ni VIP se descarta (queda undefined)", () => {
    const datos = btoa(
      encodeURIComponent(JSON.stringify({ id: "IN-1", nombre: "Ana", cupos: 2, tipo: "Platino" })),
    );
    const pase = decodificarPaseEnlace(datos);
    expect(pase?.cupos).toBe(2);
    expect(pase?.tipo).toBeUndefined();
  });
});

describe("leerPaseDeHash: lo que le llega a la app tal cual", () => {
  const datos = codificarPaseEnlace({ id: "IN-7", nombre: "Rodrigo", cupos: 1 });

  it("con el '#' de adelante o sin él, lee lo mismo", () => {
    expect(leerPaseDeHash(`#${datos}`)?.id).toBe("IN-7");
    expect(leerPaseDeHash(datos)?.id).toBe("IN-7");
  });

  it("sin fragmento no hay pase", () => {
    expect(leerPaseDeHash("")).toBeNull();
    expect(leerPaseDeHash("#")).toBeNull();
  });
});

describe("idPaseDeInvitado: el id de la fila del pase", () => {
  it("a un UUID de guest le pone el prefijo PS- (su fila de respuestas ya usa el UUID a pelo)", () => {
    expect(idPaseDeInvitado("a1b2c3d4-0000-0000-0000-000000000001")).toBe(
      "PS-a1b2c3d4-0000-0000-0000-000000000001",
    );
  });

  it("un pase creado a mano en pases-qr (SR-) se respeta tal cual", () => {
    expect(idPaseDeInvitado("SR-AB12CD34")).toBe("SR-AB12CD34");
  });

  it("un PS- ya prefijado no se vuelve a prefijar (aplicar dos veces es seguro)", () => {
    expect(idPaseDeInvitado("PS-a1b2c3d4")).toBe("PS-a1b2c3d4");
  });
});

describe("el contenido del QR del pase (la receta única de la puerta y el portal)", () => {
  it("respeta los ids de la puerta y prefija los del panel", async () => {
    const { contenidoQRPase, QR_PASE_PREFIJO } = await import("./index");
    // Un pase creado en la puerta (SR-…) va TAL CUAL: los QR impresos valen.
    expect(contenidoQRPase("SR-1042")).toBe("PASE-SR:SR-1042");
    // Un invitado del panel (UUID) va como la fila de su pase: PS-<uuid>.
    expect(contenidoQRPase("3f2b8c1a-0000-4000-8000-000000000001")).toBe(
      "PASE-SR:PS-3f2b8c1a-0000-4000-8000-000000000001",
    );
    // Aplicarla dos veces no doble-prefija (misma promesa que idPaseDeInvitado).
    expect(contenidoQRPase("PS-abc")).toBe("PASE-SR:PS-abc");
    // El prefijo es un CONTRATO con el escáner ya desplegado: no puede cambiar.
    expect(QR_PASE_PREFIJO).toBe("PASE-SR:");
  });
});
