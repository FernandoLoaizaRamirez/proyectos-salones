import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import {
  calcularEntitlements,
  interpretarEvento,
  entitlementsDeIntencion,
  mapeoStripeDesdeEntorno,
  planIdDesdePrecio,
  PLANES,
  type MapeoStripe,
} from "./index";

/* ------------------------------------------------------------------ */
/* Ayudas para armar eventos de Stripe mínimos (solo los campos que    */
/* la lógica lee). Se castean porque son fixtures de prueba.           */
/* ------------------------------------------------------------------ */

function eventoCheckout(
  metadata: Record<string, string> | null,
  extra: { client_reference_id?: string | null; payment_status?: string } = {},
): Stripe.Event {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        metadata,
        client_reference_id: extra.client_reference_id ?? null,
        payment_status: extra.payment_status ?? "paid",
      },
    },
  } as unknown as Stripe.Event;
}

function eventoSuscripcion(
  tipo:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted",
  opts: { metadata?: Record<string, string> | null; status?: string; priceId?: string },
): Stripe.Event {
  return {
    type: tipo,
    data: {
      object: {
        metadata: opts.metadata ?? null,
        status: opts.status ?? "active",
        items: { data: opts.priceId ? [{ price: { id: opts.priceId } }] : [] },
      },
    },
  } as unknown as Stripe.Event;
}

const mapa: MapeoStripe[] = [
  { planId: "gestionado", productId: "prod_g", priceId: "price_gestionado" },
  { planId: "renta", productId: "prod_r", priceId: "price_renta" },
  { planId: "compra", productId: "prod_c", priceId: "price_compra" },
];

const config = { mapa, planes: PLANES };

/* ------------------------------------------------------------------ */
/* PLANES — reflejo del catálogo comercial                             */
/* ------------------------------------------------------------------ */

describe("PLANES (catálogo)", () => {
  it("gestionado incluye sync-colectivo; renta y compra no", () => {
    const g = PLANES.find((p) => p.id === "gestionado")!;
    const r = PLANES.find((p) => p.id === "renta")!;
    const c = PLANES.find((p) => p.id === "compra")!;
    expect(g.funciones).toContain("sync-colectivo");
    expect(r.funciones).not.toContain("sync-colectivo");
    expect(c.funciones).not.toContain("sync-colectivo");
    // los 5 módulos están en los tres planes
    expect(r.funciones).toEqual(expect.arrayContaining(["muro", "playlist", "rsvp", "dinamicas", "album"]));
  });
});

/* ------------------------------------------------------------------ */
/* mapeoStripeDesdeEntorno / planIdDesdePrecio                         */
/* ------------------------------------------------------------------ */

describe("mapeoStripeDesdeEntorno", () => {
  it("sin variables de entorno, los ids quedan vacíos (cobros apagados)", () => {
    const m = mapeoStripeDesdeEntorno();
    expect(m).toHaveLength(3);
    expect(m.every((x) => x.productId === "" && x.priceId === "")).toBe(true);
  });

  it("lee los ids de producto y precio desde el entorno", () => {
    const m = mapeoStripeDesdeEntorno({
      STRIPE_PRODUCT_GESTIONADO: "prod_g",
      STRIPE_PRICE_GESTIONADO: "price_g",
    });
    const g = m.find((x) => x.planId === "gestionado")!;
    expect(g.productId).toBe("prod_g");
    expect(g.priceId).toBe("price_g");
  });
});

