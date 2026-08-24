/**
 * LO QUE TODA PANTALLA DE MÓDULO NECESITA, resuelto una sola vez.
 *
 * Las seis rutas de módulo del portal (rsvp, mesas, álbum, muro, playlist,
 * dinámicas) repetían el MISMO bloque de ~40 líneas: validar el código,
 * resolver la config, la pantalla de "no encontrado", el scope del branding y
 * el candado del entitlement. Aquí vive una vez; allá quedan diez líneas que
 * dicen qué módulo son y nada más.
 *
 * El candado se hace valer EN EL SERVIDOR: si la función no está habilitada
 * para el evento, el módulo ni se renderiza. Esconder la tarjeta en la portada
 * no basta — una función apagada que igual se puede usar sería una fuga.
 */
import type { Metadata } from "next";
import { tieneFuncion } from "@salones/core";
import type { ExperienciaEnlace } from "@salones/ui";
import { MODULOS, enlaceModulo } from "@/lib/modulos";
import { resolverConfigEvento, type ConfigEvento } from "@/lib/config-evento";

/** Mismo formato de código que el resto de la suite. */
const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

export type ContextoModulo = {
  codigo: string;
  config: ConfigEvento;
  /** ¿El evento tiene contratada ESTA experiencia? */
  habilitado: boolean;
  /** Las props de navegación que espera `AppShell`. */
  navegacion: {
    volverHref: string;
    experiencias: ExperienciaEnlace[];
    siguiente?: { nombre: string; href: string };
  };
};

/** El sufijo `?e=` que propaga el evento (vacío en la demo compartida). */
function sufijo(codigo: string): string {
  return codigo && codigo !== "demo" ? `?e=${encodeURIComponent(codigo)}` : "";
}

/**
 * Resuelve el contexto de una pantalla de módulo. Devuelve `null` cuando el
 * evento no existe: quien llama pinta la pantalla de rescate.
 */
export async function contextoModulo(
  searchParams: Promise<{ e?: string }>,
  clave: string,
): Promise<{ tipo: "no-encontrado" } | ({ tipo: "ok" } & ContextoModulo)> {
  const { e } = await searchParams;
  const codigo = e && CODIGO_VALIDO.test(e) ? e : "demo";
  const config = await resolverConfigEvento(codigo);
  if (config.estado === "no-encontrado") return { tipo: "no-encontrado" };

  // El menú "Experiencias" y el "Siguiente" del pie salen de los MISMOS
  // manifests que la portada, ya filtrados por lo que el evento tiene
  // contratado: una función apagada no aparece en ninguna de las tres.
  const disponibles = MODULOS.filter((m) => tieneFuncion(config.entitlements, m.clave));
  const experiencias: ExperienciaEnlace[] = disponibles.map((m) => ({
    nombre: m.nombre,
    href: enlaceModulo(m, codigo),
    actual: m.clave === clave,
  }));

  /*
   * LA SIGUIENTE PARADA. El portal es un menú, pero la fiesta (y la demo que
   * se le enseña a un salón) es un RECORRIDO: al terminar en el muro, lo
   * natural es pasar a la playlist, no volver a un índice. El orden es el de
   * la historia del invitado, que ya define el directorio.
   */
  const actual = disponibles.findIndex((m) => m.clave === clave);
  const proximo = actual >= 0 ? disponibles[actual + 1] : undefined;

  return {
    tipo: "ok",
    codigo,
    config,
    habilitado: tieneFuncion(config.entitlements, clave),
    navegacion: {
      volverHref: `/${sufijo(codigo)}`,
      experiencias,
      siguiente: proximo ? { nombre: proximo.nombre, href: enlaceModulo(proximo, codigo) } : undefined,
    },
  };
}

/**
 * La ficha de una pantalla de módulo: "Muro de mensajes · Boda Ana & Rodrigo".
 *
 * Los invitados comparten enlaces PROFUNDOS ("mira las fotos"), no solo el de
 * la portada. Sin esto, todos esos enlaces se anunciaban igual —"Portal del
 * evento"— y parecían del mismo sitio genérico en vez de de su boda.
 */
export async function metadataModulo(
  searchParams: Promise<{ e?: string }>,
  titulo: string,
): Promise<Metadata> {
  const { e } = await searchParams;
  const codigo = e && CODIGO_VALIDO.test(e) ? e : "demo";
  const config = await resolverConfigEvento(codigo);
  if (config.estado === "no-encontrado") return { title: "Evento no encontrado" };
  const evento = config.tema.evento?.nombre || config.nombre;
  return { title: `${titulo} · ${evento}` };
}
