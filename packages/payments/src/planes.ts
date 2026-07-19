/**
 * @salones/payments — Mapeo PLAN ↔ producto/precio de Stripe.
 *
 * Aquí vive el puente entre el vocabulario comercial de la plataforma (los 3
 * planes: gestionado / renta / compra, definidos en `@salones/core`) y los
 * identificadores de Stripe (producto `prod_...`, precio `price_...`).
 *
 * IMPORTANTE: mientras la bandera PAGOS_ACTIVOS esté en "false" (el estado de
 * hoy), estos identificadores NO existen todavía; se leen de variables de
 * entorno y, si faltan, quedan como cadena vacía. Nada de esto cobra: es la
 * plomería lista para el día que se encienda la venta en línea.
 *
 * Reutiliza los tipos de `@salones/core` (SOLO los importa, no los modifica).
 */
import type { Plan } from "@salones/core";
import { FEATURES_CONOCIDAS as F } from "@salones/core";

/** Los 3 modelos comerciales que la plataforma vende. */
export type PlanId = "gestionado" | "renta" | "compra";

export const PLAN_IDS: readonly PlanId[] = ["gestionado", "renta", "compra"] as const;

/**
 * Catálogo comercial: qué FUNCIONES incluye cada plan. Es el reflejo, en código,
 * de la semilla de la migración `0002_plano_de_control.sql` (tablas `plans` /
 * `plan_features`). Lo usa la función pura del webhook para saber qué
 * entitlements encender/apagar cuando cambia una suscripción.
 *
 *   gestionado = los 5 módulos + sync-colectivo (la nube en vivo)
 *   renta / compra = los 5 módulos en modo local (sin sync-colectivo)
 */
export const PLANES: Plan[] = [
  {
    id: "gestionado",
    nombre: "Gestionado",
    funciones: [F.Muro, F.Playlist, F.Rsvp, F.Dinamicas, F.Album, F.SyncColectivo],
  },
  {
    id: "renta",
    nombre: "Renta",
    funciones: [F.Muro, F.Playlist, F.Rsvp, F.Dinamicas, F.Album],
  },
  {
    id: "compra",
    nombre: "Compra",
    funciones: [F.Muro, F.Playlist, F.Rsvp, F.Dinamicas, F.Album],
  },
];

/** Vínculo de un plan con su producto y su precio en Stripe. */
export type MapeoStripe = {
  planId: PlanId;
  /** Producto en Stripe (`prod_...`). Vacío mientras no haya cobros. */
  productId: string;
  /** Precio recurrente en Stripe (`price_...`). Vacío mientras no haya cobros. */
  priceId: string;
};

/**
 * Construye el mapeo plan↔Stripe leyendo variables de entorno. Recibe el objeto
 * de entorno (por defecto vacío) para que sea PURO y fácil de probar.
 *
 * Convención de variables (se definen el día que se encienda el cobro):
 *   STRIPE_PRODUCT_GESTIONADO / STRIPE_PRICE_GESTIONADO
 *   STRIPE_PRODUCT_RENTA      / STRIPE_PRICE_RENTA
 *   STRIPE_PRODUCT_COMPRA     / STRIPE_PRICE_COMPRA
 *
 * Con PAGOS_ACTIVOS="false" estas variables no existen → ids en "".
 */
export function mapeoStripeDesdeEntorno(
  env: Record<string, string | undefined> = {},
): MapeoStripe[] {
  return PLAN_IDS.map((planId) => {
    const sufijo = planId.toUpperCase();
    return {
      planId,
      productId: env[`STRIPE_PRODUCT_${sufijo}`] ?? "",
      priceId: env[`STRIPE_PRICE_${sufijo}`] ?? "",
    };
  });
}

/** Devuelve el `planId` cuyo precio de Stripe coincide, o `undefined`. */
export function planIdDesdePrecio(
  priceId: string | null | undefined,
  mapa: MapeoStripe[],
): PlanId | undefined {
  if (!priceId) return undefined;
  return mapa.find((m) => m.priceId !== "" && m.priceId === priceId)?.planId;
}
