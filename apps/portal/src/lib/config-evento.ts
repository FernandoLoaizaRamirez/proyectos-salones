/**
 * Resolución de la CONFIG de un evento para el portal: qué funciones están
 * habilitadas y con qué branding se pinta.
 *
 * Cómo funciona (incremento 3):
 *   1. Pide los datos CRUDOS del evento a la Edge Function pública
 *      `evento-config?e=<codigo>` (plan + overrides + branding). La llave
 *      service-role vive DENTRO de esa función, nunca en esta app.
 *   2. Corre `resolveEntitlements` de `@salones/core` con esos datos. El motor
 *      comercial sigue teniendo UNA sola implementación (probada con vitest).
 *
 * Degradación elegante — el portal NUNCA se rompe:
 *   • Sin variables de Supabase (o si la función aún no está desplegada / falla la
 *     red) → config DEMO: los 5 módulos y el tema por defecto.
 *   • Evento inexistente (404) → estado "no-encontrado", sin funciones.
 *
 * Corre en el SERVIDOR (lo llaman los server components), así que la petición no
 * viaja desde el navegador del invitado.
 */
import {
  resolveEntitlements,
  type Entitlements,
  type Plan,
  FEATURES_CONOCIDAS as F,
} from "@salones/core";
import type { BrandingSalon } from "@salones/ui";

/** De dónde salió la config que se está mostrando. */
export type EstadoConfig = "ok" | "demo" | "no-encontrado";

export type ConfigEvento = {
  /** Código del evento (el `?e=`). */
  codigo: string;
  /** Nombre del EVENTO (lo que ve el invitado como título). */
  nombre: string;
  /** Marca del salón anfitrión, si se conoce. */
  salon: string | null;
  /** Qué funciones están habilitadas (resultado del motor de core). */
  entitlements: Entitlements;
  /** Branding del salón dueño, o null → tema por defecto. */
  branding: BrandingSalon | null;
  estado: EstadoConfig;
};

/** Plan DEMO: los 5 módulos del invitado encendidos (cuando no hay servidor). */
const PLAN_DEMO: Plan = {
  id: "demo",
  nombre: "Demo",
  funciones: [F.Muro, F.Playlist, F.Rsvp, F.Dinamicas, F.Album],
};

/** Lo que devuelve la Edge Function `evento-config`. */
type RespuestaConfig = {
  evento: { codigo: string; nombre: string; estado: string };
  plan: { id: string; nombre: string; funciones: string[] };
  overridesTenant: Record<string, boolean>;
  overridesEvento: Record<string, boolean>;
  branding: BrandingSalon | null;
};

/** Config de demostración (sin datos de servidor). */
function configDemo(codigo: string): ConfigEvento {
  const esDemo = !codigo || codigo === "demo";
  return {
    codigo: esDemo ? "demo" : codigo,
    nombre: esDemo ? "Evento de demostración" : codigo,
    salon: null,
    entitlements: resolveEntitlements(PLAN_DEMO),
    branding: null,
    estado: "demo",
  };
}

/** Resuelve la config de un evento por su código. */
export async function resolverConfigEvento(codigo: string): Promise<ConfigEvento> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return configDemo(codigo);

  // Mismos encabezados que usa @salones/sync: `apikey` siempre y `Authorization`
  // solo si la llave es "legacy" (un JWT que empieza con eyJ).
  const headers: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };

  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/functions/v1/evento-config?e=${encodeURIComponent(codigo)}`,
      { headers, next: { revalidate: 60 } },
    );

    if (res.status === 404) {
      return {
        codigo,
        nombre: "Evento no encontrado",
        salon: null,
        entitlements: {},
        branding: null,
        estado: "no-encontrado",
      };
    }
    // Cualquier otro fallo (función no desplegada, error del servidor): modo demo.
    if (!res.ok) return configDemo(codigo);

    const datos = (await res.json()) as RespuestaConfig;
    return {
      codigo,
      nombre: datos.evento.nombre,
      salon: datos.branding?.nombre ?? null,
      entitlements: resolveEntitlements(datos.plan, datos.overridesTenant, datos.overridesEvento),
      branding: datos.branding,
      estado: "ok",
    };
  } catch {
    // Red caída: mejor mostrar el portal en modo demo que una pantalla rota.
    return configDemo(codigo);
  }
}
