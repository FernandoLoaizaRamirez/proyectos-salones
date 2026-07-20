/**
 * CONTRATO DE MÓDULOS del portal del evento.
 *
 * Cada experiencia del invitado (muro, playlist, RSVP, dinámicas, álbum) se
 * describe con un MANIFEST: su clave de función (la misma de `features`/
 * entitlements), cómo se muestra y a dónde lleva. El portal monta la navegación a
 * partir de estos manifests, filtrando por las funciones habilitadas del evento.
 *
 * Estrategia strangler-fig: por ahora cada módulo es un PUENTE a la app que ya lo
 * sirve hoy (con `?e=<codigo>`). Migrar el código de cada módulo DENTRO del portal
 * (empezando por el muro) es el siguiente incremento; el contrato no cambia.
 */
import type { ComponentType } from "react";
import { BookHeart, ListMusic, CalendarCheck, Gamepad2, Camera } from "lucide-react";
import { FEATURES_CONOCIDAS as F } from "@salones/core";

export type ModuloManifest = {
  /** Clave de la función vendible (debe existir en `features` / entitlements). */
  clave: string;
  /** Nombre de cara al invitado. */
  nombre: string;
  /** Descripción corta para la tarjeta del portal. */
  descripcion: string;
  /** Icono (lucide). */
  icono: ComponentType<{ className?: string }>;
  /** Degradado de acento (clases Tailwind) para el ícono. */
  acento: string;
  /** Base de la app que sirve hoy este módulo (puente). */
  urlBase: string;
  /** Ruta del invitado dentro de esa app. */
  rutaInvitado: string;
  /**
   * Si el módulo YA vive dentro del portal, su ruta interna (p. ej. "/muro").
   * Cuando existe, manda sobre el puente: el invitado se queda en el portal.
   */
  rutaInterna?: string;
};

/** Los módulos del invitado, con la MISMA clave que sus funciones vendibles. */
export const MODULOS: ModuloManifest[] = [
  {
    clave: F.Muro,
    nombre: "Muro de mensajes",
    descripcion: "Deja tu mensaje y tu firma para los novios.",
    icono: BookHeart,
    acento: "from-rose-500 to-fuchsia-600",
    urlBase: "https://proyectos-salones-muro.vercel.app",
    rutaInvitado: "/firmar",
    // MIGRADO: ya vive dentro del portal.
    rutaInterna: "/muro",
  },
  {
    clave: F.Playlist,
    nombre: "Playlist",
    descripcion: "Pide tu canción y vota las favoritas.",
    icono: ListMusic,
    acento: "from-cyan-500 to-blue-600",
    urlBase: "https://proyectos-salones-playlist.vercel.app",
    rutaInvitado: "/pedir",
  },
  {
    clave: F.Rsvp,
    nombre: "Confirmar asistencia",
    descripcion: "Dinos si vienes y cuántos serán.",
    icono: CalendarCheck,
    acento: "from-teal-500 to-emerald-600",
    urlBase: "https://rsvp-umber-pi.vercel.app",
    rutaInvitado: "/",
  },
  {
    clave: F.Dinamicas,
    nombre: "Dinámicas y juegos",
    descripcion: "Trivia, bingo y rompehielos desde tu teléfono.",
    icono: Gamepad2,
    acento: "from-yellow-500 to-orange-600",
    urlBase: "https://proyectos-salones-dinamicas.vercel.app",
    rutaInvitado: "/jugar",
  },
  {
    clave: F.Album,
    nombre: "Álbum de fotos",
    descripcion: "Sube tus fotos y míralas todas juntas.",
    icono: Camera,
    acento: "from-fuchsia-500 to-purple-600",
    urlBase: "https://album-fotos-gamma.vercel.app",
    rutaInvitado: "/",
  },
];

/** ¿El módulo ya está montado dentro del portal (no es un puente)? */
export function esInterno(m: ModuloManifest): boolean {
  return Boolean(m.rutaInterna);
}

/**
 * Enlace del módulo para un evento (propaga el código con `?e=`). Si el módulo ya
 * está migrado al portal, devuelve su ruta INTERNA; si no, el puente a su app.
 */
export function enlaceModulo(m: ModuloManifest, evento: string): string {
  const sufijo = evento && evento !== "demo" ? `?e=${encodeURIComponent(evento)}` : "";
  if (m.rutaInterna) return `${m.rutaInterna}${sufijo}`;
  const ruta = m.rutaInvitado === "/" ? "/" : m.rutaInvitado;
  return `${m.urlBase}${ruta}${sufijo}`;
}
