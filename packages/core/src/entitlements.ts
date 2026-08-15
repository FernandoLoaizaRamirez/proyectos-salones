/**
 * @salones/core — Entitlements (qué funciones están habilitadas).
 *
 * El motor comercial delgado: un PLAN es un paquete de FUNCIONES; un salón o un
 * evento puntual pueden tener OVERRIDES que encienden o apagan funciones sueltas.
 *
 * `resolveEntitlements` combina todo y responde "¿qué está habilitado?". Es una
 * función PURA (sin efectos, sin red, sin navegador): corre idéntica en el cliente
 * y en el servidor. El servidor la usa para HACER VALER los límites (que una
 * función apagada no se pueda llamar = no hay fuga de dinero); el cliente, para
 * mostrar u ocultar. La verdad se decide en el servidor.
 */
import { z } from "zod";

/**
 * Clave de una función vendible. Las funciones son DATOS (filas en la tabla
 * `features`), no código; por eso el tipo es un string abierto. Abajo se listan
 * las conocidas hoy, por comodidad y para evitar errores de dedo.
 */
export type FeatureClave = string;

export const FEATURES_CONOCIDAS = {
  Muro: "muro",
  Playlist: "playlist",
  Rsvp: "rsvp",
  Dinamicas: "dinamicas",
  Album: "album",
  /**
   * PAQUETE DE VIDEO — que los invitados puedan subir video, no solo fotos.
   *
   * Se vende aparte por una razón de costo, no de capricho: una foto se comprime
   * a ~250 KB antes de subir, y un video sube tal cual hasta los 25 MB que
   * admite el almacén. **Un solo video pesa como cien fotos.** Todos los eventos
   * comparten el mismo cajón, así que una boda con video puede gastar el
   * almacenamiento de quince bodas de solo fotos.
   *
   * APAGADA POR DEFECTO. Si no consta que este evento la tiene, no la tiene: en
   * una función que cuesta dinero, la duda se resuelve en contra de regalarla.
   */
  Video: "video",
  /** La sincronización en la nube: distingue el plan "gestionado" del local. */
  SyncColectivo: "sync-colectivo",
  /** Tiempo real por websockets (a futuro, premium). */
  Realtime: "realtime",
  /** El acomodo de mesas del organizador, montable en el portal. */
  Mesas: "mesas",
  /** La invitación digital del evento, la que captura el salón en su panel. */
  Invitacion: "invitacion",
  /** El photobooth con marcos, montable en el portal. */
  Photobooth: "photobooth",
  /** El brindis con video recuerdo, montable en el portal. */
  Brindis: "brindis",
} as const;

export const FeatureSchema = z.object({
  clave: z.string(),
  nombre: z.string(),
  descripcion: z.string().optional(),
});
export type Feature = z.infer<typeof FeatureSchema>;

export const PlanSchema = z.object({
  id: z.string(), // "gestionado" | "renta" | "compra"
  nombre: z.string(),
  descripcion: z.string().optional(),
  /** Las funciones que incluye el plan, por clave. */
  funciones: z.array(z.string()).default([]),
});
export type Plan = z.infer<typeof PlanSchema>;

/** Una fila de override: una función encendida/apagada. (tenant o evento). */
export const EntitlementSchema = z.object({
  clave: z.string(),
  habilitado: z.boolean(),
});
export type Entitlement = z.infer<typeof EntitlementSchema>;

/** Overrides como mapa: { "album": false, "realtime": true }. */
export type Overrides = Partial<Record<FeatureClave, boolean>>;

/** Resultado ya resuelto: para cada función, si está habilitada. */
export type Entitlements = Record<FeatureClave, boolean>;

/**
 * Resuelve qué funciones están habilitadas, aplicando en orden de prioridad:
 *   1) las funciones del PLAN (todas encendidas),
 *   2) los OVERRIDES del tenant (cliente) — pueden apagar o encender,
 *   3) los OVERRIDES del evento — mandan sobre todo (el evento gana).
 *
 * Determinista y sin efectos: mismo entrada → misma salida, en cliente y servidor.
 */
export function resolveEntitlements(
  plan: Plan,
  overridesTenant: Overrides = {},
  overridesEvento: Overrides = {},
): Entitlements {
  const resultado: Entitlements = {};

  // 1) Base: las funciones del plan, encendidas.
  for (const clave of plan.funciones) resultado[clave] = true;

  // 2) Overrides del tenant (cliente).
  for (const [clave, habilitado] of Object.entries(overridesTenant)) {
    if (habilitado === undefined) continue;
    resultado[clave] = habilitado;
  }

  // 3) Overrides del evento (tienen la última palabra).
  for (const [clave, habilitado] of Object.entries(overridesEvento)) {
    if (habilitado === undefined) continue;
    resultado[clave] = habilitado;
  }

  return resultado;
}

/** ¿Está habilitada esta función, según el mapa ya resuelto? */
export function tieneFuncion(entitlements: Entitlements, clave: FeatureClave): boolean {
  return entitlements[clave] === true;
}
