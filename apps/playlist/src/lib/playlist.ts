/**
 * Datos y utilidades de la PLAYLIST COLABORATIVA.
 *
 * Los invitados piden canciones y votan por las que ya están pedidas. El DJ ve
 * la lista ordenada por votos y marca cada canción como "puesta" o "descartada".
 * Todo se guarda en el dispositivo (localStorage) y se sincroniza en vivo entre
 * pestañas del mismo navegador.
 *
 * SIN SERVIDOR: para juntar las peticiones de muchos teléfonos en una sola lista
 * (la del DJ) hace falta un sistema central (servicio gestionado). En un mismo
 * navegador (por ejemplo, una tablet-kiosco), todo funciona en vivo.
 *
 * TODO editable aquí (white-label): datos del evento y la semilla de ejemplo.
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

/**
 * Evento compartido y colección para el módulo de sincronización
 * (@salones/sync). En la Fase 1/2 hay un solo evento de demostración; el id real
 * del evento vendrá del enlace/QR cuando exista la creación de eventos.
 */
export const EVENTO_ID = "demo";
export const COLECCION_CANCIONES = "canciones";

export const EstadoCancion = {
  Pendiente: "pendiente",
  Puesta: "puesta",
  Descartada: "descartada",
} as const;
export type EstadoCancion = (typeof EstadoCancion)[keyof typeof EstadoCancion];

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

const MIN = 60 * 1000;

/** Semilla de ejemplo (para que la lista no se vea vacía). */
export function cancionesIniciales(): Cancion[] {
  const ahora = Date.now();
  return [
    {
      id: "SG-001",
      titulo: "La Incondicional",
      artista: "Luis Miguel",
      votos: 14,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Tía Lucía",
      fecha: ahora - 40 * MIN,
    },
    {
      id: "SG-002",
      titulo: "Vivir Mi Vida",
      artista: "Marc Anthony",
      votos: 11,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Grupo Alvarado",
      fecha: ahora - 32 * MIN,
    },
    {
      id: "SG-003",
      titulo: "September",
      artista: "Earth, Wind & Fire",
      link: "https://open.spotify.com/track/2grjqo0Frpf2okIBiifQKs",
      votos: 9,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Valentina",
      fecha: ahora - 26 * MIN,
    },
    {
      id: "SG-004",
      titulo: "Propuesta Indecente",
      artista: "Romeo Santos",
      votos: 8,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Carlos y Diana",
      fecha: ahora - 21 * MIN,
    },
    {
      id: "SG-005",
      titulo: "Mi Gente",
      artista: "J Balvin",
      votos: 6,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Diego",
      fecha: ahora - 15 * MIN,
    },
    {
      id: "SG-006",
      titulo: "Bailando",
      artista: "Enrique Iglesias",
      link: "https://www.youtube.com/watch?v=NUsoVlDFqZg",
      votos: 5,
      estado: EstadoCancion.Pendiente,
      pedidaPor: "Regina",
      fecha: ahora - 10 * MIN,
    },
    {
      id: "SG-007",
      titulo: "Perfect",
      artista: "Ed Sheeran",
      votos: 12,
      estado: EstadoCancion.Puesta,
      pedidaPor: "Los novios",
      fecha: ahora - 55 * MIN,
    },
    {
      id: "SG-008",
      titulo: "La Macarena",
      artista: "Los del Río",
      votos: 2,
      estado: EstadoCancion.Descartada,
      pedidaPor: "Tío Marco",
      fecha: ahora - 48 * MIN,
    },
  ];
}

/** Genera un id de canción corto y único. */
export function nuevoId(existentes: Cancion[]): string {
  const usados = new Set(existentes.map((c) => c.id));
  let id = "";
  do {
    id = "SG-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (usados.has(id));
  return id;
}

/** Ordena por votos (de más a menos) y, a igualdad, por más reciente. */
export function porVotos(a: Cancion, b: Cancion): number {
  if (b.votos !== a.votos) return b.votos - a.votos;
  return b.fecha - a.fecha;
}

/** Detecta la plataforma de un enlace pegado, para mostrar la etiqueta correcta. */
export function plataformaDeLink(link?: string): "Spotify" | "YouTube" | "Apple Music" | "Enlace" | null {
  if (!link) return null;
  const l = link.toLowerCase();
  if (l.includes("spotify")) return "Spotify";
  if (l.includes("youtu")) return "YouTube";
  if (l.includes("music.apple") || l.includes("apple.co")) return "Apple Music";
  if (l.startsWith("http")) return "Enlace";
  return null;
}