describe("planIdDesdePrecio", () => {
  it("mapea un precio conocido a su plan", () => {
    expect(planIdDesdePrecio("price_renta", mapa)).toBe("renta");
  });
  it("un precio desconocido o vacío devuelve undefined", () => {
    expect(planIdDesdePrecio("price_x", mapa)).toBeUndefined();
    expect(planIdDesdePrecio("", mapa)).toBeUndefined();
    expect(planIdDesdePrecio(null, mapa)).toBeUndefined();
  });
  it("no confunde con un mapeo de precio vacío", () => {
    const mapaVacio: MapeoStripe[] = [{ planId: "gestionado", productId: "", priceId: "" }];
    expect(planIdDesdePrecio("", mapaVacio)).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* calcularEntitlements — checkout                                     */
/* ------------------------------------------------------------------ */

describe("calcularEntitlements · checkout.session.completed", () => {
  it("un checkout pagado enciende las funciones del plan (gestionado → 6)", () => {
    const ev = eventoCheckout({ tenant_id: "t1", plan_id: "gestionado" });
    const filas = calcularEntitlements(ev, config);
    expect(filas).toHaveLength(6);
    expect(filas.every((f) => f.tenant_id === "t1" && f.habilitado === true)).toBe(true);
    expect(filas.map((f) => f.feature_clave)).toContain("sync-colectivo");
  });

  it("toma el tenant de client_reference_id si no viene en metadata", () => {
    const ev = eventoCheckout({ plan_id: "renta" }, { client_reference_id: "t2" });
    const filas = calcularEntitlements(ev, config);
    expect(filas).toHaveLength(5);
    expect(filas.every((f) => f.tenant_id === "t2" && f.habilitado === true)).toBe(true);
  });

  it("un checkout con pago pendiente NO enciende (habilitado=false)", () => {
    const ev = eventoCheckout({ tenant_id: "t1", plan_id: "renta" }, { payment_status: "unpaid" });
    const filas = calcularEntitlements(ev, config);
    expect(filas).toHaveLength(5);
    expect(filas.every((f) => f.habilitado === false)).toBe(true);
  });

  it("sin tenant o sin plan no escribe nada", () => {
    expect(calcularEntitlements(eventoCheckout({ plan_id: "renta" }), config)).toEqual([]);
    expect(calcularEntitlements(eventoCheckout({ tenant_id: "t1" }), config)).toEqual([]);
    expect(calcularEntitlements(eventoCheckout(null), config)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* calcularEntitlements — suscripción                                  */
/* ------------------------------------------------------------------ */

describe("calcularEntitlements · customer.subscription.*", () => {
  it("suscripción activa con plan por metadata enciende las funciones", () => {
    const ev = eventoSuscripcion("customer.subscription.updated", {
      metadata: { tenant_id: "t1", plan_id: "gestionado" },
      status: "active",
    });
    const filas = calcularEntitlements(ev, config);
    expect(filas).toHaveLength(6);
    expect(filas.every((f) => f.habilitado === true)).toBe(true);
  });

  it("deduce el plan desde el price de Stripe cuando no hay plan en metadata", () => {
    const ev = eventoSuscripcion("customer.subscription.created", {
      metadata: { tenant_id: "t7" },
      status: "active",
      priceId: "price_renta",
    });
    const filas = calcularEntitlements(ev, config);
    expect(filas).toHaveLength(5);
    expect(filas.every((f) => f.tenant_id === "t7" && f.habilitado === true)).toBe(true);
  });

  it("una suscripción cancelada apaga las funciones (habilitado=false)", () => {
    const ev = eventoSuscripcion("customer.subscription.deleted", {
      metadata: { tenant_id: "t1", plan_id: "gestionado" },
      status: "active", // aunque el status diga activo, el tipo 'deleted' manda
    });
    const filas = calcularEntitlements(ev, config);
    expect(filas).toHaveLength(6);
    expect(filas.every((f) => f.habilitado === false)).toBe(true);
  });

  it("un estado no vigente (past_due) apaga las funciones", () => {
    const ev = eventoSuscripcion("customer.subscription.updated", {
      metadata: { tenant_id: "t1", plan_id: "renta" },
      status: "past_due",
    });
    const filas = calcularEntitlements(ev, config);
    expect(filas.every((f) => f.habilitado === false)).toBe(true);
  });

  it("sin tenant en metadata no escribe nada (la suscripción no lo trae por price)", () => {
    const ev = eventoSuscripcion("customer.subscription.updated", {
      metadata: null,
      status: "active",
      priceId: "price_renta",
    });
    expect(calcularEntitlements(ev, config)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Bordes y pureza                                                     */
/* ------------------------------------------------------------------ */

describe("calcularEntitlements · bordes", () => {
  it("un evento que no nos interesa devuelve []", () => {
    const ev = { type: "invoice.paid", data: { object: {} } } as unknown as Stripe.Event;
    expect(calcularEntitlements(ev, config)).toEqual([]);
  });

  it("un plan que no está en el catálogo no escribe nada", () => {
    const ev = eventoCheckout({ tenant_id: "t1", plan_id: "inexistente" });
    expect(calcularEntitlements(ev, config)).toEqual([]);
  });

  it("interpretarEvento es determinista y no lanza con datos mínimos", () => {
    const ev = eventoCheckout({ tenant_id: "t1", plan_id: "compra" });
    const a = interpretarEvento(ev, mapa);
    const b = interpretarEvento(ev, mapa);
    expect(a).toEqual(b);
    expect(a).toEqual({ tenantId: "t1", planId: "compra", activo: true });
  });

  it("entitlementsDeIntencion respeta el flag activo", () => {
    const filas = entitlementsDeIntencion({ tenantId: "t1", planId: "renta", activo: false }, PLANES);
    expect(filas).toHaveLength(5);
    expect(filas.every((f) => f.habilitado === false)).toBe(true);
  });
});
