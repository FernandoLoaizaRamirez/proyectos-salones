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
import { FEATURES_CONOCIDAS as F, codificarInvitadoEnlace } from "@salones/core";
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
    // MIGRADA: ya vive dentro del panel.
    rutaInterna: "album",
  },
];

/**
 * LAS APPS QUE SIGUEN FUERA DEL PANEL Y NECESITAN LA LLAVE DE ANFITRIÓN.
 *
 * No están en `PANTALLAS` porque `PANTALLAS` es el catálogo de funciones
 * vendibles (cada una con su `clave` de entitlement) y estas dos todavía no
 * tienen la suya. Pero sí necesitan el enlace `&a=`: son pantallas de
 * ORGANIZADOR —el acomodo que se hace en la tablet y la puerta donde se
 * escanea— y hoy trabajan con pase de INVITADO porque nadie se lo daba.
 *
 * Eso tiene consecuencia directa en la base: mientras sea así, sus cuatro
 * colecciones (`mesas`, `acomodo`, `pases`, `accesos`) tienen que quedarse en
 * la lista blanca de `items_reescribibles` (migración 0016), o el candado
 * frenaría al salón sin frenar a nadie más.
 */
export const APPS_CON_LLAVE = [
  { appId: "mesas", nombre: "Acomodo de mesas" },
  { appId: "pases-qr", nombre: "Pases y puerta (QR)" },
] as const;

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
 * Dirección de la INVITACIÓN de un evento (el enlace que se manda por WhatsApp
 * a cada invitado). Es la app `invitaciones` con el código puesto: la misma
 * app que corre la demo del catálogo, que sin código enseña la de muestra.
 *
 * Ojo: la invitación NO es el portal. El portal reúne lo del día del evento
 * (muro, álbum, playlist…) y se comparte una vez; la invitación se manda antes,
 * se puede vender sola y no da por hecho ningún otro producto.
 */
export function enlaceInvitacion(codigo: string): string {
  const base = baseDeApp("invitaciones");
  return base ? `${base}/?e=${encodeURIComponent(codigo)}` : "";
}

/**
 * El enlace PERSONAL de la invitación: el que se manda a CADA invitado por
 * WhatsApp. A diferencia del general, este lo saluda por su nombre, le deja el
 * RSVP ya precargado y le enseña su mesa. Sus datos van en el fragmento (`#`),
 * que NUNCA viaja al servidor: la identidad se queda en el teléfono del
 * invitado, igual que en el enlace personal del portal.
 */
export function enlaceInvitacionPersonal(
  codigo: string,
  inv: { id: string; nombre: string; cupos: number },
): string {
  const base = baseDeApp("invitaciones");
  return base ? `${base}/?e=${encodeURIComponent(codigo)}#${codificarInvitadoEnlace(inv)}` : "";
}

/**
 * Dirección del PORTAL DEL INVITADO (el enlace que se comparte con la gente).
 * Se configura con `NEXT_PUBLIC_PORTAL_URL`; sin ella devolvemos "" y la interfaz
 * lo dice claro en vez de inventar una dirección equivocada.
 *
 * Puesta en producción el 24 jul 2026: el portal vive en
 * `proyectos-salones-portal.vercel.app` y la variable ya está en el proyecto
 * `suite-salones` de Vercel (Production + Preview).
 */
export function enlacePortal(codigo: string): string {
  const base = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/?e=${encodeURIComponent(codigo)}` : "";
}
