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
 *     red) → config DEMO: la suite completa y el tema por defecto.
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
import { esVitrina, type ConfigEventoCruda } from "@salones/sync";
import {
  TEMA_DEMO,
  EVENTO_DEMO,
  DATOS_EVENTO_DEMO,
  resolverTema,
  type BrandingSalon,
  type TemaEvento,
  type TemaResuelto,
} from "@salones/ui";

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
  /**
   * La personalización del EVENTO (event_branding, migración 0025): color,
   * portada, monograma, frase. Null → manda la del salón. La consume el
   * rediseño del portal (Fase 2) vía `resolverTema`.
   */
  brandingEvento: TemaEvento | null;
  /** Fecha ISO del evento (yyyy-mm-dd), si el salón la capturó. */
  fecha: string | null;
  /** Tipo del evento (boda/xv/…), si el salón lo capturó. */
  tipo: string | null;
  /**
   * EL TEMA YA FUSIONADO (salón + evento), lo único que consumen la cáscara
   * y los componentes. Quien pinta no sabe —ni le importa— si el color vino
   * del salón, del evento o del tema base.
   */
  tema: TemaResuelto;
  estado: EstadoConfig;
};

/**
 * Plan DEMO (cuando no hay servidor): la SUITE COMPLETA del invitado — las 14
 * experiencias desde la Etapa 1 (26 ago 2026). La demo es lo que se le renta a
 * los salones como prueba, y una vitrina a medias no vende; en los eventos
 * reales manda su plan, no esta lista. La lista la vigila la prueba de paridad
 * de tests/despliegue/experiencia-completa.test.ts.
 */
const PLAN_DEMO: Plan = {
  id: "demo",
  nombre: "Demo",
  funciones: [
    F.Invitacion,
    F.Rsvp,
    F.Pase,
    F.Mesas,
    F.Album,
    F.Muro,
    F.Playlist,
    F.Dinamicas,
    F.Photobooth,
    F.Brindis,
    F.Cronograma,
    F.Lugar,
    F.Vestimenta,
    F.Faq,
  ],
};

/**
 * Lo que devuelve la Edge Function `evento-config` — EL MISMO tipo que usa
 * `configEventoCruda` de @salones/sync (import solo de tipo, cero runtime).
 * Antes el portal tipeaba su propia copia del contrato: un campo nuevo entraba
 * a la función y a sync pero no aquí, y el `as` lo perdía en silencio.
 */
type RespuestaConfig = ConfigEventoCruda;

/** Config de demostración (sin datos de servidor). */
function configDemo(codigo: string): ConfigEvento {
  /*
   * Vitrina es "demo" Y TAMBIEN "demo-xxxxxx" (la propia de cada visitante,
   * migración 0022). Antes solo se reconocía "demo", así que la vitrina de un
   * visitante caía por el otro lado y el portal la nombraba con su código
   * crudo: "Tus recuerdos de demo-7znf7u".
   */
  const esDemo = !codigo || esVitrina(codigo);
  const nombre = esDemo ? DATOS_EVENTO_DEMO.nombre : codigo;
  /*
   * EL TEMA DE LA CASA, no el rosa de fábrica. Las vitrinas (`demo-xxxxxx`) no
   * existen en `events` —así se diseñó la 0022— y el modo local no tiene base
   * a la que preguntar: los dos caminos llegan aquí. Sin esto, LA PANTALLA QUE
   * VENDE (la que abre un salón desde "Vive la experiencia") seguiría oscura y
   * genérica, que es justo lo que el rediseño vino a matar.
   */
  return {
    codigo: codigo || "demo",
    nombre,
    salon: esDemo ? TEMA_DEMO.nombre : null,
    entitlements: resolveEntitlements(PLAN_DEMO),
    branding: esDemo ? TEMA_DEMO : null,
    brandingEvento: esDemo ? EVENTO_DEMO : null,
    fecha: esDemo ? DATOS_EVENTO_DEMO.fechaISO : null,
    tipo: esDemo ? "boda" : null,
    tema: esDemo
      ? resolverTema(TEMA_DEMO, EVENTO_DEMO, { origen: "demo", datosEvento: DATOS_EVENTO_DEMO })
      : resolverTema({ nombre }, null, { origen: "demo", datosEvento: { nombre } }),
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

    /*
     * ⚠️ UNA VITRINA NUNCA ES "EVENTO NO ENCONTRADO" (arreglado el 22 ago 2026).
     *
     * Las vitrinas (`demo` y `demo-xxxxxx`) NO viven en la tabla `events` —así
     * se diseñó la 0022—, así que `evento-config` contesta 404 para ellas. El
     * portal lo tomaba al pie de la letra y le enseñaba al visitante "No
     * encontramos este evento", con el catálogo mandándole justo ese enlace.
     * Comprobado en vivo antes de arreglarlo.
     */
    if (res.status === 404 && esVitrina(codigo)) return configDemo(codigo);
    if (res.status === 404) {
      return {
        codigo,
        nombre: "Evento no encontrado",
        salon: null,
        entitlements: {},
        branding: null,
        brandingEvento: null,
        fecha: null,
        tipo: null,
        tema: resolverTema({ nombre: "Evento no encontrado" }),
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
      brandingEvento: datos.brandingEvento ?? null,
      fecha: datos.evento.fecha ?? null,
      tipo: datos.evento.tipo ?? null,
      // La fusión de las dos capas, en el único sitio donde vive: el motor de
      // @salones/ui. Un evento sin marca capturada hereda la del salón; un
      // salón sin marca, el tema base — y todo pasa por el saneo.
      tema: resolverTema(datos.branding ?? { nombre: datos.evento.nombre }, datos.brandingEvento, {
        origen: "servidor",
        datosEvento: { nombre: datos.evento.nombre, fechaISO: datos.evento.fecha ?? undefined },
      }),
      estado: "ok",
    };
  } catch {
    // Red caída: mejor mostrar el portal en modo demo que una pantalla rota.
    return configDemo(codigo);
  }
}
