import { describe, it, expect } from "vitest";
import {
  avisoPrivacidad,
  terminosYCondiciones,
  consentimientoImagen,
  todosLosDocumentos,
  datosDelSalon,
  modelo,
  estadoLegal,
  fechaLegible,
  MODELO_SALON,
  ACTUALIZADO_TEXTOS,
  REVISADO_POR_ABOGADO,
  AVISO_BORRADOR,
  SIN_RELLENAR,
} from "./index";

/**
 * Pruebas de los datos legales POR SALÓN (migración 0033).
 *
 * La que de verdad importa es la primera: el 29 ago 2026 se descubrió que el
 * aviso publicado nombraba responsable al salón de demostración y daba el
 * correo y el domicilio personales de quien mantiene el proyecto. La prueba
 * que vigilaba esto (`tests/paneles/legal-publicado.test.ts`) NO podía cazarlo,
 * porque fijaba `salon: "Hacienda Santa Renata"` y solo variaba `contacto` y
 * `domicilio`. Aquí se cubre justo ese hueco: el del NOMBRE.
 */

const PROVEEDOR = { nombre: "Suite para Salones", sitio: "https://ejemplo.test/legal" };

const textoDe = (doc: { secciones: { titulo: string; parrafos: string[] }[]; resumen: string }) =>
  [doc.resumen, ...doc.secciones.flatMap((s) => [s.titulo, ...s.parrafos])].join("\n");

describe("el documento MODELO (sin salón conocido)", () => {
  const d = modelo(PROVEEDOR);

  it("NUNCA publica la palabra PENDIENTE en el hueco del nombre", () => {
    // El candado: `avisoPrivacidad` interpola `d.salon` EN CRUDO (solo
    // domicilio y contacto pasan por `falta()`), así que un modelo con
    // SIN_RELLENAR publicaría «PENDIENTE es el responsable del tratamiento».
    expect(d.salon).toBe(MODELO_SALON);
    expect(d.salon).not.toBe(SIN_RELLENAR);
    expect(textoDe(avisoPrivacidad(d))).not.toContain(SIN_RELLENAR);
  });

  it("ninguno de los tres documentos enseña PENDIENTE ni un hueco vacío", () => {
    for (const doc of todosLosDocumentos(d)) {
      const texto = textoDe(doc);
      expect(texto).not.toContain(SIN_RELLENAR);
      expect(texto).not.toContain("undefined");
      expect(texto).not.toMatch(/\s{2,}es el responsable/);
    }
  });

  it("no nombra a NINGUNA persona como responsable: ni un correo suelto", () => {
    for (const doc of todosLosDocumentos(d)) {
      // Sin datos del salón no puede aparecer ninguna dirección de correo en
      // el hueco del responsable. El único correo admisible sería el del
      // proveedor, y el proveedor NO es el responsable.
      expect(textoDe(doc)).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    }
  });

  it("sigue diciendo a quién acudir aunque no haya datos", () => {
    const texto = textoDe(avisoPrivacidad(d));
    expect(texto).toMatch(/personal de/i);
    expect(texto).toMatch(/recepción del salón/i);
  });

  it("dice el responsable con la frase modelo, gramaticalmente entera", () => {
    expect(textoDe(avisoPrivacidad(d))).toContain(
      `${MODELO_SALON} es el responsable del tratamiento`,
    );
  });
});

describe("una fila a medias (solo razón social)", () => {
  const d = datosDelSalon({ salon: "Jardín Los Encinos" }, PROVEEDOR);

  it("nombra al salón de verdad, no al modelo", () => {
    expect(d.salon).toBe("Jardín Los Encinos");
  });

  it("usa los textos honestos de falta() en vez de inventar domicilio o correo", () => {
    const texto = textoDe(avisoPrivacidad(d));
    expect(texto).toContain("Jardín Los Encinos es el responsable del tratamiento");
    expect(texto).toMatch(/domicilio se añadirá a este aviso/i);
    expect(texto).toMatch(/todavía no ha publicado un correo/i);
    expect(texto).not.toContain(SIN_RELLENAR);
  });
});

