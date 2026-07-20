/**
 * DINÁMICAS DEL EVENTO — lo que necesita el tablero del anfitrión.
 *
 * De los tres juegos, el único COLECTIVO es la trivia: su ranking vive en el
 * "lugar central", en la colección "ranking" (la misma que escriben el portal
 * del invitado y la app `dinamicas`). El bingo y el rompehielos son personales
 * de cada teléfono, así que aquí no hay nada que mostrar de ellos.
 */

/** Colección compartida (la misma que usan el portal y `apps/dinamicas`). */
export const COLECCION_RANKING = "ranking";

/** Un jugador que ya terminó la trivia. */
export type Jugador = {
  id: string;
  nombre: string;
  aciertos: number;
  total: number;
  fecha: number;
};

/** Ordena: más aciertos primero; a igualdad, quien terminó antes. */
export function porPuntaje(a: Jugador, b: Jugador): number {
  if (b.aciertos !== a.aciertos) return b.aciertos - a.aciertos;
  return a.fecha - b.fecha;
}

/** Promedio de aciertos de la partida (0 si aún no juega nadie). */
export function promedioAciertos(jugadores: Jugador[]): number {
  if (jugadores.length === 0) return 0;
  const suma = jugadores.reduce((s, j) => s + j.aciertos, 0);
  return Math.round((suma / jugadores.length) * 10) / 10;
}

/**
 * Enlace que se comparte (QR incluido) para que los invitados jueguen.
 * Preferimos el PORTAL, donde ya viven las dinámicas del invitado; si aún no
 * está configurado, la app `dinamicas` de siempre, que entiende el mismo `?e=`.
 */
export function enlaceJugar(codigo: string, baseDinamicas: string): string {
  const portal = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  const evento = `?e=${encodeURIComponent(codigo)}`;
  if (portal) return `${portal}/dinamicas${evento}`;
  return baseDinamicas ? `${baseDinamicas}/jugar${evento}` : "";
}
