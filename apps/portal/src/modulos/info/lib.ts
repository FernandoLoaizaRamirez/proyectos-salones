/**
 * LA INFORMACIÓN DEL EVENTO (cronograma, lugar, vestimenta, preguntas) — datos
 * compartidos por los cuatro módulos de la sección "Información".
 *
 * DE DÓNDE SALEN LOS DATOS: de la INVITACIÓN que el salón captura en su panel
 * (colección `invitacion`, una sola fila canónica por evento — ver el molde en
 * @salones/core). No se duplica nada: el itinerario que pinta el cronograma es
 * EL MISMO que enseña la invitación, y corregir una hora en el panel corrige
 * los dos. Estos módulos solo LEEN.
 *
 * LA VITRINA: cuando el evento es una vitrina (`demo` / `demo-xxxxxx`) y no hay
 * invitación capturada, se enseña la MISMA boda de muestra de toda la suite
 * (Ana & Rodrigo en Hacienda Santa Renata — los valores calcan los de
 * apps/invitaciones/src/lib/invitacion.ts, sin las fotos: estos módulos son de
 * texto a propósito, así no cargan el resolvedor de medios). Jamás se escribe
 * al almacén.
 */
import {
  COLECCION_INVITACION,
  invitacionDe,
  invitacionTieneContenido,
  leerHora,
  normalizarInvitacion,
  type Invitacion,
  type Momento,
} from "@salones/core";
import { obtenerSync, esVitrina } from "@salones/sync";

export {
  enlaceCalendario,
  fechaLarga,
  horaCorta,
  nombresInvitacion,
  type Invitacion,
  type Momento,
  type PreguntaFrecuente,
  type Sede,
} from "@salones/core";

/**
 * La boda de muestra, contada igual que en la invitación demo (misma historia,
 * mismos textos y horas), más las preguntas frecuentes de ejemplo. Sin fotos:
 * la información se lee, no se hojea.
 */
export const INVITACION_MUESTRA: Invitacion = normalizarInvitacion({
  tipo: "boda",
  novia: "Ana",
  novio: "Rodrigo",
  fechaISO: "2027-03-20T18:00",
  ciudad: "Culiacán, Sinaloa",

  ceremonia: {
    titulo: "Ceremonia religiosa",
    hora: "6:00 p.m.",
    lugar: "Capilla Santa Renata",
    direccion: "Km 8 Carretera a Navolato, Culiacán, Sinaloa",
    mapa: "https://www.google.com/maps/search/?api=1&query=Hacienda+Santa+Renata+Culiacan",
  },
  recepcion: {
    titulo: "Recepción",
    hora: "8:00 p.m.",
    lugar: "Jardín de los Encinos · Hacienda Santa Renata",
    direccion: "Km 8 Carretera a Navolato, Culiacán, Sinaloa",
    mapa: "https://www.google.com/maps/search/?api=1&query=Hacienda+Santa+Renata+Culiacan",
  },

  vestimenta: "Etiqueta rigurosa",
  vestimentaNota: "Se sugiere reservar el color blanco para la novia.",
  vestimentaColores: ["#B33A6A", "#7C8B6F", "#E8D8C3", "#3A2B31"],

  itinerario: [
    { hora: "6:00 p.m.", titulo: "Ceremonia", detalle: "Nos damos el sí rodeados de los nuestros." },
    { hora: "7:30 p.m.", titulo: "Cóctel de bienvenida", detalle: "Bebidas y bocadillos en el jardín." },
    { hora: "8:00 p.m.", titulo: "Recepción y cena", detalle: "Servicio de tres tiempos en el salón principal." },
    { hora: "9:30 p.m.", titulo: "Primer baile", detalle: "" },
    { hora: "10:00 p.m.", titulo: "¡Que empiece la fiesta!", detalle: "Abrimos la pista hasta que se acabe la noche." },
  ],

  faq: [
    {
      pregunta: "¿A qué hora debo llegar?",
      respuesta:
        "La ceremonia empieza a las 6:00 p.m. en punto. Te sugerimos llegar media hora antes para encontrar tu lugar con calma.",
    },
    {
      pregunta: "¿Hay estacionamiento?",
      respuesta:
        "Sí: la hacienda cuenta con estacionamiento para invitados, sin costo. Sigue las señales al llegar.",
    },
    {
      pregunta: "¿Puedo llevar niños?",
      respuesta: "Esta celebración está reservada para adultos. Gracias por comprender.",
    },
    {
      pregunta: "¿Qué me pongo?",
      respuesta:
        "Etiqueta rigurosa, y se sugiere reservar el color blanco para la novia. En el código de vestimenta está la paleta sugerida.",
    },
    {
      pregunta: "¿Puedo llevar acompañante?",
      respuesta:
        "Los lugares están contados por invitación. Tu invitación dice cuántos lugares ampara; ante la duda, pregunta a los organizadores.",
    },
    {
      pregunta: "¿Dónde comparto mis fotos de la noche?",
      respuesta:
        "En el álbum del evento, aquí mismo en el portal: lo que tomes esa noche se junta con las fotos de todos los invitados.",
    },
  ],
});

