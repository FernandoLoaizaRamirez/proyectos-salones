/**
 * @salones/legal — los textos legales de la suite, en UN solo lugar.
 *
 * ⚠️  ESTO NO ES ASESORÍA LEGAL. Son BORRADORES de trabajo, escritos para
 *     describir con honestidad lo que el sistema hace de verdad. **Antes de
 *     firmar un cliente real, un abogado tiene que revisarlos.** Ver docs/LEGAL.md.
 *
 * POR QUÉ UN PAQUETE Y NO UNA PÁGINA SUELTA:
 *   El mismo texto tiene que salir idéntico en 14 apps. Teniéndolo aquí, se
 *   revisa una vez, se corrige una vez, y se prueba (hay pruebas que comprueban
 *   que el aviso lleva los apartados que la ley mexicana exige).
 *
 * LA DECISIÓN DE DISEÑO IMPORTANTE — quién responde por los datos:
 *   Bajo la LFPDPPP hay dos figuras. El **responsable** decide para qué se usan
 *   los datos; el **encargado** solo los trata por cuenta del responsable.
 *
 *   En esta suite: el **salón (o los anfitriones) es el RESPONSABLE** —son ellos
 *   quienes convocan a sus invitados y deciden qué se hace con las fotos— y el
 *   proveedor de la suite es el **ENCARGADO**.
 *
 *   Por eso los documentos van PARAMETRIZADOS por salón: si el aviso llevara el
 *   nombre del proveedor, el proveedor estaría asumiendo una responsabilidad
 *   legal que no le toca. Cada salón publica el suyo.
 */

/** Los datos que cada salón rellena para publicar sus documentos. */
export type DatosLegales = {
  /** Nombre del salón o de los anfitriones. Es el RESPONSABLE de los datos. */
  salon: string;
  /** Correo donde se atienden los derechos ARCO. Obligatorio por ley. */
  contacto: string;
  /** Domicilio del responsable. Obligatorio por ley. */
  domicilio: string;
  /** Quién presta el servicio técnico (el ENCARGADO). */
  proveedor: string;
  /** Dirección donde viven los documentos publicados. */
  sitio: string;
  /** Fecha de la última actualización, en formato legible (ej. "20 de julio de 2026"). */
  actualizado: string;
};

export type Seccion = { titulo: string; parrafos: string[] };

export type Documento = {
  clave: string;
  titulo: string;
  resumen: string;
  actualizado: string;
  secciones: Seccion[];
};

/**
 * La marca de "esto todavía hay que rellenarlo".
 *
 * ⚠️ NUNCA debe llegar a los ojos de un invitado. Es una nota para quien
 * mantiene el sistema, y durante un tiempo se publicó tal cual: el aviso de
 * privacidad EN PRODUCCIÓN decía «con domicilio en PENDIENTE» y «puedes
 * escribir a PENDIENTE» (5 veces en esa página, 9 entre los tres documentos).
 * A quien lo leía le decía dos cosas a la vez: que no hay a quién reclamar, y
 * que el producto está a medias.
 */
export const SIN_RELLENAR = "PENDIENTE";

/** ¿Este dato lo tenemos de verdad? */
export function falta(valor: string | undefined): boolean {
  return !valor || valor.trim() === "" || valor === SIN_RELLENAR;
}

/** Aviso que acompaña a todos los documentos mientras no los revise un abogado. */
export const AVISO_BORRADOR =
  "Borrador de trabajo. Describe con honestidad cómo funciona el servicio, " +
  "pero todavía no lo ha revisado un abogado. No lo publiques como definitivo " +
  "sin esa revisión.";

/** Las claves de los tres documentos, para las rutas y los enlaces. */
export const DOCUMENTOS = ["privacidad", "terminos", "imagen"] as const;
export type ClaveDocumento = (typeof DOCUMENTOS)[number];

/* ================================================================== */
/* 1 · Aviso de privacidad                                             */
/* ================================================================== */

/**
 * Aviso de privacidad integral. Los apartados siguen el artículo 16 de la
 * LFPDPPP (identidad y domicilio del responsable, finalidades, medios para
 * limitar el uso, medios para ejercer los derechos ARCO, transferencias, y
 * cómo se comunican los cambios).
 */
