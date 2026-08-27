import { describe, it, expect } from "vitest";
import {
  conFotosResueltas,
  enlaceCalendario,
  fotosDeInvitacion,
  fechaCorta,
  fechaLarga,
  fechaPuntos,
  horaCorta,
  idInvitacion,
  invitacionDe,
  invitacionTieneContenido,
  invitacionVacia,
  nombresInvitacion,
  normalizarInvitacion,
  tituloInvitacion,
} from "./index";

describe("dónde vive la invitación", () => {
  it("el id lleva el código dentro (items.id es único en TODA la base)", () => {
    expect(idInvitacion("boda-garcia")).toBe("inv:boda-garcia");
    expect(idInvitacion("xv-renata")).not.toBe(idInvitacion("boda-garcia"));
  });

  it("lee la fila del id canónico, no la primera de la colección", () => {
    // La primera fila es una COLADA: dar de alta sigue abierto a cualquiera con
    // el enlace (migración 0016), así que el que lee tiene que ir por id.
    const items = [
      { id: "colada-por-un-invitado", novia: "Falsa", tipo: "boda" },
      { id: idInvitacion("boda-garcia"), novia: "Ana", novio: "Rodrigo", tipo: "boda" },
    ];
    const inv = invitacionDe("boda-garcia", items);
    expect(inv?.novia).toBe("Ana");
  });

  it("si no está la fila del evento, devuelve null (y no la de otro evento)", () => {
    const items = [{ id: idInvitacion("otra-boda"), novia: "Ana" }];
    expect(invitacionDe("boda-garcia", items)).toBeNull();
  });
});

describe("normalizar: una invitación a medias tiene que poder pintarse", () => {
  it("rellena lo que falte en vez de fallar", () => {
    const inv = normalizarInvitacion({ tipo: "xv", festejada: "Valentina" });
    expect(inv.festejada).toBe("Valentina");
    expect(inv.itinerario).toEqual([]);
    expect(inv.rsvp.whatsapp).toBe("");
    expect(inv.ceremonia.lugar).toBe("");
  });

  it("con basura devuelve la invitación en blanco, no una excepción", () => {
    expect(() => normalizarInvitacion("💥")).not.toThrow();
    expect(normalizarInvitacion(null)).toEqual(invitacionVacia());
    // Un campo con el tipo equivocado no puede tumbar la pantalla del invitado.
    expect(() => normalizarInvitacion({ itinerario: "a las 6" })).not.toThrow();
  });

  it("una invitación en blanco NO se enseña (para eso está la demo)", () => {
    expect(invitacionTieneContenido(invitacionVacia())).toBe(false);
    expect(invitacionTieneContenido(normalizarInvitacion({ novia: "Ana" }))).toBe(true);
    expect(invitacionTieneContenido(normalizarInvitacion({ fechaISO: "2027-03-20T18:00" }))).toBe(
      true,
    );
  });
});

describe("las fotos, que viven en un almacén privado", () => {
  const conFotos = normalizarInvitacion({
    fotoPortada: "REF-portada",
    fotoCierre: "REF-cierre",
    ceremonia: { foto: "REF-misa" },
    recepcion: { foto: "REF-salon" },
    itinerario: [{ titulo: "Vals", foto: "REF-vals" }, { titulo: "Cena", foto: "" }],
    fotos: ["REF-repuesto", "REF-portada"],
  });

  it("las junta TODAS y sin repetir (una por firmar, no una por hueco)", () => {
    expect(fotosDeInvitacion(conFotos).sort()).toEqual([
      "REF-cierre",
      "REF-misa",
      "REF-portada",
      "REF-repuesto",
      "REF-salon",
      "REF-vals",
    ]);
  });

  it("no cuenta los huecos vacíos", () => {
    expect(fotosDeInvitacion(invitacionVacia())).toEqual([]);
  });

  it("cambia cada referencia por su dirección firmada, en todos los sitios", () => {
    const mapa = {
      "REF-portada": "https://firmada/portada?token=x",
      "REF-misa": "https://firmada/misa?token=x",
      "REF-vals": "https://firmada/vals?token=x",
    };
    const lista = conFotosResueltas(conFotos, mapa);
    expect(lista.fotoPortada).toBe("https://firmada/portada?token=x");
    expect(lista.ceremonia.foto).toBe("https://firmada/misa?token=x");
    expect(lista.itinerario[0]?.foto).toBe("https://firmada/vals?token=x");
    expect(lista.fotos[1]).toBe("https://firmada/portada?token=x");
  });

  /*
   * Lo que NO está en el mapa tiene que quedarse igual: las fotos de ejemplo de
   * la muestra (`/img/…`) y los enlaces que el salón pegó a mano no pasan por el
   * almacén. Esta función no puede empeorar una foto que ya se veía.
   */
  it("deja intacto lo que no es del almacén", () => {
    const demo = normalizarInvitacion({ fotoPortada: "/img/u16.jpg", fotoCierre: "" });
    const lista = conFotosResueltas(demo, { "REF-otra": "https://firmada/otra" });
    expect(lista.fotoPortada).toBe("/img/u16.jpg");
    expect(lista.fotoCierre).toBe("");
  });

  it("con el mapa vacío devuelve la invitación tal cual", () => {
    expect(conFotosResueltas(conFotos, {})).toEqual(conFotos);
  });
});

