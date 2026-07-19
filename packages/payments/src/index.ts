/**
 * @salones/payments — Cobros con Stripe (plomería lista pero APAGADA).
 *
 * El día que se quiera vender en línea se enciende la bandera PAGOS_ACTIVOS y se
 * conectan las llaves de Stripe. Hoy, con la bandera en "false", nada de esto
 * cobra: solo deja el mapeo de planes y la lógica pura del webhook listos.
 *
 * Punto de entrada PURO (solo depende de `zod` vía `@salones/core` y de TIPOS de
 * `stripe`): corre igual en el cliente y en el servidor. La parte que usa el SDK
 * de Stripe como valor (verificar la firma) vive aparte en
 * `@salones/payments/servidor`, para que el SDK de Node no entre en bundles del
 * navegador.
 */
export * from "./planes";
export * from "./webhook";
