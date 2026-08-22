/**
 * Contenido del sitio (datos del salón).
 *
 * TODO está centralizado aquí para que cambiar de un salón ficticio a uno real
 * sea solo editar este archivo: nombre, textos, espacios, paquetes, precios,
 * testimonios y datos de contacto. Así el mismo sitio sirve para cualquier
 * cliente (white-label).
 */

export const salon = {
  nombre: "Hacienda Santa Renata",
  lema: "Donde lo irrepetible sucede",
  descripcion:
    "Un recinto de gala rodeado de jardines centenarios, pensado para celebrar bodas, XV años y grandes eventos con el detalle y la elegancia que un día así merece.",
  ciudad: "Culiacán, Sinaloa",
  direccion: "Km 8 Carretera a Navolato, Culiacán, Sinaloa",
  telefono: "667 334 9236",
  whatsapp: "526673349236",
  email: "eventos@haciendasantarenata.mx",
  horario: "Citas con previa reservación · Lun a Sáb, 10:00 – 19:00",
  instagram: "haciendasantarenata",
  fundacion: 2009,
};

export type Espacio = {
  nombre: string;
  descripcion: string;
  capacidad: string;
  etiqueta: string;
  foto: string;
};

/*
 * LAS FOTOS DE ESTA LISTA TIENEN QUE ENSEÑAR EL ESPACIO, no un momento bonito.
 *
 * Hasta el 21 ago 2026 tres de las cuatro no lo hacían: la Capilla era una
 * pareja junto a una palmera (no salía ninguna capilla), el Salón Imperial
 * —que el texto promete "con doble altura y candelabros"— era un primer plano
 * de una mesa con copas, y la Terraza era una pareja a contraluz. Un cliente
 * que lee "Cuatro escenarios" y no ve ni un escenario deja de creerse la
 * página. Se cambiaron por fotos donde SÍ se ve el sitio, con nombre de
 * archivo que dice cuál es (`espacio-*.jpg`) para que no se vuelvan a mezclar
 * con las de la galería, que ahí sí van los momentos.
 *
 * El 22 ago 2026 cayeron las dos que faltaban y la terraza mejoró: el Jardín
 * era un kiosco a pleno mediodía cuando el texto promete atardecer y estrellas
 * (ahora: mesa larga bajo los árboles con series de foquitos y luz dorada), la
 * Terraza era un patiecito residencial donde no caben 120 personas (ahora: cena
 * a la luz de velas con servilletas color vino, los colores de la casa), y la
 * portada era un salón de hotel ajeno con alfombra azul y luces moradas (ahora:
 * ceremonia real en una hacienda de piedra mexicana, `portada.jpg`).
 *
 * Todas son de Pexels (licencia gratuita, uso comercial, sin atribución
 * obligatoria). Cuando Fernando tenga fotos del salón real, se sustituyen
 * respetando el mismo criterio: se ve el espacio.
 */
export const espacios: Espacio[] = [
  {
    nombre: "Jardín de los Encinos",
    etiqueta: "Al aire libre",
    descripcion:
      "Un jardín arbolado con iluminación de temporada, ideal para ceremonias al atardecer y recepciones bajo las estrellas.",
    capacidad: "Hasta 400 invitados",
    foto: "/img/espacio-jardin.jpg",
  },
  {
    nombre: "Salón Imperial",
    etiqueta: "Gran salón",
    descripcion:
      "Nuestro salón principal con doble altura, candelabros y climatización, para veladas de gala en cualquier época del año.",
    capacidad: "Hasta 350 invitados",
    foto: "/img/espacio-salon.jpg",
  },
  {
    nombre: "Terraza del Atardecer",
    etiqueta: "Íntimo",
    descripcion:
      "Una terraza empedrada con vista al jardín, perfecta para cocteles de bienvenida y celebraciones más íntimas.",
    capacidad: "Hasta 120 invitados",
    foto: "/img/espacio-terraza.jpg",
  },
  {
    nombre: "Capilla Santa Renata",
    etiqueta: "Ceremonia",
    descripcion:
      "Capilla propia dentro del recinto para vivir la ceremonia y la fiesta en un mismo lugar, sin traslados.",
    capacidad: "Hasta 200 invitados",
    foto: "/img/espacio-capilla.jpg",
  },
];

export type TipoEvento = {
  clave: "boda" | "xv" | "corporativo" | "social";
  titulo: string;
  descripcion: string;
};

