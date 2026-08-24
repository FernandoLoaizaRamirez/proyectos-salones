/**
 * EL TEMA DE LA DEMO: la identidad de Hacienda Santa Renata, como constante.
 *
 * POR QUÉ EXISTE COMO CONSTANTE (y no solo como semilla en la base): las
 * vitrinas por visitante (`demo-xxxxxx`, migración 0022) NO existen como filas
 * en `events` — `evento-config` les contesta 404 a propósito — y el modo local
 * (sin variables de Supabase) no tiene base a la que preguntar. Los dos
 * caminos desembocan aquí. Sin esta constante, LA PANTALLA QUE VENDE (la
 * vitrina que abre un salón desde "Vive la experiencia") seguiría en el rosa
 * oscuro genérico.
 *
 * TRES COPIAS DE LA MISMA IDENTIDAD, ATADAS POR PRUEBA (`paridad.test.ts`):
 *   1. esta constante (vitrinas y modo local),
 *   2. la semilla 0026 en la base (el evento `demo` real, vía evento-config),
 *   3. la paleta del sitio (apps/sitio-salon/src/app/globals.css).
 * Si alguien cambia una y no las otras, el CI se pone rojo: el visitante vería
 * dos demos distintas según el enlace — lo contrario de lo que se vende.
 */
import type { TemaEvento, TemaResuelto, TemaSalon } from "./tipos";
import { resolverTema } from "./resolver";

/** La identidad del salón demo = la del sitio (crema/vino/oro, Cormorant+Jost). */
export const TEMA_DEMO: TemaSalon = {
  nombre: "Hacienda Santa Renata",
  sitioUrl: "https://salones-teal.vercel.app",
  primario: "#7a2e3b", // vino — el --primary del sitio
  primarioTexto: "#fbf9f5", // crema clarísima sobre el vino
  acento: "#c9a96e", // oro — el --ring del sitio
  fondo: "#fbf9f5", // el fondo crema del sitio
  tinta: "#241d1a", // la tinta del sitio
  radio: "0.4rem",
  fuentes: "clasica",
  esquema: "claro",
};

/**
 * La personalización del evento demo (Boda Ana & Rodrigo).
 *
 * La PORTADA es la del propio sitio del salón: el invitado que llega desde
 * salones-teal reconoce el lugar, y la foto se sirve desde Vercel —no desde el
 * almacén de Supabase—, así que no gasta del cupo de descarga que comparten
 * todas las bodas. La misma URL vive en la semilla 0026, atada por prueba.
 */
export const EVENTO_DEMO: TemaEvento = {
  monograma: "A·R",
  frase: "Nos encantará celebrar contigo",
  portadaUrl: "https://salones-teal.vercel.app/img/portada.jpg",
};

/** Nombre y fecha del evento demo — los mismos de las muestras de las apps. */
export const DATOS_EVENTO_DEMO = {
  nombre: "Boda Ana & Rodrigo",
  fechaISO: "2027-03-20",
};

/** El tema demo YA fusionado, listo para pintar (vitrinas y modo local). */
export const TEMA_DEMO_RESUELTO: TemaResuelto = resolverTema(TEMA_DEMO, EVENTO_DEMO, {
  origen: "demo",
  datosEvento: DATOS_EVENTO_DEMO,
});
