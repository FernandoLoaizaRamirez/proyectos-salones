/**
 * MÓDULO DINÁMICAS (dentro del portal) — datos y utilidades.
 *
 * Cuarto módulo migrado al portal. Son tres juegos para animar la fiesta:
 *   • Trivia de los novios — con RANKING compartido (lo único colectivo).
 *   • Bingo de la fiesta   — cartón personal de cada teléfono.
 *   • Rompehielos          — retos personales de cada teléfono.
 *
 * El ranking habla con el "lugar central" por `@salones/sync` usando la MISMA
 * colección que la app `dinamicas` original ("ranking"), así ambos ven el mismo
 * tablero del evento durante la migración (strangler-fig). El tablero del
 * ANFITRIÓN (pantalla grande del salón) sigue en su app hasta migrarlo.
 *
 * Diferencia importante con la app original: allí las preguntas nombran a una
 * pareja de ejemplo ("Ana y Rodrigo"). El portal sirve eventos REALES, así que
 * el contenido por defecto habla de "los novios" en genérico. Que cada anfitrión
 * escriba sus propias preguntas es un incremento posterior (vendrían en la
 * config del evento, igual que el branding).
 */
import {
  buscarEnAcomodo,
  mesaDe,
  normalizarNombre,
  type InvitadoMesa,
  type MesaEvento,
} from "@salones/core";

/** Colección compartida en el lugar central (la misma que usa `apps/dinamicas`). */
export const COLECCION_RANKING = "ranking";

/* ------------------------------- Trivia --------------------------- */

export type PreguntaTrivia = {
  id: string;
  pregunta: string;
  opciones: string[];
  /** Índice de la opción correcta. */
  correcta: number;
};

/** Preguntas por defecto: sirven para cualquier boda mientras no se personalicen. */
export const TRIVIA_PREGUNTAS: PreguntaTrivia[] = [
  {
    id: "T1",
    pregunta: "¿Dónde se conocieron los novios?",
    opciones: ["En la universidad", "En una boda", "En el trabajo", "En un viaje"],
    correcta: 1,
  },
  {
    id: "T2",
    pregunta: "¿Quién dijo “te amo” primero?",
    opciones: ["Ella", "Él", "Los dos a la vez", "Nadie lo recuerda"],
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
    opciones: ["Ella", "Él", "Los dos", "El perro"],
    correcta: 0,
  },
];

/* -------------------------------- Bingo --------------------------- */

export type CasillaBingo = { id: string; texto: string };

export const BINGO_LADO = 4;

/** 16 momentos de la fiesta (cartón 4×4). */
export const BINGO_CASILLAS: CasillaBingo[] = [
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

/** ¿Las casillas marcadas forman una línea (fila, columna o diagonal)? */
export function hayLineaBingo(marcadas: boolean[], lado = BINGO_LADO): boolean {
  for (let i = 0; i < lado; i++) {
    let fila = true;
    let col = true;
    for (let j = 0; j < lado; j++) {
      if (!marcadas[i * lado + j]) fila = false;
      if (!marcadas[j * lado + i]) col = false;
    }
    if (fila || col) return true;
  }
  let d1 = true;
  let d2 = true;
  for (let i = 0; i < lado; i++) {
    if (!marcadas[i * lado + i]) d1 = false;
    if (!marcadas[i * lado + (lado - 1 - i)]) d2 = false;
  }
  return d1 || d2;
}

/** ¿Está todo el cartón marcado? */
export function bingoCompleto(marcadas: boolean[]): boolean {
  return marcadas.length > 0 && marcadas.every(Boolean);
}

/* ----------------------------- Rompehielos ------------------------ */

export type RetoRompehielos = { id: string; texto: string };

export const ROMPEHIELOS_RETOS: RetoRompehielos[] = [
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

/** Genera un id corto para un jugador nuevo. */
export function nuevoIdJugador(): string {
  return "J-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * "TU MESA LLEVA N PUNTOS" — la trivia deja de ser un juego solo del
 * individuo: junta al jugador con su mesa (por nombre, el mismo cruce que ya
 * hace `PaseModulo`) y suma el mejor puntaje de cada compañero de mesa que
 * también haya jugado.
 *
 * Por qué el MEJOR y no la suma de todas sus partidas: cada "Jugar otra vez"
 * agrega una fila nueva al ranking (mismo nombre, otro id) — sumar todo
 * premiaría a quien más veces repitió, no a quien mejor conoce a los novios.
 *
 * `null` cuando el jugador no tiene una mesa que se pueda afirmar sin duda
 * (mismo criterio de `PaseModulo`: sin acomodo contratado, o nombre ambiguo).
 */
export function puntosDeMesa(
  nombreJugador: string,
  ranking: Jugador[],
  mesas: MesaEvento[],
  acomodo: InvitadoMesa[],
): { mesa: string; puntos: number } | null {
  if (!nombreJugador.trim() || mesas.length === 0 || acomodo.length === 0) return null;

  const candidatos = buscarEnAcomodo(nombreJugador, acomodo);
  const exacto = candidatos.find((c) => normalizarNombre(c.nombre) === normalizarNombre(nombreJugador));
  const mio = exacto ?? candidatos[0] ?? null;
  if (!mio?.mesaId) return null;
  const mesa = mesaDe(mio, mesas);
  if (!mesa) return null;

  const nombresDeLaMesa = new Set(
    acomodo.filter((a) => a.mesaId === mio.mesaId).map((a) => normalizarNombre(a.nombre)),
  );
  const mejorPorJugador = new Map<string, number>();
  for (const j of ranking) {
    const clave = normalizarNombre(j.nombre);
    if (!nombresDeLaMesa.has(clave)) continue;
    mejorPorJugador.set(clave, Math.max(mejorPorJugador.get(clave) ?? 0, j.aciertos));
  }
  const puntos = [...mejorPorJugador.values()].reduce((a, b) => a + b, 0);
  return { mesa: mesa.nombre, puntos };
}

/**
 * Ranking de muestra para que el tablero no se vea vacío en las vitrinas. Solo
 * para el evento "demo": en un evento real jamás se siembran jugadores falsos.
 */
export function rankingDemo(): Jugador[] {
  const ahora = Date.now();
  const MIN = 60 * 1000;
  return [
    { id: "J-DEMO1", nombre: "Valentina", aciertos: 6, total: 6, fecha: ahora - 12 * MIN },
    { id: "J-DEMO2", nombre: "Diego", aciertos: 5, total: 6, fecha: ahora - 9 * MIN },
    { id: "J-DEMO3", nombre: "Tía Lucía", aciertos: 5, total: 6, fecha: ahora - 7 * MIN },
    { id: "J-DEMO4", nombre: "Carlos", aciertos: 4, total: 6, fecha: ahora - 4 * MIN },
    { id: "J-DEMO5", nombre: "Regina", aciertos: 3, total: 6, fecha: ahora - 2 * MIN },
  ];
}

/* --------------------- Estado en el dispositivo -------------------- */

/**
 * Claves del progreso que se queda en ESTE teléfono (cartón del bingo y retos
 * del rompehielos). Van POR EVENTO: quien asiste a dos bodas no debe encontrar
 * el cartón de la anterior a medio marcar.
 */
export function claveBingo(evento: string): string {
  return `portal:dinamicas:bingo:${evento}`;
}

export function claveRompehielos(evento: string): string {
  return `portal:dinamicas:rompehielos:${evento}`;
}
