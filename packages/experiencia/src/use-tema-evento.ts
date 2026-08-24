"use client";

/**
 * EL TEMA Y LAS FUNCIONES DE ESTE EVENTO, para una app de cliente.
 *
 * Es la pieza que hace que una boda real pinte SU color en las apps standalone
 * sin recompilar: pregunta la config pública a `evento-config` (vía
 * `configEventoCruda` de @salones/sync) y la pasa por los motores — el de
 * temas (@salones/ui) y el comercial (@salones/core). Este paquete existe para
 * que ese cableado viva en UN lugar y para que @salones/ui siga sin hacer red:
 * si ui dependiera de sync, cada cambio futuro de sync reconstruiría las 14
 * apps para siempre.
 *
 * UNA SOLA CONSULTA da las dos cosas —tema y funciones contratadas— porque
 * `evento-config` ya devuelve ambas. Las funciones importan aquí para que la
 * navegación compartida no le ofrezca al invitado experiencias que su evento
 * no incluye.
 *
 * Encima del esqueleto común (`useConsultaEvento`), este hook añade su caché
 * en localStorage (10 min, stale-while-revalidate): en visitas repetidas el
 * tema del salón pinta al primer render, sin flash, y se refresca en el fondo.
 * Se guarda la config CRUDA (no lo resuelto): los motores pueden evolucionar y
 * lo cacheado se vuelve a resolver con el código nuevo.
 */
import { configEventoCruda, type ConfigEventoCruda } from "@salones/sync";
import { resolveEntitlements, type Entitlements } from "@salones/core";
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

/** Lo que este hook resuelve de una consulta: cómo se pinta y qué incluye. */
type Resuelto = { tema: TemaResuelto; entitlements: Entitlements };

/**
 * En la vitrina (y sin servidor) mandan el tema de la casa y la suite
 * completa: la demo es lo que se le enseña a los salones, y una vitrina a
 * medias no vende.
 */
const DEMO: Resuelto = { tema: TEMA_DEMO_RESUELTO, entitlements: {} };

/** Config cruda → tema y funciones (LA conversión, usada por caché y por red). */
function resolverDeConfig(config: ConfigEventoCruda): Resuelto {
  // Los campos de frontera (fuentes, esquema, URLs, colores) van CRUDOS al
  // resolver: él es el único dueño del saneo y la coerción.
  const salon: TemaSalon = config.branding ?? { nombre: config.evento.nombre };
  return {
    tema: resolverTema(salon, config.brandingEvento ?? null, {
      origen: "servidor",
      datosEvento: {
        nombre: config.evento.nombre,
        fechaISO: config.evento.fecha ?? undefined,
      },
    }),
    entitlements: resolveEntitlements(
      config.plan,
      config.overridesTenant,
      config.overridesEvento,
    ),
  };
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
const consultas = new Map<string, Promise<Resuelto | null>>();
/** El refresco en fondo va por su propio single-flight (no pisa al principal). */
const refrescos = new Map<string, Promise<Resuelto | null>>();

async function consultarEvento(codigo: string): Promise<Resuelto | null> {
  const res = await configEventoCruda(codigo);
  if (res.estado !== "ok") return null;
  guardarLocal(K_TEMA(codigo), JSON.stringify({ t: Date.now(), config: res.config }));
  return resolverDeConfig(res.config);
}

export type EstadoTemaEvento = {
  codigo: string;
  /** El tema listo para `AppShell`/`TemaScope`; su `origen` dice de dónde salió. */
  tema: TemaResuelto;
  /**
   * Qué funciones tiene contratadas el evento. VACÍO en la vitrina y sin
   * servidor: ahí no hay nada contratado que consultar, y quien pinta debe
   * enseñarlo todo (ver `tema.origen === "demo"`).
   */
  entitlements: Entitlements;
};

/**
 * El tema y las funciones del evento actual (`?e=`), listos para la cáscara.
 * Arranca con el tema de la casa y se completa solo.
 */
export function useTemaEvento(): EstadoTemaEvento {
  const { codigo, dato } = useConsultaEvento<Resuelto>(DEMO, consultas, (c) => {
    // Stale-while-revalidate: lo guardado vale YA; si sigue fresco, ni red.
    const guardado = leerGuardado(c);
    if (guardado && Date.now() - guardado.t < TTL_MS) {
      return Promise.resolve(resolverDeConfig(guardado.config));
    }
    if (guardado) {
      // Caducado: se pinta lo guardado de inmediato (sin flash) y el refresco
      // corre en el fondo — actualiza el almacén para la PRÓXIMA visita.
      void consultaUnica(refrescos, c, () => consultarEvento(c));
      return Promise.resolve(resolverDeConfig(guardado.config));
    }
    return consultarEvento(c);
  });
  return { codigo, tema: dato.tema, entitlements: dato.entitlements };
}
