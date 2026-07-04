/**
 * Degradación elegante: la app detecta si hay un backend compartido del evento.
 *
 * - Si NEXT_PUBLIC_SHARED_BACKEND_URL está definido → modo "integrado"
 *   (toma la lista del evento compartido junto con otras apps de la suite).
 * - Si NO está definido → modo "aislado" (funciona sola con datos locales).
 *
 * La app NUNCA falla por falta de otra app: simplemente se adapta.
 */
export type Modo = "aislado" | "integrado";

export function obtenerModo(): Modo {
  return process.env.NEXT_PUBLIC_SHARED_BACKEND_URL ? "integrado" : "aislado";
}
