/**
 * CONTRATO DE MÓDULOS del portal del evento.
 *
 * Los DATOS de los módulos (claves, nombres, orden de la historia, URLs de las
 * apps puente) viven en `@salones/directorio` — LA lista única que también
 * consumen el catálogo y el script de comprobación. Aquí solo se les da CARA:
 * el directorio nombra los iconos como texto (para que un script de node no
 * arrastre React) y este módulo los convierte en componentes de lucide.
 *
 * Estrategia strangler-fig (la de siempre): los módulos con `rutaInterna` ya
 * viven DENTRO del portal; los demás son un PUENTE a la app que los sirve hoy
 * (con `?e=`). El orden de la lista es el de la HISTORIA del invitado.
 */
import type { ComponentType } from "react";
import {
  Aperture,
  Armchair,
  BookHeart,
  CalendarCheck,
  CalendarClock,
  Camera,
  CircleHelp,
  Gamepad2,
  ListMusic,
  Mail,
  MapPin,
  PartyPopper,
  QrCode,
  Shirt,
  Wine,
} from "lucide-react";
import {
  GRUPOS,
  MODULOS as DIRECTORIO,
  baseDeModulo,
  grupoDeModulo,
  type GrupoClave,
  type ModuloDirectorio,
} from "@salones/directorio";

export { GRUPOS };
export type { GrupoClave };

export type ModuloManifest = {
  /** Clave de la función vendible (debe existir en `features` / entitlements). */
  clave: string;
  /** Nombre de cara al invitado. */
  nombre: string;
  /** Descripción corta para la tarjeta del portal. */
  descripcion: string;
  /** Icono (lucide), resuelto desde el nombre que trae el directorio. */
  icono: ComponentType<{ className?: string }>;
  /** Base de la app que sirve hoy este módulo (puente). */
  urlBase: string;
  /** Ruta del invitado dentro de esa app. */
  rutaInvitado: string;
  /**
   * Si el módulo YA vive dentro del portal, su ruta interna (p. ej. "/muro").
   * Cuando existe, manda sobre el puente: el invitado se queda en el portal.
   */
  rutaInterna?: string;
  /** La sección de la experiencia (clave del directorio). */
  grupo: GrupoClave;
  /** El nombre de la sección, de cara al invitado ("Mi asistencia"…). */
  grupoNombre: string;
};

/** Nombre del directorio → componente de lucide. */
const ICONOS: Record<string, ComponentType<{ className?: string }>> = {
  Mail,
  CalendarCheck,
  QrCode,
  Armchair,
  Camera,
  BookHeart,
  ListMusic,
  Gamepad2,
  Aperture,
  Wine,
  CalendarClock,
  MapPin,
  Shirt,
  CircleHelp,
};

function aManifest(m: ModuloDirectorio): ModuloManifest {
  return {
    clave: m.clave,
    nombre: m.nombre,
    descripcion: m.descripcion,
    // Un icono que el directorio nombre y aquí no exista no debe tirar el
    // portal: se pinta uno festivo y ya (el nombre y la clave siguen bien).
    icono: ICONOS[m.icono] ?? PartyPopper,
    urlBase: baseDeModulo(m),
    rutaInvitado: m.rutaInvitado,
    rutaInterna: m.rutaInterna,
    grupo: m.grupo,
    grupoNombre: grupoDeModulo(m).nombre,
  };
}

/** Los módulos del invitado, con la MISMA clave que sus funciones vendibles. */
export const MODULOS: ModuloManifest[] = DIRECTORIO.map(aManifest);

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