/**
 * La invitación del evento para los módulos de información.
 *
 *   · Evento real con invitación capturada → esa (la verdad del panel).
 *   · Vitrina sin captura (o sin red) → la boda de muestra.
 *   · Evento real sin captura → `null`: cada módulo enseña su aviso de "en
 *     preparación" — jamás la boda de otros.
 */
export async function cargarInvitacion(evento: string): Promise<Invitacion | null> {
  try {
    const items = await obtenerSync().listar(evento, COLECCION_INVITACION);
    const inv = invitacionDe(evento, items);
    if (inv && invitacionTieneContenido(inv)) return inv;
  } catch {
    /* sin red: abajo se decide por vitrina o null */
  }
  return esVitrina(evento) ? INVITACION_MUESTRA : null;
}

/** Un momento del itinerario con su hora entendida (minutos desde medianoche). */
type MomentoConHora = { momento: Momento; minutos: number };

function conHoras(itinerario: Momento[]): MomentoConHora[] {
  return itinerario
    .map((momento) => {
      const t = leerHora(momento.hora);
      return t ? { momento, minutos: t.h * 60 + t.m } : null;
    })
    .filter((x): x is MomentoConHora => x !== null);
}

/**
 * QUÉ SIGUE EN LA FIESTA, para la portada del portal.
 *
 *   · Antes del día del evento → el PRIMER momento ("empieza con: Ceremonia").
 *   · El día del evento → el próximo momento que aún no llega; si ya pasaron
 *     todos, el último ("¡Que empiece la fiesta!").
 *   · DESPUÉS del día del evento → `null`: el chip no se pinta. El invitado
 *     que vuelve una semana después a ver el álbum no puede leer "la
 *     celebración empieza con la ceremonia" de una boda que ya fue. (Y sí:
 *     eso incluye las 12:01 a.m. con la pista llena — mejor un chip que
 *     desaparece que uno que miente.)
 *   · Sin itinerario → `null`. Sin fecha entendible → el primer momento como
 *     "aún no empieza" (no se puede saber más, pero el plan sí existe).
 *
 * `ahora` llega de afuera (Date en el navegador) para poder probarlo puro.
 */
export function loQueSigue(
  inv: Invitacion,
  ahora: Date,
): { momento: Momento; yaEmpezo: boolean } | null {
  const momentos = conHoras(inv.itinerario);
  if (momentos.length === 0) return null;

  const f = /^(\d{4})-(\d{2})-(\d{2})/.exec(inv.fechaISO);
  if (!f) return { momento: momentos[0]!.momento, yaEmpezo: false };

  // La fecha se compara por componentes LOCALES (la lección de fechaLarga:
  // new Date("2027-03-20") caería en UTC y correría el día). Como número
  // yyyymmdd para poder distinguir antes / hoy / DESPUÉS.
  const diaEvento = Number(f[1]) * 10000 + Number(f[2]) * 100 + Number(f[3]);
  const diaAhora = ahora.getFullYear() * 10000 + (ahora.getMonth() + 1) * 100 + ahora.getDate();
  if (diaAhora < diaEvento) return { momento: momentos[0]!.momento, yaEmpezo: false };
  if (diaAhora > diaEvento) return null;

  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const proximo = momentos.find((m) => m.minutos > minutosAhora);
  return {
    momento: (proximo ?? momentos[momentos.length - 1]!).momento,
    yaEmpezo: true,
  };
}

/**
 * El enlace de "Cómo llegar" de una sede: el mapa que pegó el salón si es un
 * enlace de verdad (http/https — React ya neutraliza los `javascript:`, pero
 * aquí ni siquiera se le da la oportunidad: cinturón y tirantes, la regla de
 * la casa con URLs que vienen de la base), y si no, una búsqueda de Google
 * Maps armada con el lugar y la dirección (el mismo respaldo que la
 * invitación).
 */
export function enlaceComoLlegar(sede: { lugar: string; direccion: string; mapa: string }): string {
  if (/^https?:\/\//i.test(sede.mapa.trim())) return sede.mapa.trim();
  const consulta = [sede.lugar, sede.direccion].filter(Boolean).join(" ");
  if (!consulta) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}
