"use client";

/**
 * LOS TEXTOS REALES DEL EVENTO (nombre, fecha, hashtag) para una app de cliente.
 *
 * Es la generalización de `apps/photobooth/src/lib/evento-real.ts` — el hook
 * que mató el último silo. Ocho apps tenían la "Boda Ana & Rodrigo" QUEMADA en
 * su lib; con esto todas leen la colección `invitacion` (la misma que captura
 * el salón en su panel) y caen a su muestra si no hay nada.
 *
 * Reglas: las del esqueleto común (`consulta.ts`) — una lectura por código,
 * muestra como respaldo, NUNCA lanza, y el fallo de RED no se cachea (a
 * diferencia del molde original): si la boda no tenía señal al abrir, el
 * siguiente montaje reintenta. "Sin datos capturados" sí se recuerda: leer con
 * éxito una invitación vacía es una respuesta, no un fallo.
 */
import {
  COLECCION_INVITACION,
  fechaPuntos,
  invitacionDe,
  invitacionTieneContenido,
  nombresInvitacion,
} from "@salones/core";
import { obtenerSync } from "@salones/sync";
import { consultaUnica, useConsultaEvento } from "./consulta";

export type TextosEvento = {
  /** "Ana & Rodrigo" — como lo capturó el salón. */
  nombre: string;
  /** Fecha ya formateada para pintar ("20 · marzo · 2027"). */
  fecha: string;
  /** Sin "#": lo pone quien lo pinta. */
  hashtag: string;
  /**
   * A QUIÉN le escribe el invitado (confirmaciones, avisos).
   *
   * ⚠️ POR QUÉ ESTÁ AQUÍ: nueve apps llevaban quemado el WhatsApp del
   * PROVEEDOR como "organizador". En una boda real, el invitado que pulsaba
   * "confirmar" le escribía a quien hizo el software en vez de a los novios.
   * Sale de `rsvp.whatsapp` de la invitación — justo el campo que el salón
   * captura en su panel para eso.
   */
  organizador: { nombre: string; whatsapp: string };
};

/**
 * Un hashtag de respaldo a partir del nombre: "Ana & Rodrigo" → "AnaRodrigo".
 * Sin espacios, sin el "&" y sin acentos, porque va en nombres de archivo y en
 * el texto de compartir, donde un hashtag con espacios se rompe.
 */
export function hashtagDeNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}

type DatosEvento = { textos: TextosEvento; conDatosReales: boolean };

/** Single-flight de este hook (ver consulta.ts). */
const consultas = new Map<string, Promise<DatosEvento | null>>();

async function consultar(codigo: string, respaldo: TextosEvento): Promise<DatosEvento | null> {
  let items;
  try {
    items = await obtenerSync().listar(codigo, COLECCION_INVITACION);
  } catch {
    // Fallo de red/servidor: null = reintentable (no se cachea).
    return null;
  }
  const inv = invitacionDe(codigo, items);
  if (inv && invitacionTieneContenido(inv)) {
    const nombre = nombresInvitacion(inv);
    return {
      textos: {
        nombre,
        fecha: fechaPuntos(inv.fechaISO),
        // Con hashtag capturado se usa ese; si no, se arma del nombre. El
        // "evento" final es para no dejar un hueco si la invitación trae
        // fecha pero todavía no nombres.
        hashtag: inv.hashtag.trim() || hashtagDeNombre(nombre) || "evento",
        // Sin WhatsApp capturado se conserva el del respaldo: mejor el número
        // de la muestra que un enlace que no lleva a nadie.
        organizador: {
          nombre,
          whatsapp:
            inv.rsvp.whatsapp.replace(/[^0-9]/g, "") || respaldo.organizador.whatsapp,
        },
      },
      conDatosReales: true,
    };
  }
  // Lectura CON éxito pero sin invitación capturada: la muestra es la
  // respuesta correcta y sí se cachea (no hay nada que reintentar).
  return { textos: respaldo, conDatosReales: false };
}

/**
 * El evento del que es esta pantalla: su código, sus textos y si son de
 * verdad (capturados por el salón) o los de la muestra de la app.
 */
export function useEventoReal(respaldo: TextosEvento): {
  codigo: string;
  textos: TextosEvento;
  conDatosReales: boolean;
} {
  const { codigo, dato } = useConsultaEvento<DatosEvento>(
    { textos: respaldo, conDatosReales: false },
    consultas,
    (c) => consultar(c, respaldo),
  );
  return { codigo, ...dato };
}
