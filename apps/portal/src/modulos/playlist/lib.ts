/**
 * MÓDULO PLAYLIST (dentro del portal) — datos y utilidades.
 *
 * Segundo módulo migrado al portal. Habla con el "lugar central" por
 * `@salones/sync` usando la MISMA colección que la app `playlist` original
 * ("canciones"), así ambos ven la misma lista del evento durante la migración
 * (strangler-fig: el portal ya sirve la experiencia y la app vieja sigue viva).
 *
 * Nota: copia acotada de las utilidades de `apps/playlist` (solo lo del
 * invitado; el panel del DJ sigue en su app). Cuando el portal absorba también
 * al DJ, el módulo se puede extraer a `@salones/module-playlist`.
 */

/** Colección compartida en el lugar central (la misma que usa `apps/playlist`). */
export const COLECCION_CANCIONES = "canciones";

export const EstadoCancion = {
  Pendiente: "pendiente",
  Puesta: "puesta",
  Descartada: "descartada",
} as const;
export type EstadoCancion = (typeof EstadoCancion)[keyof typeof EstadoCancion];

/** Una canción pedida. Misma forma que en la app `playlist`. */
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

/** Genera un id corto para una canción nueva. */
export function nuevoIdCancion(): string {
  return "SG-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/** Ordena por votos (de más a menos) y, a igualdad, por más reciente. */
export function porVotos(a: Cancion, b: Cancion): number {
  if (b.votos !== a.votos) return b.votos - a.votos;
  return b.fecha - a.fecha;
}

/** Etiqueta de la plataforma de un enlace pegado. */
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
 * Clave de los votos de ESTE dispositivo, POR EVENTO: son personales de cada
 * teléfono (evitan votar dos veces) y no deben mezclarse entre eventos.
 */
export function claveVotos(evento: string): string {
  return `portal:playlist:mis-votos:${evento}`;
}

/**
 * Semilla de ejemplo, solo para la demostración local (para que la lista no se
 * vea vacía). Con el servicio gestionado NO se siembra: cada evento real empieza
 * con su propia lista.
 */
export function cancionesDemo(): Cancion[] {
  const ahora = Date.now();
  const MIN = 60 * 1000;
  return [
    {
      id: "SG-D001",
      titulo: "La Incondicional",
      artista: "Luis Miguel",
      votos: 14,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Tía Lucía",
      fecha: ahora - 40 * MIN,
    },
    {
      id: "SG-D002",
      titulo: "Vivir Mi Vida",
      artista: "Marc Anthony",
      votos: 11,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Grupo Alvarado",
      fecha: ahora - 32 * MIN,
    },
    {
      id: "SG-D003",
      titulo: "September",
      artista: "Earth, Wind & Fire",
      link: "https://open.spotify.com/track/2grjqo0Frpf2okIBiifQKs",
      votos: 9,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Valentina",
      fecha: ahora - 26 * MIN,
    },
    {
      id: "SG-D004",
      titulo: "Propuesta Indecente",
      artista: "Romeo Santos",
      votos: 8,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Carlos y Diana",
      fecha: ahora - 21 * MIN,
    },
    {
      id: "SG-D005",
      titulo: "Bailando",
      artista: "Enrique Iglesias",
      link: "https://www.youtube.com/watch?v=NUsoVlDFqZg",
      votos: 5,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Regina",
      fecha: ahora - 10 * MIN,
    },
  ];
}
