import { describe, it, expect } from "vitest";
import {
  avisoPrivacidad,
  terminosYCondiciones,
  consentimientoImagen,
  documento,
  todosLosDocumentos,
  DOCUMENTOS,
  type DatosLegales,
} from "./index";

/**
 * Pruebas de los textos legales.
 *
 * No comprueban "que el texto suene bien" —eso lo revisa un abogado— sino tres
 * cosas que sí se pueden verificar solas y que, si se rompen, dejan el documento
 * legalmente cojo sin que nadie se dé cuenta:
 *
 *   1. Que el aviso de privacidad lleva los apartados que el artículo 16 de la
 *      LFPDPPP exige. Si alguien borra una sección editando, la prueba avisa.
 *   2. Que los datos del salón (responsable, domicilio, contacto) aparecen de
 *      verdad en el texto. Un aviso sin responsable identificado no sirve.
 *   3. Que NO se cuela el nombre del proveedor donde debería ir el del salón:
 *      quien figura como responsable asume la responsabilidad legal.
 */

const DATOS: DatosLegales = {
  salon: "Hacienda Santa Renata",
  contacto: "privacidad@santarenata.mx",
  domicilio: "Calle Falsa 123, Culiacán, Sinaloa",
  proveedor: "Suite para Salones",
  sitio: "https://suite-salones.vercel.app/legal",
  actualizado: "20 de julio de 2026",
};

/** Todo el texto de un documento, aplanado, para buscar dentro. */
const textoDe = (doc: { secciones: { titulo: string; parrafos: string[] }[] }): string =>
  doc.secciones.map((s) => `${s.titulo}\n${s.parrafos.join("\n")}`).join("\n");

describe("Aviso de privacidad", () => {
  it("incluye los apartados que exige el artículo 16 de la LFPDPPP", () => {
    const texto = textoDe(avisoPrivacidad(DATOS)).toLowerCase();

    // 1. Identidad y domicilio del responsable
    expect(texto).toContain("responsable");
    expect(texto).toContain(DATOS.domicilio.toLowerCase());
    // 2. Finalidades del tratamiento
    expect(texto).toContain("para qué");
    // 3. Medios para limitar el uso o divulgación
    expect(texto).toContain("limitar el uso");
    // 4. Medios para ejercer los derechos ARCO
    expect(texto).toContain("acceder");
    expect(texto).toContain("rectificar");
    expect(texto).toContain("cancelar");
    expect(texto).toContain("oponerte");
    // 5. Transferencias de datos
    expect(texto).toContain("transferencia");
    // 6. Procedimiento para comunicar cambios
    expect(texto).toContain("cambios en este aviso");
  });

  it("identifica al SALÓN como responsable y al proveedor solo como encargado", () => {
    const doc = avisoPrivacidad(DATOS);
    // Si algún día el aviso se quedara sin secciones, el texto sale vacío y las
    // comprobaciones de abajo fallan solas (que es justo lo que queremos).
    const texto = (doc.secciones[0]?.parrafos ?? []).join(" ");

    // El salón responde por los datos…
    expect(texto).toContain(`${DATOS.salon}, con domicilio en ${DATOS.domicilio}, es el responsable`);
    // …y el proveedor solo los trata por cuenta de aquel.
    expect(texto).toContain(`${DATOS.proveedor} presta el servicio técnico`);
    expect(texto).toContain("encargado");
  });

  it("da un correo de contacto para ejercer los derechos", () => {
    expect(textoDe(avisoPrivacidad(DATOS))).toContain(DATOS.contacto);
  });

  it("declara la transferencia internacional (servidores fuera de México)", () => {
    const texto = textoDe(avisoPrivacidad(DATOS));
    expect(texto).toContain("Canadá");
    expect(texto.toLowerCase()).toContain("transferencia internacional");
  });

  it("no promete cosas que el sistema no hace", () => {
    const texto = textoDe(avisoPrivacidad(DATOS)).toLowerCase();
    // El sistema no hace reconocimiento facial ni vende datos: debe decirlo.
    expect(texto).toContain("no usamos reconocimiento facial");
    expect(texto).toContain("no los vendemos");
  });

  /**
   * LOS CUATRO SITIOS DONDE EL AVISO MENTÍA (corregidos el 10 ago 2026).
   *
   * La regla que manda aquí es que **un aviso que miente es peor que no tener
   * ninguno**: promete derechos que no se pueden ejercer y, cuando alguien lo
   * compara con la realidad, tumba la credibilidad de todo el documento —
   * incluida la parte que sí era cierta. Cada caso de abajo es un hecho del
   * código, comprobado, que el texto contradecía o se callaba.
   */
  describe("dice la verdad sobre lo que de verdad pasa", () => {
    it("nombra a Shotstack, que se descarga los videos de los invitados", () => {
      // apps/brindis/src/app/api/recuerdo/route.ts:25 manda las direcciones de
      // los videos a api.shotstack.io, que se los baja a sus servidores para
      // montar el video de recuerdo. Son caras y voces, y salen de México.
      // El aviso decía "usamos DOS proveedores… fuera de eso NO transferimos".
      const texto = textoDe(avisoPrivacidad(DATOS));
      expect(texto).toContain("Shotstack");
      expect(texto).not.toMatch(/usamos dos proveedores/i);
    });

    it("nombra a WhatsApp, por donde salen nombres y mensajes", () => {
      // Hay 22 enlaces `wa.me` repartidos por las apps: al pulsarlos, el
      // contenido (un pase, un mensaje firmado, una lista) pasa por Meta.
      const texto = textoDe(avisoPrivacidad(DATOS));
      expect(texto).toContain("WhatsApp");
    });

    it("no promete que el contenido caduque solo, porque no caduca", () => {
      // No existe ninguna limpieza automática: el contenido se borra cuando el
      // salón cierra el evento, y punto. Decir "un periodo razonable" sonaba a
      // que algo se encarga solo, y no hay nada que se encargue.
      const texto = textoDe(avisoPrivacidad(DATOS));
      expect(texto).not.toMatch(/periodo razonable/i);
      expect(texto).toMatch(/se borra cuando/i);
    });

    it("avisa del dato que se manda solo cuando falla una subida", () => {
      // packages/sync/src/index.ts manda `navigator.userAgent` sin que la
      // persona toque nada, mientras ve un mensaje de error. El aviso decía
      // "SOLO lo que tú entregas voluntariamente".
      const texto = textoDe(avisoPrivacidad(DATOS)).toLowerCase();
      expect(texto).toContain("modelo de tu teléfono");
    });

    it("dice que el enlace circula y que cualquiera puede descargarse las fotos", () => {
      // Es lo que más sorprende a la gente: "los demás invitados" no es una
      // lista cerrada, es quien tenga el enlace. Y una copia descargada ya no
      // la puede retirar nadie.
      const texto = textoDe(avisoPrivacidad(DATOS)).toLowerCase();
      expect(texto).toContain("descargarse las fotos");
    });
  });
});