describe("títulos", () => {
  it("boda son dos nombres; XV es la festejada", () => {
    const boda = normalizarInvitacion({ tipo: "boda", novia: "Ana", novio: "Rodrigo" });
    expect(tituloInvitacion(boda)).toBe("Ana & Rodrigo");
    expect(nombresInvitacion(boda)).toBe("Ana & Rodrigo");

    const xv = normalizarInvitacion({ tipo: "xv", festejada: "Valentina" });
    expect(tituloInvitacion(xv)).toBe("Mis XV · Valentina");
  });

  it("con un solo nombre capturado no enseña un ampersand suelto", () => {
    const media = normalizarInvitacion({ tipo: "boda", novia: "Ana" });
    expect(tituloInvitacion(media)).toBe("Ana");
  });
});

describe("fecha y hora", () => {
  it("arma el texto largo en español", () => {
    expect(fechaLarga("2027-03-20T18:00")).toBe("sábado 20 de marzo de 2027");
  });

  /*
   * EL FALLO QUE ESTO VIGILA: `new Date("2027-03-20")` se interpreta en UTC, y
   * en México eso devuelve el día ANTERIOR. Una invitación que anuncia el día
   * equivocado no es un detalle cosmético, así que la fecha se parte a mano.
   */
  it("no se corre un día por la zona horaria", () => {
    expect(fechaLarga("2027-01-01T00:00")).toBe("viernes 1 de enero de 2027");
    expect(fechaLarga("2027-12-31T23:30")).toBe("viernes 31 de diciembre de 2027");
  });

  it("sin fecha capturada devuelve vacío (la sección no se dibuja)", () => {
    expect(fechaLarga("")).toBe("");
    expect(fechaLarga("mañana")).toBe("");
    expect(horaCorta("2027-03-20")).toBe("");
  });

  it("la hora sale en formato de 12 horas", () => {
    expect(horaCorta("2027-03-20T18:00")).toBe("6:00 pm");
    expect(horaCorta("2027-03-20T00:30")).toBe("12:30 am");
    expect(horaCorta("2027-03-20T12:00")).toBe("12:00 pm");
    expect(horaCorta("2027-03-20T09:05")).toBe("9:05 am");
  });

  it("las dos fechas del diseño: la de la tarjeta y la del pie", () => {
    expect(fechaPuntos("2026-10-17T19:00")).toBe("17 · 10 · 2026");
    expect(fechaCorta("2026-10-17T19:00")).toBe("17 de octubre de 2026");
    expect(fechaPuntos("")).toBe("");
    expect(fechaCorta("")).toBe("");
  });
});

describe("Agregar a mi calendario", () => {
  /*
   * La hora se escribe a mano en cada sede ("5:00 p.m.", "17:00", "8 pm") y
   * NUNCA se le corrige al salón lo que escribió: esto solo la interpreta para
   * armar el enlace. Si se leyera mal, el invitado se guardaría la boda a otra
   * hora y llegaría tarde a la misa.
   */
  it("respeta la hora de la sede, escrita como sea", () => {
    const conSufijo = enlaceCalendario({
      titulo: "Ceremonia",
      fechaISO: "2027-03-20T18:00",
      hora: "5:00 p.m.",
    });
    expect(decodeURIComponent(conSufijo)).toContain("20270320T170000/20270320T200000");

    const en24 = enlaceCalendario({ titulo: "Ceremonia", fechaISO: "2027-03-20T18:00", hora: "17:00" });
    expect(decodeURIComponent(en24)).toContain("20270320T170000");
  });

  it("sin hora de sede usa la del evento, y sin ninguna las 7 de la tarde", () => {
    const delEvento = enlaceCalendario({ titulo: "Recepción", fechaISO: "2027-03-20T20:30" });
    expect(decodeURIComponent(delEvento)).toContain("20270320T203000");

    const aCiegas = enlaceCalendario({ titulo: "Recepción", fechaISO: "2027-03-20" });
    expect(decodeURIComponent(aCiegas)).toContain("20270320T190000");
  });

  it("va en hora LOCAL, sin la Z de UTC", () => {
    // Con la Z, el invitado de otro estado se guardaría la boda a otra hora.
    const url = enlaceCalendario({ titulo: "Boda", fechaISO: "2027-03-20T18:00", hora: "6:00 pm" });
    expect(decodeURIComponent(url)).not.toContain("Z/");
    expect(url).toContain("calendar.google.com");
  });

  it("sin fecha no hay enlace (y el botón no se dibuja)", () => {
    expect(enlaceCalendario({ titulo: "Boda", fechaISO: "" })).toBe("");
  });
});

describe("las preguntas frecuentes del evento (campo nuevo, 26 ago)", () => {
  it("se normalizan y conservan pregunta y respuesta", () => {
    const inv = normalizarInvitacion({
      faq: [{ pregunta: "¿Hay estacionamiento?", respuesta: "Sí, sin costo." }],
    });
    expect(inv.faq).toHaveLength(1);
    expect(inv.faq[0]!.pregunta).toBe("¿Hay estacionamiento?");
    expect(inv.faq[0]!.respuesta).toBe("Sí, sin costo.");
  });

  it("una invitación guardada ANTES del campo (o con basura) cae a lista vacía", () => {
    // Las invitaciones reales ya guardadas no traen `faq`: no pueden romperse.
    expect(normalizarInvitacion({ novia: "Ana", novio: "Rodrigo" }).faq).toEqual([]);
    expect(normalizarInvitacion({ faq: "basura" }).faq).toEqual([]);
    expect(normalizarInvitacion({ faq: [{ pregunta: 42 }] }).faq).toEqual([]);
  });
});
