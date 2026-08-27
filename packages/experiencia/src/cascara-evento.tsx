"use client";

/**
 * LA CÁSCARA, LISTA PARA USAR EN CUALQUIER APP DEL INVITADO.
 *
 * `AppShell` de @salones/ui es presentación pura: recibe el tema y la
 * navegación ya resueltos. Esto es lo que los resuelve — el tema del salón,
 * qué experiencias tiene contratadas el evento y a dónde lleva cada una — para
 * que una app suelta (muro, playlist, photobooth…) se meta dentro de la
 * experiencia con UNA línea:
 *
 *   <CascaraEvento modulo="muro" ancho="3xl">…</CascaraEvento>
 *
 * POR QUÉ IMPORTA: hasta ahora cada app pintaba su propia cabecera copiada a
 * mano, con un cuadrito "SR" quemado y un botón de claro/oscuro. El invitado
 * que saltaba del portal a una de ellas veía cambiar el producto entero y se
 * quedaba sin camino de vuelta. Con esto, todas llevan la misma cinta con la
 * marca del salón, el menú de experiencias y el regreso al evento.
 *
 * LO QUE SE ENSEÑA EN EL MENÚ: solo lo que el evento tiene contratado. En la
 * vitrina y sin servidor no hay nada que consultar, así que se enseña la suite
 * completa — que es justo lo que un salón necesita ver en una demostración.
 */
import * as React from "react";
import { AppShell, type ExperienciaEnlace, type TemaResuelto } from "@salones/ui";
import { tieneFuncion } from "@salones/core";
import { MODULOS, URLS, grupoDeModulo } from "@salones/directorio";
import { useTemaEvento } from "./use-tema-evento";

/** El sufijo `?e=` que propaga el evento (vacío en la demo compartida). */
function sufijo(codigo: string): string {
  return codigo && codigo !== "demo" ? `?e=${encodeURIComponent(codigo)}` : "";
}

/**
 * A dónde lleva una experiencia desde FUERA del portal: siempre al portal, que
 * es quien decide si el módulo abre dentro o hace de puente. Así una app suelta
 * no tiene que saber cuáles están migrados — y si mañana migra otro, los
 * enlaces de todas siguen siendo correctos sin tocarlas.
 */
function enlaceDeExperiencia(clave: string, codigo: string, portalBase: string): string {
  const m = MODULOS.find((x) => x.clave === clave);
  if (!m) return `${portalBase}/${sufijo(codigo)}`;
  if (m.rutaInterna) return `${portalBase}${m.rutaInterna}${sufijo(codigo)}`;
  return `${portalBase}/${sufijo(codigo)}`;
}

export function CascaraEvento({
  modulo,
  ancho = "3xl",
  className,
  children,
}: {
  /** La clave de la experiencia que sirve esta app ("muro", "playlist"…). */
  modulo?: string;
  ancho?: "lg" | "3xl" | "5xl" | "6xl";
  className?: string;
  children: React.ReactNode;
}) {
  const { codigo, tema, entitlements } = useTemaEvento();
  const portalBase = (
    process.env.NEXT_PUBLIC_PORTAL_URL ?? URLS.portal
  ).replace(/\/$/, "");

  /*
   * En la demo se enseña todo; en un evento real, solo lo contratado. Ofrecerle
   * al invitado una experiencia que su evento no incluye lo lleva a una puerta
   * cerrada, y eso lo lee como un producto roto, no como un plan más barato.
   */
  const esDemo = tema.origen === "demo";
  const disponibles = MODULOS.filter((m) => esDemo || tieneFuncion(entitlements, m.clave));

  const experiencias: ExperienciaEnlace[] = disponibles.map((m) => ({
    nombre: m.nombre,
    href: enlaceDeExperiencia(m.clave, codigo, portalBase),
    actual: m.clave === modulo,
    grupo: grupoDeModulo(m).nombre,
  }));

  // La siguiente parada del recorrido, en el orden de la historia del invitado.
  const actual = disponibles.findIndex((m) => m.clave === modulo);
  const proximo = actual >= 0 ? disponibles[actual + 1] : undefined;

  const volver = `${portalBase}/${sufijo(codigo)}`;

  return (
    <AppShell
      tema={tema}
      ancho={ancho}
      className={className}
      volverHref={volver}
      experiencias={experiencias}
      compartirUrl={volver}
      siguiente={
        proximo
          ? { nombre: proximo.nombre, href: enlaceDeExperiencia(proximo.clave, codigo, portalBase) }
          : undefined
      }
    >
      {children}
    </AppShell>
  );
}

/** El tema resuelto, por si una pantalla necesita pintar algo fuera de la cáscara. */
export type { TemaResuelto };
