/**
 * Webhook de Stripe — STUB (plomería lista pero APAGADA).
 *
 * Estado de HOY: la bandera PAGOS_ACTIVOS está en "false" (no existe o != "true"),
 * así que este endpoint responde 200 "cobros desactivados" y NO toca nada. Stripe
 * no está integrado de verdad todavía; esto solo deja el camino escrito.
 *
 * El día que se quiera vender en línea se pone PAGOS_ACTIVOS="true" y se conectan
 * las variables de Stripe y del service-role. Entonces se ejecuta el CAMINO REAL
 * de abajo:
 *   1) Verifica la FIRMA del evento (que de verdad viene de Stripe).
 *   2) Calcula qué filas de `tenant_entitlements` escribir, con la función PURA
 *      de `@salones/payments` (probada con vitest).
 *   3) Las guarda con la llave SERVICE-ROLE, que salta la RLS (por eso vive solo
 *      en el servidor y nunca se expone al navegador).
 *
 * Se responde 200 en el camino apagado para que Stripe no reintente en balde.
 */
import { createClient } from "@supabase/supabase-js";
import { PLANES, calcularEntitlements, mapeoStripeDesdeEntorno } from "@salones/payments";
import { verificarFirmaStripe } from "@salones/payments/servidor";

// El SDK de Stripe y la verificación de firma necesitan Node (no el runtime Edge).
export const runtime = "nodejs";

/** Interruptor maestro de cobros. Por defecto APAGADO. */
const PAGOS_ACTIVOS = process.env.PAGOS_ACTIVOS === "true";

export async function POST(req: Request): Promise<Response> {
  // ── Bandera APAGADA (hoy): no se cobra. 200 y no se toca nada. ──────────────
  if (!PAGOS_ACTIVOS) {
    return Response.json({ recibido: false, motivo: "cobros desactivados" }, { status: 200 });
  }

  // ── CAMINO REAL (inactivo hasta encender PAGOS_ACTIVOS) ─────────────────────
  const firma = req.headers.get("stripe-signature");
  if (!firma) {
    return Response.json({ error: "falta la firma de Stripe" }, { status: 400 });
  }

  const secretoWebhook = process.env.STRIPE_WEBHOOK_SECRET;
  const claveSecreta = process.env.STRIPE_SECRET_KEY;
  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretoWebhook || !claveSecreta || !urlSupabase || !serviceRole) {
    return Response.json({ error: "faltan variables de entorno de cobros" }, { status: 500 });
  }

  // 1) Verificar la firma con el cuerpo CRUDO (sin parsear).
  const cuerpoCrudo = await req.text();
  let evento;
  try {
    evento = verificarFirmaStripe(cuerpoCrudo, firma, secretoWebhook, claveSecreta);
  } catch {
    return Response.json({ error: "firma inválida" }, { status: 400 });
  }

  // 2) Calcular (función PURA) qué filas de tenant_entitlements escribir.
  const filas = calcularEntitlements(evento, {
    mapa: mapeoStripeDesdeEntorno(process.env),
    planes: PLANES,
  });

  // 3) Escribir con service-role (salta la RLS). Upsert por (tenant, función).
  if (filas.length > 0) {
    const admin = createClient(urlSupabase, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin
      .from("tenant_entitlements")
      .upsert(filas, { onConflict: "tenant_id,feature_clave" });
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ recibido: true, escritas: filas.length }, { status: 200 });
}
