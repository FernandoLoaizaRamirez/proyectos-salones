import { describe, it, expect } from "vitest";
import {
  codificarInvitadoEnlace,
  decodificarInvitadoEnlace,
  leerInvitadoDeHash,
} from "./index";

describe("el enlace personal: ida y vuelta", () => {
  it("codificar y decodificar devuelven al mismo invitado, acentos y eñe incluidos", () => {
    const inv = { id: "IN-001", nombre: "Familia Núñez Peña", cupos: 4 };
    expect(decodificarInvitadoEnlace(codificarInvitadoEnlace(inv))).toEqual(inv);
  });

  it("aguanta nombres con de todo: diéresis, guiones, comillas", () => {
    const inv = { id: "IN-002", nombre: 'María "Güera" Ramírez-Solís', cupos: 2 };
    expect(decodificarInvitadoEnlace(codificarInvitadoEnlace(inv))).toEqual(inv);
  });
});

describe("compatibilidad con el formato del panel (es un CONTRATO)", () => {
  /*
   * EL FALLO QUE ESTO VIGILA: hay enlaces ya repartidos en manos de invitados
   * reales, empaquetados por `codificarInvitado` del panel con EXACTAMENTE
   * btoa(encodeURIComponent(JSON.stringify(...))). Si el empaquetado de core
   * divergiera en un solo byte, esos enlaces dejarían de leerse.
   */
  it("produce byte a byte lo mismo que el panel", () => {
    const aManoAscii = btoa(
      encodeURIComponent(JSON.stringify({ id: "abc", nombre: "Familia Nunez", cupos: 4 })),
    );
    expect(codificarInvitadoEnlace({ id: "abc", nombre: "Familia Nunez", cupos: 4 })).toBe(
      aManoAscii,
    );

    // Y con acentos, que es donde un base64 propio podría divergir de btoa.
    const aManoAcentos = btoa(
      encodeURIComponent(JSON.stringify({ id: "IN-9", nombre: "Familia Núñez", cupos: 3 })),
    );
    expect(codificarInvitadoEnlace({ id: "IN-9", nombre: "Familia Núñez", cupos: 3 })).toBe(
      aManoAcentos,
    );
  });

  it("decodifica un enlace armado a mano con la receta del panel", () => {
    const datos = btoa(
      encodeURIComponent(JSON.stringify({ id: "abc", nombre: "Familia Nunez", cupos: 4 })),
    );
    expect(decodificarInvitadoEnlace(datos)).toEqual({
      id: "abc",
      nombre: "Familia Nunez",
      cupos: 4,
    });
  });
});

describe("decodificar nunca lanza (el enlace llega manoseado)", () => {
  it("basura, base64 inválido o JSON sin id devuelven null", () => {
    expect(decodificarInvitadoEnlace("💥 esto no es base64")).toBeNull();
    expect(decodificarInvitadoEnlace("no-es-base64-válido!!!")).toBeNull();
    // Base64 legítimo pero el JSON de adentro no trae id.
    expect(
      decodificarInvitadoEnlace(btoa(encodeURIComponent(JSON.stringify({ nombre: "Ana" })))),
    ).toBeNull();
    // Ni siquiera es un objeto.
    expect(decodificarInvitadoEnlace(btoa(encodeURIComponent(JSON.stringify("hola"))))).toBeNull();
  });

  it("cupos inválidos valen por 1 (mejor dejar pasar a uno que dejar fuera)", () => {
    const armar = (cupos: unknown) =>
      btoa(encodeURIComponent(JSON.stringify({ id: "IN-1", nombre: "Ana", cupos })));
    expect(decodificarInvitadoEnlace(armar(0))?.cupos).toBe(1);
    expect(decodificarInvitadoEnlace(armar(-3))?.cupos).toBe(1);
    expect(decodificarInvitadoEnlace(armar("cuatro"))?.cupos).toBe(1);
    expect(decodificarInvitadoEnlace(armar(undefined))?.cupos).toBe(1);
    // Un decimal se redondea hacia abajo, no se rechaza.
    expect(decodificarInvitadoEnlace(armar(2.9))?.cupos).toBe(2);
  });
});

describe("leerInvitadoDeHash: lo que le llega a la app tal cual", () => {
  const datos = codificarInvitadoEnlace({ id: "IN-7", nombre: "Rodrigo", cupos: 1 });

  it("con el '#' de adelante o sin él, lee lo mismo", () => {
    expect(leerInvitadoDeHash(`#${datos}`)?.id).toBe("IN-7");
    expect(leerInvitadoDeHash(datos)?.id).toBe("IN-7");
  });

  it("sin fragmento no hay invitado (la app cae a su modo abierto)", () => {
    expect(leerInvitadoDeHash("")).toBeNull();
    // Un '#' solito (location.hash de una página sin fragmento útil).
    expect(leerInvitadoDeHash("#")).toBeNull();
  });
});
