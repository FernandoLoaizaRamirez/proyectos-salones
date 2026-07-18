/**
 * @salones/payments/servidor — Ayudantes que SÍ usan el SDK de Stripe.
 *
 * Este archivo es la ÚNICA parte del paquete que importa el SDK de Stripe como
 * valor (no solo tipos), porque verificar la firma de un webhook necesita la
 * criptografía del SDK. Se mantiene aparte del punto de entrada principal
 * (`@salones/payments`, que es puro y sirve en el navegador) para que el SDK de
 * Node solo entre donde se ejecuta en el servidor.
 *
 * Nada de esto corre mientras PAGOS_ACTIVOS !== "true": el webhook lo llama solo
 * en el camino real, que hoy está apagado detrás de la bandera.
 */
import Stripe from "stripe";

/**
 * Verifica que el cuerpo crudo del webhook viene de Stripe (comparando la firma
 * del encabezado `stripe-signature` contra el secreto del endpoint) y devuelve
 * el evento ya tipado. Lanza si la firma no cuadra (webhook falso o manipulado).
 *
 * @param cuerpoCrudo    el body EXACTO tal como llegó (texto sin parsear).
 * @param firma          encabezado `stripe-signature` de la petición.
 * @param secretoWebhook secreto del endpoint (`whsec_...`, STRIPE_WEBHOOK_SECRET).
 * @param claveSecreta   llave secreta de la cuenta (`sk_...`, STRIPE_SECRET_KEY).
 */
export function verificarFirmaStripe(
  cuerpoCrudo: string,
  firma: string,
  secretoWebhook: string,
  claveSecreta: string,
): Stripe.Event {
  const stripe = new Stripe(claveSecreta);
  return stripe.webhooks.constructEvent(cuerpoCrudo, firma, secretoWebhook);
}
