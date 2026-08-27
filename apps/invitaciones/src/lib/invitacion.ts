/**
 * LA INVITACIÓN DE MUESTRA (la que se enseña al vender).
 *
 * ⚠️ Esto ya NO es "los datos de la invitación": desde que el salón la captura
 * en su panel, los datos de verdad viven en el evento y se leen con el código
 * (ver `./cargar`). Lo de aquí es solo el ESCAPARATE: lo que se pinta cuando se
 * abre la app sin código, que es como corre la demo del catálogo.
 *
 * Está llena a propósito —con padrinos, mesa de regalos, paleta de colores y
 * foto en cada momento del itinerario— porque su trabajo es enseñar TODO lo que
 * la invitación puede hacer. Una boda de verdad casi nunca llena tanto.
 *
 * El molde (qué campos hay y qué pasa si falta uno) vive en @salones/core, para
 * que el panel que los edita y esta app que los pinta no puedan discrepar.
 */
import { normalizarInvitacion, type Invitacion } from "@salones/core";

export const INVITACION_DEMO: Invitacion = normalizarInvitacion({
  tipo: "boda",
  novia: "Ana",
  novio: "Rodrigo",

  frase:
    "Con la bendición de Dios y de nuestros padres, queremos compartir contigo el día en que uniremos nuestras vidas para siempre.",
  autorFrase: "Ana & Rodrigo",
  saludo:
    "Nos encantaría celebrar contigo este día. Tu presencia hará que el recuerdo sea aún más nuestro.",
  conteoNota: "para una noche entre flores y luces",

  fechaISO: "2027-03-20T18:00",
  ciudad: "Culiacán, Sinaloa",
  hashtag: "#AnaYRodrigo",
  color: "#B33A6A",
  fotoPortada: "/img/u16.jpg",
  fotoCierre: "/img/u10.jpg",

  padres: {
    titulo: "Con la bendición de",
    novia: ["Sra. Laura Medina", "Sr. Jorge Herrera"],
    novio: ["Sra. Patricia Ruiz", "Sr. Manuel Salazar"],
  },

  padrinos: [
    { rol: "Padrinos de velación", nombres: "Alejandro Robles y Lucía Márquez" },
    { rol: "Padrinos de anillos", nombres: "Emiliano y Renata Villanueva" },
  ],

  ceremonia: {
    titulo: "Ceremonia religiosa",
    hora: "6:00 p.m.",
    lugar: "Capilla Santa Renata",
    direccion: "Km 8 Carretera a Navolato, Culiacán, Sinaloa",
    mapa: "https://www.google.com/maps/search/?api=1&query=Hacienda+Santa+Renata+Culiacan",
    foto: "/img/u12.jpg",
  },
  recepcion: {
    titulo: "Recepción",
    hora: "8:00 p.m.",
    lugar: "Jardín de los Encinos · Hacienda Santa Renata",
    direccion: "Km 8 Carretera a Navolato, Culiacán, Sinaloa",
    mapa: "https://www.google.com/maps/search/?api=1&query=Hacienda+Santa+Renata+Culiacan",
    foto: "/img/u17.jpg",
  },

  vestimenta: "Etiqueta rigurosa",
  vestimentaNota: "Se sugiere reservar el color blanco para la novia.",
  vestimentaColores: ["#B33A6A", "#7C8B6F", "#E8D8C3", "#3A2B31"],

  faq: [
    {
      pregunta: "¿A qué hora debo llegar?",
      respuesta:
        "La ceremonia empieza a las 6:00 p.m. en punto. Te sugerimos llegar media hora antes para encontrar tu lugar con calma.",
    },
    {
      pregunta: "¿Hay estacionamiento?",
      respuesta:
        "Sí: la hacienda cuenta con estacionamiento para invitados, sin costo. Sigue las señales al llegar.",
    },
    {
      pregunta: "¿Puedo llevar niños?",
      respuesta: "Esta celebración está reservada para adultos. Gracias por comprender.",
    },
    {
      pregunta: "¿Qué me pongo?",
      respuesta:
        "Etiqueta rigurosa, y se sugiere reservar el color blanco para la novia. En el código de vestimenta está la paleta sugerida.",
    },
    {
      pregunta: "¿Puedo llevar acompañante?",
      respuesta:
        "Los lugares están contados por invitación. Tu invitación dice cuántos lugares ampara; ante la duda, pregunta a los organizadores.",
    },
    {
      pregunta: "¿Dónde comparto mis fotos de la noche?",
      respuesta:
        "En el álbum del evento, aquí mismo en el portal: lo que tomes esa noche se junta con las fotos de todos los invitados.",
    },
  ],

  itinerario: [
    {
      hora: "6:00 p.m.",
      titulo: "Ceremonia",
      detalle: "Nos damos el sí rodeados de los nuestros.",
      foto: "/img/u12.jpg",
    },
    {
      hora: "7:30 p.m.",
      titulo: "Cóctel de bienvenida",
      detalle: "Bebidas y bocadillos en el jardín.",
      foto: "/img/u17.jpg",
    },
    {
      hora: "8:00 p.m.",
      titulo: "Recepción y cena",
      detalle: "Servicio de tres tiempos en el salón principal.",
      foto: "/img/u05.jpg",
    },
    { hora: "9:30 p.m.", titulo: "Primer baile", detalle: "", foto: "/img/u01.jpg" },
    {
      hora: "10:00 p.m.",
      titulo: "¡Que empiece la fiesta!",
      detalle: "Abrimos la pista hasta que se acabe la noche.",
      foto: "/img/u10.jpg",
    },
  ],

  fotos: ["/img/u12.jpg", "/img/u17.jpg", "/img/u10.jpg", "/img/u05.jpg", "/img/u01.jpg"],

  regalos: {
    texto:
      "Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, agradecemos de corazón un sobre.",
    tiendas: [{ nombre: "Liverpool", url: "https://mesaderegalos.liverpool.com.mx" }],
    banco: "",
    titular: "",
    clabe: "",
  },

  nota: {
    titulo: "Una nota",
    texto:
      "Hemos reservado un lugar especial para ti. Agradecemos que la celebración sea solo para adultos.",
  },

  rsvp: {
    whatsapp: "526673349236",
    fechaLimite: "1 de marzo de 2027",
  },
});
