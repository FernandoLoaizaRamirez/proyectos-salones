/**
 * PANTALLAS DEL ANFITRIÓN — el catálogo de lo que el salón usa DURANTE el evento.
 *
 * El invitado ya tiene su portal (app `portal`, Fase 2). Del otro lado están las
 * pantallas del anfitrión: el muro proyectado en el salón, el panel del DJ, el
 * tablero de confirmaciones… Hoy cada una vive en su app suelta; este manifest
 * las reúne para que el operador entre a todas desde un solo lugar, con el código
 * del evento ya puesto.
 *
 * Misma estrategia que funcionó con el portal (strangler-fig): primero el
 * ESQUELETO que las junta y las mide, y después se van migrando una a una hacia
 * dentro. Cuando una pantalla ya viva aquí, gana `rutaInterna` y deja de ser un
 * puente; el resto del panel no cambia.
 */
import type { ComponentType } from "react";
import { BookHeart, CalendarCheck, Camera, Gamepad2, ListMusic } from "lucide-react";
import { FEATURES_CONOCIDAS as F } from "@salones/core";
import { productos } from "@/lib/catalogo";

export type PantallaAnfitrion = {
  /** Clave de la función vendible (la misma de `features` / entitlements). */
  clave: string;
  /** Nombre de cara al operador. */
  nombre: string;
  /** Para qué sirve, en una línea. */
  descripcion: string;
  icono: ComponentType<{ className?: string }>;
  /** Id del producto en el catálogo: de ahí sale la dirección de su app. */
  appId: string;
  /** Ruta de la pantalla del anfitrión dentro de esa app. */
  ruta: string;
  /** Colección del "lugar central" que alimenta su contador. */
  coleccion: string;
  /**
   * Si la pantalla YA vive dentro de este panel, su ruta DENTRO del evento
   * (p. ej. "confirmaciones" → /eventos/<codigo>/confirmaciones). Cuando existe,
   * manda sobre el puente (igual que `rutaInterna` en el portal del invitado).
   */
  rutaInterna?: string;
};

/** Las cinco pantallas del anfitrión, en el orden en que se usan en un evento. */
export const PANTALLAS: PantallaAnfitrion[] = [
  {
    clave: F.Rsvp,
    nombre: "Confirmaciones",
    descripcion: "Quién viene, quién falta y cuántos son.",
    icono: CalendarCheck,
    appId: "rsvp",
    ruta: "/",
    coleccion: "respuestas",
    // MIGRADA: ya vive dentro del panel.
    rutaInterna: "confirmaciones",
  },
  {
    clave: F.Muro,
    nombre: "Muro en pantalla",
    descripcion: "Los mensajes de los invitados, para proyectar en el salón.",
    icono: BookHeart,
    appId: "muro",
    ruta: "/",
    coleccion: "mensajes",
    // MIGRADA: ya vive dentro del panel.
    rutaInterna: "muro",
  },
  {
    clave: F.Playlist,
    nombre: "Panel del DJ",
    descripcion: "La cola de canciones pedidas, ordenada por votos.",
    icono: ListMusic,
    appId: "playlist",
    ruta: "/",
    coleccion: "canciones",
    // MIGRADA: ya vive dentro del panel.
    rutaInterna: "dj",
  },
  {
    clave: F.Dinamicas,
    nombre: "Tablero de juegos",
    descripcion: "El ranking de la trivia, en vivo.",
    icono: Gamepad2,
    appId: "dinamicas",
    ruta: "/",
    coleccion: "ranking",
    // MIGRADA: ya vive dentro del panel.
    rutaInterna: "juegos",
  },
  {
    clave: F.Album,
    nombre: "Álbum del evento",
    descripcion: "Todas las fotos y videos que suben los invitados.",
    icono: Camera,
    appId: "album-fotos",
    ruta: "/",
    coleccion: "fotos",
  },
];

/** Dirección de la app de un producto del catálogo (sin la barra final). */
export function baseDeApp(appId: string): string {
  return (productos.find((p) => p.id === appId)?.demoUrl ?? "").replace(/\/$/, "");
}

/** ¿La pantalla ya vive dentro del panel (no es un puente)? */
export function esInterna(p: PantallaAnfitrion): boolean {
  return Boolean(p.rutaInterna);
}

/**
 * Enlace de una pantalla para un evento. Si ya está migrada, su ruta interna;
 * si no, el puente a su app con el código del evento (`?e=`).
 */
export function enlacePantalla(p: PantallaAnfitrion, codigo: string): string {
  if (p.rutaInterna) {
    return `/eventos/${encodeURIComponent(codigo)}/${p.rutaInterna}`;
  }
  const base = baseDeApp(p.appId);
  return base ? `${base}${p.ruta}?e=${encodeURIComponent(codigo)}` : "";
}

/**
 * Dirección del PORTAL DEL INVITADO (el enlace que se comparte con la gente).
 * Se configura con `NEXT_PUBLIC_PORTAL_URL`; sin ella devolvemos "" y la interfaz
 * lo dice claro en vez de inventar una dirección equivocada.
 */
export function enlacePortal(codigo: string): string {
  const base = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/?e=${encodeURIComponent(codigo)}` : "";
}