export function avisoPrivacidad(d: DatosLegales): Documento {
  return {
    clave: "privacidad",
    titulo: "Aviso de privacidad",
    resumen: `Qué datos recogemos en los eventos de ${d.salon}, para qué los usamos y cómo los puedes borrar.`,
    actualizado: d.actualizado,
    secciones: [
      {
        titulo: "1. Quién es responsable de tus datos",
        parrafos: [
          falta(d.domicilio)
            ? `${d.salon} es el responsable del tratamiento de los datos personales que se recogen durante sus eventos. Su domicilio se añadirá a este aviso en cuanto el salón lo facilite; mientras tanto, puedes pedirlo en la recepción del salón.`
            : `${d.salon}, con domicilio en ${d.domicilio}, es el responsable del tratamiento de los datos personales que se recogen durante sus eventos.`,
          `${d.proveedor} presta el servicio técnico (las aplicaciones y el almacenamiento) en calidad de encargado: trata los datos únicamente por cuenta de ${d.salon} y siguiendo sus instrucciones, y no los usa para fines propios.`,
          falta(d.contacto)
            ? `Para cualquier asunto relacionado con tus datos, habla con el personal de ${d.salon} o con quienes organizan el evento: ellos lo trasladan. ${d.salon} todavía no ha publicado un correo de contacto para este fin.`
            : `Para cualquier asunto relacionado con tus datos puedes escribir a ${d.contacto}.`,
        ],
      },
      {
        titulo: "2. Qué datos recogemos",
        parrafos: [
          "Solo lo que tú entregas voluntariamente al participar en el evento:",
          "• El nombre con el que firmas o confirmas tu asistencia.",
          "• Los mensajes que escribes en el muro de recuerdos.",
          "• Las fotos y videos que decides subir al álbum del evento, y los videos de felicitación que grabas.",
          "• Tu confirmación de asistencia y el número de personas que te acompañan.",
          "• Las canciones que pides y los votos que das.",
          "Hay dos cosas que no tecleas tú y conviene que sepas. Si el salón usa pases con código QR, al entrar queda registrada la hora a la que pasaste por la puerta, junto al nombre que figura en tu pase; y si te asignan mesa, queda anotado en qué mesa te sientas. Esa información la introduce quien organiza, no tú.",
          "Y una más, técnica: si a tu teléfono le falla una subida, se envía un aviso de error que incluye el modelo de tu teléfono y de tu navegador, para poder arreglarlo. No lleva tu nombre ni nada de lo que hayas escrito.",
          "No pedimos ni guardamos datos de contacto (teléfono, correo, dirección) de los invitados, ni datos bancarios, ni datos que la ley considera sensibles. No usamos reconocimiento facial ni ninguna técnica que identifique a las personas de las fotografías de forma automática.",
        ],
      },
      {
        titulo: "3. Para qué los usamos",
        parrafos: [
          "Finalidades necesarias para el servicio:",
          "• Mostrar tu aportación en las pantallas y dispositivos del propio evento.",
          `• Reunir el contenido del evento y entregárselo a ${d.salon} y a los anfitriones.`,
          "• Organizar la lista de asistentes, el acomodo de mesas y la música.",
          "• Controlar el acceso en la puerta, cuando el evento usa pases con código QR: sirve para saber quién ha llegado y evitar que entre quien no está invitado.",
          "No usamos tus datos para publicidad, no los vendemos, y no elaboramos perfiles con ellos.",
        ],
      },
      {
        titulo: "4. Cuánto tiempo los guardamos",
        parrafos: [
          `El contenido de un evento se conserva mientras el evento sigue abierto. No se borra solo al cabo de un tiempo: se borra cuando ${d.salon} cierra el evento, y es ${d.salon} quien decide cuándo. Si te importa que no siga ahí, pídeselo.`,
          `Al cerrar el evento se entrega todo el material a ${d.salon} y a los anfitriones, y se elimina de nuestros sistemas: tanto los archivos como los registros.`,
          "Si pides que se retire una foto o un mensaje concreto durante el evento, deja de verse en el momento en todas las pantallas. El archivo en sí se termina de eliminar cuando se cierra el evento, en el borrado general.",
        ],
      },
      {
        titulo: "5. Con quién se comparten",
        parrafos: [
          `Tu aportación es visible para los demás invitados del mismo evento y para ${d.salon}. Cada evento está aislado: el contenido de un evento no se mezcla ni se muestra en otro.`,
          "Conviene ser claro sobre qué significa «los demás invitados»: cualquiera que tenga el enlace del evento entra, y ese enlace circula por WhatsApp y se reenvía. Quien entra puede además descargarse las fotos y los videos a su propio teléfono. A partir de ahí esas copias ya no están en nuestras manos ni en las del salón.",
          "Para poder prestar el servicio nos apoyamos en estas empresas, que actúan también como encargadas y no usan los datos para fines propios:",
          "• Supabase, que aloja la base de datos y el almacenamiento de archivos. Sus servidores están en Canadá, así que hay una transferencia internacional de datos.",
          "• Vercel, que aloja las aplicaciones.",
          "• Shotstack, que monta el video de recuerdo cuando el evento usa la función de brindis. Para montarlo descarga los videos que grabaron los invitados —con su imagen y su voz— a sus propios servidores, que están fuera de México.",
          "Además, varias pantallas ofrecen un botón para compartir por WhatsApp (una invitación, un pase, un mensaje). Si lo usas, ese contenido pasa por WhatsApp, que es de Meta, y se rige por sus propias condiciones. Es siempre tu decisión pulsarlo.",
          "Fuera de lo anterior, no transferimos tus datos a terceros salvo que la ley nos lo exija.",
        ],
      },
      {
        titulo: "6. Tus derechos (ARCO) y cómo ejercerlos",
        parrafos: [
          "Tienes derecho a Acceder a tus datos, a Rectificarlos si son inexactos, a Cancelarlos cuando consideres que no son necesarios, y a Oponerte a que se usen para un fin concreto. También puedes revocar tu consentimiento en cualquier momento.",
          falta(d.contacto)
            ? `Para ejercerlos, díselo al personal de ${d.salon} indicando tu nombre, de qué evento se trata y qué deseas. Te responderemos en los plazos que marca la ley.`
            : `Para ejercerlos, escribe a ${d.contacto} indicando tu nombre, de qué evento se trata y qué deseas. Te responderemos en los plazos que marca la ley.`,
          "Si quieres que se retire una aportación concreta (un mensaje, una foto, un video), basta con que lo pidas: no necesitas justificar el motivo.",
        ],
      },
      {
        titulo: "7. Cómo limitar el uso de tus datos",
        parrafos: [
          "La forma más directa de limitar el uso de tus datos es no aportar contenido: participar en el álbum, en el muro o en la playlist es siempre voluntario, y quien no participa no aparece.",
          falta(d.contacto)
            ? `Si ya aportaste algo y prefieres que no se muestre, dirígete a los anfitriones del evento o al personal de ${d.salon}: se retira en el momento.`
            : `Si ya aportaste algo y prefieres que no se muestre, pídelo a ${d.contacto} o dirígete directamente a los anfitriones del evento.`,
        ],
      },
      {
        titulo: "8. Seguridad",
        parrafos: [
          "El contenido de cada evento está protegido por un pase firmado que caduca y que solo obtienen quienes tienen el enlace o el código QR del evento. Borrar o moderar contenido requiere una llave distinta, que solo tienen los anfitriones.",
          "Ningún sistema es infalible. Si ocurriera una brecha que afecte de forma significativa a tus datos, te lo comunicaremos.",
        ],
      },
      {
        titulo: "9. Cambios en este aviso",
        parrafos: [
          `Si cambiamos este aviso, publicaremos la versión actualizada en ${d.sitio} indicando la fecha. Te recomendamos consultarlo antes de participar en un evento.`,
          `Última actualización: ${d.actualizado}.`,
        ],
      },
    ],
  };
}