export const tiposEvento: TipoEvento[] = [
  {
    clave: "boda",
    titulo: "Bodas",
    descripcion:
      "De la ceremonia al último baile: un día de principio a fin, coordinado al detalle.",
  },
  {
    clave: "xv",
    titulo: "XV años",
    descripcion:
      "El vals, el cambio de zapatilla y la gran entrada: una noche inolvidable para la festejada.",
  },
  {
    clave: "corporativo",
    titulo: "Corporativos",
    descripcion:
      "Cenas de gala, aniversarios de empresa y conferencias con producción impecable.",
  },
  {
    clave: "social",
    titulo: "Eventos sociales",
    descripcion:
      "Bautizos, aniversarios y cumpleaños celebrados con el mismo nivel de cuidado.",
  },
];

export type FotoGaleria = { foto: string; caption: string };

export const galeria: FotoGaleria[] = [
  { foto: "/img/u10.jpg", caption: "Detalles de mesa" },
  { foto: "/img/u12.jpg", caption: "Ramo de novia" },
  { foto: "/img/u17.jpg", caption: "Los anillos" },
  { foto: "/img/u05.jpg", caption: "Mesa de postres" },
  { foto: "/img/u18.jpg", caption: "Banquete gourmet" },
  { foto: "/img/u04.jpg", caption: "Música en vivo" },
];

/** Foto de portada (hero). */
export const heroFoto = "/img/portada.jpg";

export type Estadistica = { valor: string; etiqueta: string };

export const estadisticas: Estadistica[] = [
  { valor: "15+", etiqueta: "años de trayectoria" },
  { valor: "900+", etiqueta: "eventos celebrados" },
  { valor: "4", etiqueta: "espacios únicos" },
  { valor: "400", etiqueta: "invitados de capacidad" },
];

export type Paquete = {
  nombre: string;
  precioDesde: string;
  resumen: string;
  incluye: string[];
  destacado?: boolean;
};

export const paquetes: Paquete[] = [
  {
    nombre: "Esencial",
    precioDesde: "$65,000",
    resumen: "El espacio y lo indispensable para una celebración redonda.",
    incluye: [
      "Un espacio a elegir (jardín o salón)",
      "6 horas de evento",
      "Mobiliario y mantelería base",
      "Estacionamiento para invitados",
      "Coordinación básica del día",
    ],
  },
  {
    nombre: "Distinción",
    precioDesde: "$110,000",
    resumen: "Nuestra opción más solicitada, con producción y detalles premium.",
    destacado: true,
    incluye: [
      "Salón + jardín en exclusiva",
      "8 horas de evento",
      "Mobiliario premium e iluminación arquitectónica",
      "Coordinador de evento dedicado",
      "Menú de degustación previo",
      "Suite para la festejada / los novios",
    ],
  },
  {
    nombre: "Gran Gala",
    precioDesde: "$180,000",
    resumen: "Exclusividad total del recinto para una velada de otro nivel.",
    incluye: [
      "Recinto completo en exclusiva",
      "10 horas de evento",
      "Banquete gourmet y servicio de valet",
      "Diseño floral y ambientación a medida",
      "Coordinación integral y ensayo previo",
      "Cabina de fotos y álbum digital del evento",
    ],
  },
];

export type Testimonio = { cita: string; autor: string; evento: string };

export const testimonios: Testimonio[] = [
  {
    cita:
      "Todo fue como lo soñamos. El jardín al atardecer nos dejó sin palabras y el equipo cuidó cada detalle.",
    autor: "Ana y Rodrigo",
    evento: "Boda · Jardín de los Encinos",
  },
  {
    cita:
      "Mis XV fueron mágicos. La entrada al Salón Imperial con la iluminación fue el momento de la noche.",
    autor: "Valentina M.",
    evento: "XV años · Salón Imperial",
  },
  {
    cita:
      "Organizamos nuestra cena de aniversario de empresa y quedó impecable. Volveremos sin duda.",
    autor: "Grupo Alvarado",
    evento: "Evento corporativo · Terraza",
  },
];

/**
 * LA PUERTA DEL INVITADO — los textos del bloque que lleva al portal del evento.
 *
 * Vive aquí, con el resto del contenido, porque es lo primero que un salón real
 * va a querer cambiar: el tono con el que le habla a sus invitados es parte de
 * su marca. Cambiar de cliente sigue siendo editar UN archivo.
 */
export const puertaInvitado = {
  eyebrow: "Para invitados",
  titulo: "¿Vienes a un evento?",
  texto:
    "Si te invitaron a una celebración en el recinto, aquí está todo lo tuyo: en qué mesa te toca, las fotos de la noche, la música que suena y el mensaje que quieras dejar. Escribe el código de tu invitación.",
  /*
   * NO poner aquí un código de ejemplo con pinta de real. Decía
   * "Ej. boda-ana-rodrigo" y ese evento NO existe: quien lo escribía tal cual
   * —que es lo natural al probar algo— se topaba con "No encontramos este
   * evento" en plena demostración.
   */
  ejemplo: "El código de tu invitación",
};
