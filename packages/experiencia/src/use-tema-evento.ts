"use client";

/**
 * EL TEMA DE ESTE EVENTO, para una app de cliente (muro, playlist, photobooth…).
 *
 * Es la pieza que hace que una boda real pinte SU color en las apps standalone
 * sin recompilar: pregunta la config pública a `evento-config` (vía
 * `configEventoCruda` de @salones/sync) y la fusiona con los motores de
 * @salones/ui. Este paquete existe para que ese cableado viva en UN lugar —y
 * para que @salones/ui siga sin hacer red: si ui dependiera de sync, cada
 * cambio futuro de sync reconstruiría las 14 apps para siempre.
 *
 * Encima del esqueleto común (`useConsultaEvento`), este hook añade su caché
 * en localStorage (10 min, stale-while-revalidate): en visitas repetidas el
 * tema del salón pinta al primer render, sin flash, y se refresca en el fondo.
 * Se guarda la config CRUDA (no el tema resuelto): el resolver puede
 * evolucionar y lo cacheado se re-resuelve con el código nuevo.
 *
 * Para saber si el tema es del servidor o el de la casa, lee `tema.origen`
 * ("servidor" | "demo") — no hay una segunda bandera que se pueda desalinear.
 */
import {
  configEventoCruda,
  esVitrina,
  eventoActual,
  type ConfigEventoCruda,
} from "@salones/sync";
import {
  TEMA_DEMO_RESUELTO,
  guardarLocal,
  leerLocal,
  resolverTema,
  type TemaResuelto,
  type TemaSalon,
} from "@salones/ui";
import { consultaUnica, useConsultaEvento } from "./consulta";

const TTL_MS = 10 * 60 * 1000; // 10 min: el tema de una boda no cambia a media fiesta.
const K_TEMA = (codigo: string) => `salones:tema:${codigo}`;

/** Config cruda → tema resuelto (LA conversión, usada por caché y por red). */
function temaDeConfig(config: ConfigEventoCruda): TemaResuelto {
  // Los campos de frontera (fuentes, esquema, URLs, colores) van CRUDOS al
  // resolver: él es el único dueño del saneo y la coerción.
  const salon: TemaSalon = config.branding ?? { nombre: config.evento.nombre };
  return resolverTema(salon, config.brandingEvento ?? null, {
    origen: "servidor",
    datosEvento: {
      nombre: config.evento.nombre,
      fechaISO: config.evento.fecha ?? undefined,
    },
  });
}

/** La caché de localStorage (vía el almacén seguro de ui: jamás tumba nada). */
type Guardado = { t: number; config: ConfigEventoCruda };

function leerGuardado(codigo: string): Guardado | null {
  const crudo = leerLocal(K_TEMA(codigo));
  if (!crudo) return null;
  try {
    const dato = JSON.parse(crudo) as Guardado;
    if (typeof dato?.t !== "number" || typeof dato.config?.evento?.codigo !== "string") {
      return null;
    }
    return dato;
  } catch {
    return null;
  }
}

/** Single-flight de este hook (una promesa por código, ver consulta.ts). */
const consultas = new Map<string, Promise<TemaResuelto | null>>();
/** El refresco en fondo va por su propio single-flight (no pisa al principal). */
const refrescos = new Map<string, Promise<TemaResuelto | null>>();

async function consultarTema(codigo: string): Promise<TemaResuelto | null> {
  const res = await configEventoCruda(codigo);
  if (res.estado !== "ok") return null;
  guardarLocal(K_TEMA(codigo), JSON.stringify({ t: Date.now(), config: res.config }));
  return temaDeConfig(res.config);
}

export type EstadoTemaEvento = {
  codigo: string;
  /** El tema listo para `AppShell`/`TemaScope`; su `origen` dice de dónde salió. */
  tema: TemaResuelto;
};

/**
 * El tema del evento actual (`?e=`), listo para `AppShell`/`TemaScope`.
 * Arranca con el tema de la casa y se completa solo.
 */
export function useTemaEvento(): EstadoTemaEvento {
  const { codigo, dato } = useConsultaEvento<TemaResuelto>(TEMA_DEMO_RESUELTO, consultas, (c) => {
    // Stale-while-revalidate: lo guardado vale YA; si sigue fresco, ni red.
    const guardado = leerGuardado(c);
    if (guardado && Date.now() - guardado.t < TTL_MS) {
      return Promise.resolve(temaDeConfig(guardado.config));
    }
    if (guardado) {
      // Caducado: se pinta lo guardado de inmediato (sin flash) y el refresco
      // corre en el fondo — actualiza el almacén para la PRÓXIMA visita.
      void consultaUnica(refrescos, c, () => consultarTema(c));
      return Promise.resolve(temaDeConfig(guardado.config));
    }
    return consultarTema(c);
  });
  return { codigo, tema: dato };
}