/* ================================================================== */
/* 2 · Términos y condiciones del servicio                             */
/* ================================================================== */

/** Términos de la relación comercial entre el proveedor y el salón. */
export function terminosYCondiciones(d: DatosLegales): Documento {
  return {
    clave: "terminos",
    titulo: "Términos y condiciones",
    resumen: `Las reglas del servicio que ${d.proveedor} presta a ${d.salon}.`,
    actualizado: d.actualizado,
    secciones: [
      {
        titulo: "1. Qué es este servicio",
        parrafos: [
          `${d.proveedor} ofrece un conjunto de aplicaciones para eventos (álbum de fotos, muro de recuerdos, lista de canciones, confirmación de asistencia, acomodo de mesas, pases con código QR y otras).`,
          "Se contratan en tres modalidades: servicio gestionado (mensual, con el proveedor operando y dando soporte), renta mensual (el cliente opera) y compra (pago único).",
        ],
      },
      {
        titulo: "2. Qué incluye cada modalidad",
        parrafos: [
          "En el servicio gestionado, el proveedor monta cada evento, mantiene el sistema y atiende el soporte. El contenido de los invitados se reúne en un almacenamiento central.",
          "En renta y compra, el cliente opera las aplicaciones por su cuenta. En estas modalidades el contenido puede quedar únicamente en el dispositivo de cada persona, según la aplicación.",
          "El alcance concreto, el precio y la vigencia se acuerdan por escrito con cada cliente antes de comenzar.",
        ],
      },
      {
        titulo: "3. Obligaciones del cliente",
        parrafos: [
          "El cliente se compromete a:",
          "• Informar a sus invitados de que el evento cuenta con estas herramientas, y poner a su disposición el aviso de privacidad.",
          "• Usar el servicio conforme a la ley y no destinarlo a fines ilícitos.",
          "• Custodiar la llave de anfitrión de cada evento. Quien la tiene puede borrar y moderar contenido.",
          "• Moderar el contenido de sus eventos. El proveedor no revisa previamente lo que suben los invitados.",
        ],
      },
      {
        titulo: "4. Contenido y propiedad",
        parrafos: [
          "El contenido que suben los invitados (fotos, videos, mensajes) pertenece a quienes lo crearon. El cliente y sus anfitriones pueden usarlo para los fines propios del evento.",
          "El software, el diseño y la marca de las aplicaciones son propiedad del proveedor. Contratar el servicio no transmite esa propiedad, salvo lo que se pacte expresamente en la modalidad de compra.",
        ],
      },
      {
        titulo: "5. Disponibilidad",
        parrafos: [
          "El servicio se apoya en proveedores de infraestructura de terceros (Supabase y Vercel). Se procura la mayor disponibilidad posible, pero no se garantiza un funcionamiento ininterrumpido ni libre de errores.",
          "Cuando sea posible, el mantenimiento programado se avisará con antelación y se evitarán las fechas de eventos confirmados.",
        ],
      },
      {
        titulo: "6. Responsabilidad",
        parrafos: [
          "El proveedor responde por la correcta prestación del servicio contratado. No responde por el contenido que suban los invitados, ni por el uso que el cliente haga del material.",
          "Se recomienda al cliente descargar y conservar su propia copia del contenido de cada evento. El proveedor no puede garantizar la recuperación de material perdido por causas ajenas a su control.",
          "En la medida en que la ley lo permita, la responsabilidad del proveedor se limita al importe pagado por el servicio del evento afectado.",
        ],
      },
      {
        titulo: "7. Pagos y cancelación",
        parrafos: [
          "Los precios, la forma de pago y la periodicidad se acuerdan por escrito antes de comenzar.",
          "En las modalidades mensuales, el cliente puede cancelar avisando con antelación razonable. Al cancelar, se le entrega el contenido de sus eventos antes de dar de baja el servicio.",
        ],
      },
      {
        titulo: "8. Protección de datos",
        parrafos: [
          `El cliente es el responsable de los datos personales de sus invitados; ${d.proveedor} actúa como encargado. Los detalles están en el aviso de privacidad.`,
          "El proveedor tratará los datos únicamente conforme a las instrucciones del cliente, no los usará para fines propios y los eliminará al terminar la relación cuando el cliente lo solicite.",
        ],
      },
      {
        titulo: "9. Ley aplicable",
        parrafos: [
          "Estos términos se rigen por la legislación mexicana. Cualquier controversia se someterá a los tribunales competentes del domicilio del proveedor, salvo que se pacte otra cosa por escrito.",
          falta(d.contacto)
            ? `Última actualización: ${d.actualizado}. Contacto: el personal de ${d.salon}.`
            : `Última actualización: ${d.actualizado}. Contacto: ${d.contacto}.`,
        ],
      },
    ],
  };
}

