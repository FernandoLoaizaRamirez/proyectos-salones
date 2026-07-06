/**
 * Datos y diseños de la app de RECUERDITOS digitales.
 *
 * El invitado crea una tarjeta de recuerdo personalizada del evento (diseño,
 * nombre, mensaje y foto) y la descarga o comparte a su teléfono. Editable aquí.
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "20 de marzo de 2027",
  hashtag: "#AnaYRodrigo",
  organizador: { nombre: "Suite para Salones" },
};

export type Tema = {
  id: string;
  nombre: string;
  fondo: string; // clases de fondo (gradiente)
  texto: string; // color de texto principal
  acento: string; // color de acento
  suave: string; // texto secundario
  anillo: string; // color del anillo de la foto
};

export const temas: Tema[] = [
  {
    id: "gala",
    nombre: "Noche de gala",
    fondo: "bg-gradient-to-br from-[#252a37] via-[#171a22] to-[#0d0f14]",
    texto: "text-white",
    acento: "text-amber-300",
    suave: "text-white/55",
    anillo: "ring-amber-300/60",
  },
  {
    id: "atardecer",
    nombre: "Atardecer",
    fondo: "bg-gradient-to-br from-rose-400 via-orange-300 to-amber-200",
    texto: "text-[#3a2418]",
    acento: "text-white",
    suave: "text-[#3a2418]/70",
    anillo: "ring-white/70",
  },
  {
    id: "jardin",
    nombre: "Jardín",
    fondo: "bg-gradient-to-br from-emerald-500 via-teal-400 to-green-300",
    texto: "text-white",
    acento: "text-white",
    suave: "text-white/75",
    anillo: "ring-white/70",
  },
  {
    id: "blush",
    nombre: "Blush",
    fondo: "bg-gradient-to-br from-pink-300 via-fuchsia-300 to-rose-200",
    texto: "text-[#4a2540]",
    acento: "text-white",
    suave: "text-[#4a2540]/70",
    anillo: "ring-white/70",
  },
];

export const mensajesSugeridos = [
  "¡Gracias por acompañarnos!",
  "Un día inolvidable",
  "Felices por siempre",
  "Lo mejor de la fiesta",
];
