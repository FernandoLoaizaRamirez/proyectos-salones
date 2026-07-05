/**
 * Contenido de la INVITACIÓN (datos del evento).
 *
 * TODO editable aquí (white-label): cambiar de una boda a unos XV, los nombres,
 * fecha, lugares, itinerario, fotos y el WhatsApp para confirmar asistencia.
 * El mismo diseño sirve para cualquier evento.
 */

export const invitacion = {
  // "boda" (dos nombres) o "xv" (una festejada).
  tipo: "boda" as "boda" | "xv",
  novia: "Ana",
  novio: "Rodrigo",
  festejada: "Valentina", // se usa si tipo === "xv"

  frase:
    "Con la bendición de Dios y de nuestros padres, queremos compartir contigo el día en que uniremos nuestras vidas para siempre.",

  // Fecha y hora exactas del evento (para la cuenta regresiva).
  fechaISO: "2027-03-20T18:00:00",
  fechaTexto: "Sábado 20 de marzo de 2027",
  ciudad: "Culiacán, Sinaloa",
  hashtag: "#AnaYRodrigo",
  fotoPortada: "/img/u16.jpg",

  padres: {
    titulo: "Con la bendición de nuestros padres",
    novia: ["Sra. Laura Medina", "Sr. Jorge Herrera"],
    novio: ["Sra. Patricia Ruiz", "Sr. Manuel Salazar"],
  },

  ceremonia: {
    titulo: "Ceremonia religiosa",
    hora: "6:00 pm",
    lugar: "Capilla Santa Renata",
    direccion: "Km 8 Carretera a Navolato, Culiacán, Sinaloa",
    mapa: "https://www.google.com/maps/search/?api=1&query=Hacienda+Santa+Renata+Culiacan",
  },
  recepcion: {
    titulo: "Recepción",
    hora: "8:00 pm",
    lugar: "Jardín de los Encinos · Hacienda Santa Renata",
    direccion: "Km 8 Carretera a Navolato, Culiacán, Sinaloa",
    mapa: "https://www.google.com/maps/search/?api=1&query=Hacienda+Santa+Renata+Culiacan",
  },

  vestimenta: "Etiqueta rigurosa",
  vestimentaNota: "Se sugiere reservar el color blanco para la novia.",

  itinerario: [
    { hora: "6:00 pm", titulo: "Ceremonia" },
    { hora: "7:30 pm", titulo: "Cóctel de bienvenida" },
    { hora: "8:00 pm", titulo: "Recepción y cena" },
    { hora: "9:30 pm", titulo: "Primer baile" },
    { hora: "10:00 pm", titulo: "¡Que empiece la fiesta!" },
  ],

  fotos: ["/img/u12.jpg", "/img/u17.jpg", "/img/u10.jpg", "/img/u05.jpg", "/img/u01.jpg"],

  regalos:
    "Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, agradecemos de corazón un sobre.",

  rsvp: {
    // WhatsApp que recibe las confirmaciones (por defecto, el de la demo).
    whatsapp: "526673349236",
    fechaLimite: "1 de marzo de 2027",
  },
};

/** Título del evento según el tipo (boda o XV). */
export function tituloEvento(): string {
  return invitacion.tipo === "xv"
    ? `Mis XV · ${invitacion.festejada}`
    : `${invitacion.novia} & ${invitacion.novio}`;
}
