/**
 * @salones/payments — Lógica PURA del webhook de Stripe.
 *
 * Dado un evento de webhook de Stripe (checkout o suscripción), calcula QUÉ
 * filas de `tenant_entitlements` habría que escribir. Es una función PURA (sin
 * red, sin base de datos, sin efectos): recibe el evento y el catálogo, y
 * devuelve las filas. Así se puede probar sola con vitest, y el webhook real
 * (cuando se encienda PAGOS_ACTIVOS) solo se encarga de verificar la firma y de
 * escribir en la base lo que esta función decide.
 *
 * La idea de negocio: `tenants.plan_id` dice QUÉ plan contrató el salón, pero la
 * VERDAD de si puede usar las funciones la marca el pago. Por eso, cuando la
 * suscripción está vigente escribimos overrides `habilitado = true` para las
 * funciones del plan; cuando se cancela o queda impaga, los escribimos en
 * `false` (y como el override le gana al plan en `resolveEntitlements`, la
 * función queda apagada aunque el plan la incluya = no hay fuga de dinero).
 *
 * Solo importa TIPOS de `stripe` (se borran al compilar): el módulo sigue siendo
 * puro y sirve igual en el navegador y en el servidor.
 */
import type Stripe from "stripe";
import type { Plan } from "@salones/core";
import { type MapeoStripe, planIdDesdePrecio } from "./planes";

/** Una fila lista para hacer upsert en la tabla `tenant_entitlements`. */
export type FilaEntitlement = {
  tenant_id: string;
  feature_clave: string;
  habilitado: boolean;
};

/** Lo que nos interesa de un evento de Stripe, ya normalizado. */
export type IntencionCobro = {
  tenantId: string;
  planId: string;
  /** ¿La suscripción quedó vigente (pagada) o no (cancelada / impaga)? */
  activo: boolean;
};

/**
 * Estados de una suscripción de Stripe que consideramos "vigente / pagada".
 * Cualquier otro (canceled, unpaid, past_due, incomplete…) apaga las funciones.
 */
const ESTADOS_VIGENTES = new Set(["active", "trialing"]);

/** Lee una clave de metadata como texto no vacío, o `undefined`. */
function metaTexto(meta: Stripe.Metadata | null | undefined, clave: string): string | undefined {
  const v = meta?.[clave];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Normaliza un evento de Stripe a una `IntencionCobro`, o `null` si el evento no
 * nos interesa (o le faltan datos para saber de qué salón / plan hablamos).
 *
 * De dónde salen los datos:
 *   - tenant: `metadata.tenant_id` (o `client_reference_id` en el checkout).
 *   - plan:   `metadata.plan_id`, o si no, mapeando el `price` de la suscripción.
 * Ambos se fijan al CREAR el checkout/suscripción, cuando se encienda el cobro.
 */
export function interpretarEvento(
  event: Stripe.Event,
  mapa: MapeoStripe[] = [],
): IntencionCobro | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const tenantId = metaTexto(s.metadata, "tenant_id") ?? s.client_reference_id ?? undefined;
      const planId = metaTexto(s.metadata, "plan_id");
      if (!tenantId || !planId) return null;
      // Un checkout completado = suscripción recién pagada (salvo pago pendiente).
      return { tenantId, planId, activo: s.payment_status !== "unpaid" };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = metaTexto(sub.metadata, "tenant_id");
      const planId =
        metaTexto(sub.metadata, "plan_id") ??
        planIdDesdePrecio(sub.items?.data?.[0]?.price?.id, mapa);
      if (!tenantId || !planId) return null;
      const activo =
        event.type !== "customer.subscription.deleted" && ESTADOS_VIGENTES.has(sub.status);
      return { tenantId, planId, activo };
    }
    default:
      // Cualquier otro evento (invoice.*, etc.) no cambia entitlements aquí.
      return null;
  }
}

/**
 * Traduce una `IntencionCobro` a las filas de `tenant_entitlements`: una fila por
 * cada función del plan, con `habilitado` según esté vigente el cobro. Si el
 * plan no está en el catálogo, no escribe nada.
 */
export function entitlementsDeIntencion(
  intencion: IntencionCobro,
  planes: Plan[],
): FilaEntitlement[] {
  const plan = planes.find((p) => p.id === intencion.planId);
  if (!plan) return [];
  return plan.funciones.map((clave) => ({
    tenant_id: intencion.tenantId,
    feature_clave: clave,
    habilitado: intencion.activo,
  }));
}

/**
 * Función principal (PURA): dado un evento de webhook de Stripe y el catálogo,
 * devuelve las filas de `tenant_entitlements` a escribir. Devuelve `[]` cuando el
 * evento no aplica, de modo que quien la llama puede escribir sin ramas extra.
 */
export function calcularEntitlements(
  event: Stripe.Event,
  config: { mapa?: MapeoStripe[]; planes: Plan[] },
): FilaEntitlement[] {
  const intencion = interpretarEvento(event, config.mapa ?? []);
  if (!intencion) return [];
  return entitlementsDeIntencion(intencion, config.planes);
}
