import { describe, it, expect } from "vitest";
import {
  CUPOS_MAX,
  enlaceWhatsApp,
  leerLista,
  normalizarTelefono,
  resumenLista,
  telefonoBonito,
} from "../../apps/catalogo/src/lib/lista-invitados";

/**
 * PEGAR LA LISTA DE INVITADOS Y LOS TELÉFONOS
 * (`apps/catalogo/src/lib/lista-invitados.ts`).
 * ---------------------------------------------------------------------------
 * Lo que se vigila aquí no es "que la función funcione": es que el salón pueda
 * pegar lo que YA TIENE sin pelearse con el formato, y que un teléfono mal
 * entendido no acabe mandándole la invitación de una boda a un desconocido.
 *
 * Los casos de teléfono no son inventados: son las cinco formas en que un
 * número mexicano llega escrito en la vida real —con lada, sin lada, con el 044
 * viejo, con el "1" que Telcel metía en medio, y copiado con espacios—. Todas
 * tienen que acabar en el mismo número, porque el salón no debería tener que
 * saber cuál es la buena.
 */

describe("el teléfono queda como lo quiere WhatsApp", () => {
  it("a un número nacional de 10 dígitos le pone la lada de México", () => {
    expect(normalizarTelefono("6671234567")).toBe("526671234567");
  });

  it("aguanta espacios, guiones, paréntesis y el +", () => {
    for (const escrito of [
      "+52 667 123 4567",
      "52 (667) 123-4567",
      "667-123-4567",
      "  667 123 4567  ",
    ]) {
      expect(normalizarTelefono(escrito), `con "${escrito}"`).toBe("526671234567");
    }
  });

  it("quita el 044 y el 045 viejos de marcación a celular", () => {
    expect(normalizarTelefono("044 667 123 4567")).toBe("526671234567");
    expect(normalizarTelefono("045 667 123 4567")).toBe("526671234567");
  });

  it('quita el "1" que se colaba entre la lada y el número', () => {
    expect(normalizarTelefono("+52 1 667 123 4567")).toBe("526671234567");
  });

  it("respeta un número de otro país en vez de mexicanizarlo", () => {
    expect(normalizarTelefono("+1 305 555 0123")).toBe("13055550123");
  });

  it("devuelve vacío cuando eso NO es un teléfono", () => {
    // Preferimos un invitado sin teléfono a uno con un número inventado: un
    // número equivocado le manda la invitación de una boda a un extraño.
    for (const basura of ["", "   ", "12345", "sin teléfono", "-", "0"]) {
      expect(normalizarTelefono(basura), `con "${basura}"`).toBe("");
    }
  });

  it("se lee bonito en pantalla, pero se guarda en crudo", () => {
    expect(telefonoBonito("526671234567")).toBe("+52 667 123 4567");
    expect(telefonoBonito("13055550123")).toBe("+13055550123");
    expect(telefonoBonito("")).toBe("");
  });
});

describe("el botón de WhatsApp", () => {
  it("abre el chat del invitado cuando hay teléfono", () => {
    expect(enlaceWhatsApp("526671234567", "hola")).toBe("https://wa.me/526671234567?text=hola");
  });

  it("cae al selector de contactos cuando no lo hay", () => {
    // Es el comportamiento viejo, y tiene que seguir funcionando: la lista
    // existente no tiene teléfonos y nadie va a capturarlos de golpe.
    expect(enlaceWhatsApp("", "hola")).toBe("https://wa.me/?text=hola");
  });

  it("escapa el mensaje para que no rompa el enlace", () => {
    expect(enlaceWhatsApp("", "hola & adiós\nhttps://x.com/?a=1")).toBe(
      "https://wa.me/?text=hola%20%26%20adi%C3%B3s%0Ahttps%3A%2F%2Fx.com%2F%3Fa%3D1",
    );
  });
});