describe("una fila completa", () => {
  const d = datosDelSalon(
    {
      salon: "Hacienda Santa Renata S.A. de C.V.",
      domicilio: "Camino a la Vieja Hacienda km 4.5",
      contacto: "privacidad@santarenata.mx",
      actualizado: "2026-08-29T10:00:00.000Z",
    },
    PROVEEDOR,
  );

  it("imprime el responsable con su domicilio y su correo", () => {
    const texto = textoDe(avisoPrivacidad(d));
    expect(texto).toContain("con domicilio en Camino a la Vieja Hacienda km 4.5");
    expect(texto).toContain("privacidad@santarenata.mx");
  });

  it("el proveedor sale del código, nunca de la fila", () => {
    expect(d.proveedor).toBe(PROVEEDOR.nombre);
    expect(d.sitio).toBe(PROVEEDOR.sitio);
    expect(textoDe(avisoPrivacidad(d))).toContain(
      `${PROVEEDOR.nombre} presta el servicio técnico`,
    );
  });

  it("un salón NO puede colarse como proveedor", () => {
    const colado = datosDelSalon(
      { salon: "Malicioso" } as unknown as Parameters<typeof datosDelSalon>[0],
      PROVEEDOR,
    );
    expect(colado.proveedor).toBe(PROVEEDOR.nombre);
  });
});

describe("el plazo de conservación", () => {
  const base = { salon: "Jardín Los Encinos", domicilio: "Calle 1", contacto: "a@b.mx" };

  it("sin plazo, el apartado 4 queda palabra por palabra como estaba", () => {
    const texto = textoDe(avisoPrivacidad(datosDelSalon(base, PROVEEDOR)));
    expect(texto).toMatch(/se borra cuando/i);
    expect(texto).not.toMatch(/plazo máximo/i);
  });

  it("con plazo, lo dice como COMPROMISO del salón y no como borrado automático", () => {
    const texto = textoDe(
      avisoPrivacidad(datosDelSalon({ ...base, diasConservacion: 90 }, PROVEEDOR)),
    );
    expect(texto).toContain("plazo máximo de 90 días");
    expect(texto).toMatch(/el sistema no borra nada solo/i);
  });

  it("un plazo absurdo o nulo no se cuela en el texto", () => {
    for (const dias of [0, -5, null, undefined]) {
      const texto = textoDe(
        avisoPrivacidad(datosDelSalon({ ...base, diasConservacion: dias }, PROVEEDOR)),
      );
      expect(texto).not.toMatch(/plazo máximo/i);
    }
  });
});

describe("fechaLegible", () => {
  it("traduce una fecha ISO a algo que se lee", () => {
    expect(fechaLegible("2026-08-29T10:00:00.000Z")).toMatch(/2026/);
  });

  it("con basura o vacío cae a la fecha de los textos, nunca a 'Invalid Date'", () => {
    for (const malo of ["", "no soy una fecha", null, undefined]) {
      expect(fechaLegible(malo)).toBe(ACTUALIZADO_TEXTOS);
    }
  });
});

describe("estadoLegal — la misma regla que el CHECK de la 0033", () => {
  it("una fila vacía no está completa y dice qué falta", () => {
    const { completo, pendientes } = estadoLegal(null);
    expect(completo).toBe(false);
    expect(pendientes).toHaveLength(3);
  });

  it("un correo sin forma de correo no cuenta", () => {
    const { completo, pendientes } = estadoLegal({
      salon: "X",
      domicilio: "Y",
      contacto: "no-es-un-correo",
    });
    expect(completo).toBe(false);
    expect(pendientes.join(" ")).toMatch(/correo válido/i);
  });

  it("la cadena PENDIENTE no vale como dato relleno", () => {
    const { completo } = estadoLegal({
      salon: SIN_RELLENAR,
      domicilio: SIN_RELLENAR,
      contacto: "a@b.mx",
    });
    expect(completo).toBe(false);
  });

  it("con razón social, domicilio y correo válido, está completa", () => {
    expect(estadoLegal({ salon: "X", domicilio: "Y", contacto: "a@b.mx" }).completo).toBe(true);
  });
});

describe("el aviso de borrador: quién lo ve y quién no", () => {
  const d = modelo(PROVEEDOR);

  it("mientras no lo revise un abogado, sale en los TÉRMINOS", () => {
    expect(REVISADO_POR_ABOGADO).toBe(false);
    const texto = textoDe(terminosYCondiciones(d));
    expect(texto).toContain(AVISO_BORRADOR);
    expect(texto).toContain("10. Sobre estos textos");
  });

  it("NO sale en los documentos que lee el invitado", () => {
    expect(textoDe(avisoPrivacidad(d))).not.toContain(AVISO_BORRADOR);
    expect(textoDe(consentimientoImagen(d))).not.toContain(AVISO_BORRADOR);
    expect(textoDe(avisoPrivacidad(d))).not.toMatch(/abogado/i);
    expect(textoDe(consentimientoImagen(d))).not.toMatch(/abogado/i);
  });
});
