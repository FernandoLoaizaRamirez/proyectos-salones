/**
 * Datos y utilidades de DINÁMICAS Y JUEGOS.
 *
 * Tres juegos para animar la fiesta, todos configurables aquí:
 *  - Trivia de los novios (preguntas de opción múltiple + ranking en vivo).
 *  - Bingo de boda (cartón de momentos que van ocurriendo en la fiesta).
 *  - Rompehielos "encuentra a alguien que…".
 *
 * Los invitados juegan desde su teléfono. El ranking de la trivia se guarda en
 * el dispositivo y se sincroniza en vivo entre pestañas del mismo navegador;
 * para un ranking común entre muchos teléfonos se usa el servicio gestionado.
 *
 * TODO editable aquí (white-label).
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

/* ------------------------------- Trivia --------------------------- */

export type PreguntaTrivia = {
  id: string;
  pregunta: string;
  opciones: string[];
  correcta: number; // índice de la opción correcta
};

export const triviaPreguntas: PreguntaTrivia[] = [
  {
    id: "T1",
    pregunta: "¿Dónde se conocieron Ana y Rodrigo?",
    opciones: ["En la universidad", "En una boda", "En el trabajo", "En un viaje"],
    correcta: 1,
  },
  {
    id: "T2",
    pregunta: "¿Quién dijo “te amo” primero?",
    opciones: ["Ana", "Rodrigo", "Los dos a la vez", "Nadie lo recuerda"],
    correcta: 1,
  },
  {
    id: "T3",
    pregunta: "¿Cuál es la comida favorita de la pareja?",
    opciones: ["Tacos", "Sushi", "Pizza", "Mariscos"],
    correcta: 3,
  },
  {
    id: "T4",
    pregunta: "¿A dónde fue su primer viaje juntos?",
    opciones: ["La playa", "La montaña", "Otro país", "A casa de la abuela"],
    correcta: 2,
  },
  {
    id: "T5",
    pregunta: "¿Cuántos años llevan juntos?",
    opciones: ["2 años", "5 años", "7 años", "10 años"],
    correcta: 2,
  },
  {
    id: "T6",
    pregunta: "¿Quién es más dormilón?",
    opciones: ["Ana", "Rodrigo", "Los dos", "El perro"],
    correcta: 0,
  },
];

/* -------------------------------- Bingo --------------------------- */

export type CasillaBingo = { id: string; texto: string };

/** 16 momentos (cartón 4×4). */
export const bingoCasillas: CasillaBingo[] = [
  { id: "B1", texto: "Los novios se besan" },
  { id: "B2", texto: "Alguien llora de emoción" },
  { id: "B3", texto: "Primer baile" },
  { id: "B4", texto: "Brindis con champán" },
  { id: "B5", texto: "El ramo por los aires" },
  { id: "B6", texto: "Alguien baila sin parar" },
  { id: "B7", texto: "Foto grupal" },
  { id: "B8", texto: "Cortan el pastel" },
  { id: "B9", texto: "Entrada de los novios" },
  { id: "B10", texto: "Discurso del padrino" },
  { id: "B11", texto: "Niños corriendo" },
  { id: "B12", texto: "Piden otra canción" },
  { id: "B13", texto: "Selfie con los novios" },
  { id: "B14", texto: "Zapatos fuera para bailar" },
  { id: "B15", texto: "El vals" },
  { id: "B16", texto: "La última canción" },
];

export const BINGO_LADO = 4;

/** Devuelve true si las casillas marcadas forman una línea (fila, columna o diagonal). */
export function hayLineaBingo(marcadas: boolean[], lado = BINGO_LADO): boolean {
  // Filas y columnas
  for (let i = 0; i < lado; i++) {
    let fila = true;
    let col = true;
    for (let j = 0; j < lado; j++) {
      if (!marcadas[i * lado + j]) fila = false;
      if (!marcadas[j * lado + i]) col = false;
    }
    if (fila || col) return true;
  }
  // Diagonales
  let d1 = true;
  let d2 = true;
  for (let i = 0; i < lado; i++) {
    if (!marcadas[i * lado + i]) d1 = false;
    if (!marcadas[i * lado + (lado - 1 - i)]) d2 = false;
  }
  return d1 || d2;
}

/** True si todo el cartón está marcado. */
export function bingoCompleto(marcadas: boolean[]): boolean {
  return marcadas.length > 0 && marcadas.every(Boolean);
}

/* ----------------------------- Rompehielos ------------------------ */

export type RetoRompehielos = { id: string; texto: string };

export const rompehielosRetos: RetoRompehielos[] = [
  { id: "R1", texto: "…haya viajado a otro continente" },
  { id: "R2", texto: "…conozca a los novios desde la infancia" },
  { id: "R3", texto: "…sepa bailar salsa" },
  { id: "R4", texto: "…tenga el mismo signo que tú" },
  { id: "R5", texto: "…hable otro idioma" },
  { id: "R6", texto: "…tenga una mascota" },
  { id: "R7", texto: "…se haya casado en el mismo mes" },
  { id: "R8", texto: "…también ame el pastel" },
];

/* ------------------------------ Ranking --------------------------- */

export type Jugador = {
  id: string;
  nombre: string;
  aciertos: number;
  total: number;
  fecha: number;
};

/** Ordena el ranking: más aciertos primero; a igualdad, quien terminó antes. */
export function porPuntaje(a: Jugador, b: Jugador): number {
  if (b.aciertos !== a.aciertos) return b.aciertos - a.aciertos;
  return a.fecha - b.fecha;
}

/** Ranking de ejemplo, para que el tablero no se vea vacío. */
export function rankingInicial(): Jugador[] {
  const ahora = Date.now();
  const MIN = 60 * 1000;
  return [
    { id: "J1", nombre: "Valentina", aciertos: 6, total: 6, fecha: ahora - 12 * MIN },
    { id: "J2", nombre: "Diego", aciertos: 5, total: 6, fecha: ahora - 9 * MIN },
    { id: "J3", nombre: "Tía Lucía", aciertos: 5, total: 6, fecha: ahora - 7 * MIN },
    { id: "J4", nombre: "Carlos", aciertos: 4, total: 6, fecha: ahora - 4 * MIN },
    { id: "J5", nombre: "Regina", aciertos: 3, total: 6, fecha: ahora - 2 * MIN },
  ];
}

export function nuevoId(prefijo = "J"): string {
  return prefijo + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}