/* ================================================================== */
/* 3 · Consentimiento de imagen                                        */
/* ================================================================== */

/** Aviso de uso de imagen, pensado para leerse en el propio evento. */
export function consentimientoImagen(d: DatosLegales): Documento {
  return {
    clave: "imagen",
    titulo: "Uso de tu imagen",
    resumen: "Qué pasa con las fotos y los videos en los que apareces.",
    actualizado: d.actualizado,
    secciones: [
      {
        titulo: "1. Por qué te contamos esto",
        parrafos: [
          "En este evento hay herramientas donde los invitados suben fotos y videos. Es muy probable que aparezcas en alguno, aunque no subas nada tú.",
          "Tu imagen es tuya. Por eso queremos que sepas qué se hace con ella y cómo pedir que se retire.",
        ],
      },
      {
        titulo: "2. Para qué se usan las fotos y los videos",
        parrafos: [
          `Únicamente para los fines del propio evento: mostrarlos en las pantallas del evento, reunirlos en un álbum común y entregárselos a ${d.salon} y a los anfitriones como recuerdo.`,
          "No se usan con fines publicitarios ni comerciales, no se venden y no se publican en redes sociales por parte del proveedor.",
          "Si el evento incluye la función de brindis, los videos que graban los invitados se montan en un solo video de recuerdo. Ese montaje lo hace una empresa llamada Shotstack, que para armarlo descarga los videos —con tu imagen y tu voz— a sus servidores, que están fuera de México. Se usan solo para eso.",
        ],
      },
      {
        titulo: "3. Cuando tú subes contenido",
        parrafos: [
          "Al subir una foto o un video declaras que puedes hacerlo: que es tuyo, o que quienes aparecen en él están de acuerdo.",
          "Ten especial cuidado con las fotos en las que aparezcan menores de edad: solo deben subirse con el permiso de quien ejerce la patria potestad.",
        ],
      },
      {
        titulo: "4. Si no quieres aparecer",
        parrafos: [
          "Tienes derecho a oponerte. Puedes pedir que se retire cualquier foto o video en el que aparezcas, sin dar explicaciones.",
          falta(d.contacto)
            ? `Díselo a los anfitriones durante el evento, o al personal de ${d.salon}. La retiraremos.`
            : `Díselo a los anfitriones durante el evento, o escribe a ${d.contacto}. La retiraremos.`,
          "Quien puede retirarla es quien organiza el evento, no cualquiera: es la misma llave que impide que un invitado borre los recuerdos de otro. Por eso la petición se hace a los anfitriones o al salón, y no hay un botón para hacerlo por tu cuenta.",
          "Dos cosas honestas sobre el alcance de ese «se retira». Deja de verse en el momento en todas las pantallas, y el archivo se termina de eliminar cuando se cierra el evento. Pero si alguien ya se descargó esa foto a su teléfono, esa copia ya no está en manos del salón ni en las nuestras: eso no lo puede deshacer nadie.",
        ],
      },
      {
        titulo: "5. Si el salón quiere usar las fotos para promocionarse",
        parrafos: [
          `Usar el material del evento para publicidad, catálogo o redes sociales de ${d.salon} es un fin distinto del propio evento, y requiere tu autorización expresa y por separado.`,
          "Si nadie te la ha pedido y tú no la has firmado, no se puede hacer.",
        ],
      },
    ],
  };
}

/* ================================================================== */
/* Ayudantes                                                           */
/* ================================================================== */

/** Devuelve el documento pedido, o null si la clave no existe. */
export function documento(clave: string, d: DatosLegales): Documento | null {
  switch (clave) {
    case "privacidad":
      return avisoPrivacidad(d);
    case "terminos":
      return terminosYCondiciones(d);
    case "imagen":
      return consentimientoImagen(d);
    default:
      return null;
  }
}

/** Los tres documentos, para índices y menús. */
export function todosLosDocumentos(d: DatosLegales): Documento[] {
  return [avisoPrivacidad(d), terminosYCondiciones(d), consentimientoImagen(d)];
}