describe("leer la lista pegada", () => {
  it("entiende lo que sale de un Excel (separado por tabuladores)", () => {
    const r = leerLista("Familia Ramírez\t6671234567\t4\nAna Ríos\t6679876543\t2", 2);
    expect(r.filas).toEqual([
      { nombre: "Familia Ramírez", telefono: "526671234567", cupos: 4 },
      { nombre: "Ana Ríos", telefono: "526679876543", cupos: 2 },
    ]);
  });

  it("entiende comas y punto y coma, que es como lo escribe la gente", () => {
    expect(leerLista("Ana, 6671234567, 3", 2).filas[0]).toEqual({
      nombre: "Ana",
      telefono: "526671234567",
      cupos: 3,
    });
    expect(leerLista("Ana; 6671234567; 3", 2).filas[0]).toEqual({
      nombre: "Ana",
      telefono: "526671234567",
      cupos: 3,
    });
  });

  it("reconoce cada campo por lo que ES, no por su posición", () => {
    // Si el Excel del salón trae las columnas al revés, sigue saliendo bien:
    // lo largo es el teléfono y lo chiquito son los cupos.
    expect(leerLista("Ana, 4, 6671234567", 2).filas[0]).toEqual({
      nombre: "Ana",
      telefono: "526671234567",
      cupos: 4,
    });
  });

  it("un nombre solo también vale, con los cupos que se hayan elegido", () => {
    expect(leerLista("Tío Beto", 3).filas[0]).toEqual({
      nombre: "Tío Beto",
      telefono: "",
      cupos: 3,
    });
  });

  it("se salta los renglones en blanco sin quejarse", () => {
    const r = leerLista("\n\nAna\n   \nBeto\n\n", 1);
    expect(r.filas.map((f) => f.nombre)).toEqual(["Ana", "Beto"]);
    expect(r.rechazados).toEqual([]);
  });

  it("aparta lo que no tiene nombre en vez de inventarse un invitado", () => {
    // Una lista numerada mal pegada: "1", "2", "3" no son personas.
    const r = leerLista("Ana\n1\n2", 2);
    expect(r.filas.map((f) => f.nombre)).toEqual(["Ana"]);
    expect(r.rechazados).toEqual(["1", "2"]);
  });

  it("no vuelve a dar de alta a quien ya está en la lista", () => {
    // Pegar la lista completa por segunda vez es lo que pasa SIEMPRE.
    const r = leerLista("Ana Ríos\nBeto", 2, ["ana rios"]);
    expect(r.filas.map((f) => f.nombre)).toEqual(["Beto"]);
    expect(r.repetidos).toEqual(["Ana Ríos"]);
  });

  it("tampoco lo duplica si viene dos veces dentro del mismo pegado", () => {
    const r = leerLista("Ana\nANA\nana", 2);
    expect(r.filas).toHaveLength(1);
    expect(r.repetidos).toHaveLength(2);
  });

  it("recorta un nombre larguísimo al mismo tope que el formulario", () => {
    expect(leerLista("x".repeat(200), 2).filas[0]?.nombre).toHaveLength(60);
  });

  it("un teléfono que no se entiende deja al invitado sin teléfono, no fuera", () => {
    const r = leerLista("Ana, no tiene", 2);
    expect(r.filas[0]).toEqual({ nombre: "Ana", telefono: "", cupos: 2 });
  });

  it("nunca acepta más cupos de los que ofrece el panel", () => {
    // "80" no son cupos: es basura de una columna que no era la de cupos.
    const r = leerLista(`Ana, ${CUPOS_MAX + 68}`, 2);
    expect(r.filas[0]?.cupos).toBe(2);
  });

  it("resume en una línea lo que va a pasar, antes de tocar la base", () => {
    const r = leerLista("Ana, 6671234567\nBeto\n7", 2, []);
    expect(resumenLista(r)).toBe("2 invitados por agregar · 1 con teléfono · 1 sin nombre");
  });

  it("aguanta un pegado real, sucio, sin romperse", () => {
    const sucio = [
      "Familia Ramírez\t+52 667 123 4567\t4",
      "",
      "Ana Sofía Ríos,6679876543",
      "Tío Beto",
      "   ",
      "Sra. Laura Medina; 044 667 111 2233; 2",
      "3",
    ].join("\n");
    const r = leerLista(sucio, 2);
    expect(r.filas).toHaveLength(4);
    expect(r.rechazados).toEqual(["3"]);
    expect(r.filas.filter((f) => f.telefono)).toHaveLength(3);
    expect(r.filas[3]).toEqual({
      nombre: "Sra. Laura Medina",
      telefono: "526671112233",
      cupos: 2,
    });
  });
});
