/**
 * Resolución de la CONFIG de un evento para el portal: qué funciones están
 * habilitadas y con qué branding se pinta.
 *
 * Reutiliza el motor PURO `resolveEntitlements` de `@salones/core` (plan +
 * overrides → qué está encendido). El portal solo consume el resultado para
 * decidir qué módulos mostrar.
 *
 * ── INCREMENTO 1 (esqueleto) ────────────────────────────────────────────────
 * Devuelve la config DEMO: los 5 módulos del invitado encendidos y el tema por
 * defecto. Es lo que se ve sin datos de servidor.
 *
 * ── INCREMENTO 2 (pendiente) ────────────────────────────────────────────────
 * La resolución REAL por evento (leer el plan/overrides del evento y el branding
 * de su salón) se hará contra una **Edge Function pública** `evento-config?e=<codigo>`
 * —para NO meter la llave service-role en esta app, igual que el token del
 * invitado vive en su propia función— y aquí se correrá este mismo
 * `resolveEntitlements`. El contrato de este módulo (`ConfigEvento`) no cambia.
 */
import { resolveEntitlements, type Entitlements, type Plan, FEATURES_CONOCIDAS as F } from "@salones/core";
import type { BrandingSalon } from "@salones/ui";

export type ConfigEvento = {
  /** Código del evento (el `?e=`). */
  codigo: string;
  /** Nombre para mostrar (del evento o del salón). */
  nombre: string;
  /** Qué funciones están habilitadas (resultado del motor de core). */
  entitlements: Entitlements;
  /** Branding del salón dueño, o null → tema por defecto. */
  branding: BrandingSalon | null;
};

/** Plan DEMO: los 5 módulos del invitado encendidos (mientras no hay datos reales). */
const PLAN_DEMO: Plan = {
  id: "demo",
  nombre: "Demo",
  funciones: [F.Muro, F.Playlist, F.Rsvp, F.Dinamicas, F.Album],
};

/**
 * Resuelve la config de un evento por su código. Async porque el incremento 2
 * hará una llamada de red; hoy responde de inmediato con la config demo.
 */
export async function resolverConfigEvento(codigo: string): Promise<ConfigEvento> {
  const esDemo = !codigo || codigo === "demo";
  return {
    codigo: esDemo ? "demo" : codigo,
    nombre: esDemo ? "Evento de demostración" : codigo,
    entitlements: resolveEntitlements(PLAN_DEMO),
    branding: null,
  };
}