describe("Términos y condiciones", () => {
  it("cubre los apartados mínimos de una relación comercial", () => {
    const texto = textoDe(terminosYCondiciones(DATOS)).toLowerCase();
    for (const esperado of [
      "modalidad",
      "obligaciones del cliente",
      "responsabilidad",
      "pagos",
      "ley aplicable",
    ]) {
      expect(texto).toContain(esperado);
    }
  });

  it("mantiene el reparto de papeles: el cliente responsable, el proveedor encargado", () => {
    const texto = textoDe(terminosYCondiciones(DATOS));
    expect(texto).toContain("El cliente es el responsable de los datos personales de sus invitados");
    expect(texto).toContain(`${DATOS.proveedor} actúa como encargado`);
  });

  it("avisa al cliente de que debe guardar su propia copia", () => {
    expect(textoDe(terminosYCondiciones(DATOS)).toLowerCase()).toContain("su propia copia");
  });
});

describe("Consentimiento de imagen", () => {
  it("explica el derecho a oponerse y cómo ejercerlo", () => {
    const texto = textoDe(consentimientoImagen(DATOS)).toLowerCase();
    expect(texto).toContain("oponerte");
    expect(texto).toContain("retire");
    expect(textoDe(consentimientoImagen(DATOS))).toContain(DATOS.contacto);
  });

  it("distingue el uso del evento del uso publicitario, que exige permiso aparte", () => {
    const texto = textoDe(consentimientoImagen(DATOS)).toLowerCase();
    expect(texto).toContain("no se usan con fines publicitarios");
    expect(texto).toContain("autorización expresa y por separado");
  });

  it("no promete un botón de retirar que el invitado no tiene", () => {
    // Quitar contenido exige la llave de anfitrión (corte de la 0009), así que
    // la petición se hace a los organizadores. Decir solo "la retiraremos", sin
    // más, dejaba a la gente buscando un botón que no existe.
    const texto = textoDe(consentimientoImagen(DATOS)).toLowerCase();
    expect(texto).toContain("no hay un botón");
    // Y una copia ya descargada no la retira nadie: hay que decirlo.
    expect(texto).toContain("no lo puede deshacer nadie");
  });

  it("advierte del caso de los menores de edad", () => {
    expect(textoDe(consentimientoImagen(DATOS)).toLowerCase()).toContain("menores de edad");
  });
});

describe("Ayudantes", () => {
  it("devuelve los tres documentos por su clave", () => {
    for (const clave of DOCUMENTOS) {
      const doc = documento(clave, DATOS);
      expect(doc).not.toBeNull();
      expect(doc?.clave).toBe(clave);
      expect(doc?.titulo.length).toBeGreaterThan(0);
      expect(doc?.secciones.length).toBeGreaterThan(0);
    }
  });

  it("devuelve null para una clave desconocida", () => {
    expect(documento("inventada", DATOS)).toBeNull();
  });

  it("todosLosDocumentos devuelve exactamente los de DOCUMENTOS", () => {
    expect(todosLosDocumentos(DATOS).map((d) => d.clave)).toEqual([...DOCUMENTOS]);
  });

  it("ningún documento se queda con un hueco sin rellenar", () => {
    // Si alguien añade texto con una plantilla a medias, se nota aquí.
    for (const doc of todosLosDocumentos(DATOS)) {
      const texto = textoDe(doc);
      expect(texto).not.toMatch(/\{\{|\}\}|\[\[|XXX|TODO|undefined|\[NOMBRE\]/);
      for (const seccion of doc.secciones) {
        expect(seccion.parrafos.length).toBeGreaterThan(0);
        for (const p of seccion.parrafos) expect(p.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
