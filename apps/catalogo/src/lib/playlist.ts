/**
 * PLAYLIST DEL EVENTO — lo que necesita el panel del DJ.
 *
 * Las canciones viven en el "lugar central", en la colección "canciones": la
 * MISMA que escriben el portal del invitado y la app `playlist`. Aquí se leen y
 * se les cambia el estado (ponerla, descartarla, regresarla a la cola); pedir
 * canciones es cosa de los invitados.
 */

/** Colección compartida (la misma que usan el portal y `apps/playlist`). */
export const COLECCION_CANCIONES = "canciones";

export const EstadoCancion = {
  Pendiente: "pendiente",
  Puesta: "puesta",
  Descartada: "descartada",
} as const;
export type EstadoCancion = (typeof EstadoCancion)[keyof typeof EstadoCancion];

/** Una canción pedida. Misma forma en todas las apps. */
export type Cancion = {
  id: string;
  titulo: string;
  artista?: string;
  link?: string;
  pedidaPor?: string;
  votos: number;
  estado: EstadoCancion;
  fecha: number;
};

/** Ordena por votos (de más a menos) y, a igualdad, por más reciente. */
export function porVotos(a: Cancion, b: Cancion): number {
  if (b.votos !== a.votos) return b.votos - a.votos;
  return b.fecha - a.fecha;
}

/** Etiqueta de la plataforma de un enlace pegado por el invitado. */
export function plataformaDeLink(
  link?: string,
): "Spotify" | "YouTube" | "Apple Music" | "Enlace" | null {
  if (!link) return null;
  const l = link.toLowerCase();
  if (l.includes("spotify")) return "Spotify";
  if (l.includes("youtu")) return "YouTube";
  if (l.includes("music.apple") || l.includes("apple.co")) return "Apple Music";
  if (l.startsWith("http")) return "Enlace";
  return null;
}

/**
 * Enlace que se comparte (QR incluido) para que los invitados pidan canciones.
 * Preferimos el PORTAL, donde ya vive la playlist del invitado; si aún no está
 * configurado, la app `playlist` de siempre, que entiende el mismo `?e=`.
 */
export function enlacePedir(codigo: string, basePlaylist: string): string {
  const portal = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  const evento = `?e=${encodeURIComponent(codigo)}`;
  if (portal) return `${portal}/playlist${evento}`;
  return basePlaylist ? `${basePlaylist}/pedir${evento}` : "";
}
