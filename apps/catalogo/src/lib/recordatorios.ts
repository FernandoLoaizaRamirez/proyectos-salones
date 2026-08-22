/**
 * RECORDARLE A QUIEN NO HA CONTESTADO.
 * ---------------------------------------------------------------------------
 * El tablero ya decía quién falta. Lo que no había era forma de PERSEGUIRLO sin
 * perder la cuenta: el salón abría WhatsApp, mandaba unos cuantos, se
 * interrumpía, y al volver no sabía por dónde iba. Con 40 pendientes eso acaba
 * en "mejor les hablo por teléfono", que es justo lo que este panel venía a
 * evitar.
 *
 * Aquí vive la parte que se puede probar sin base ni navegador: qué dice el
 * recordatorio y cómo se cuenta el tiempo desde el último.
 *
 * DECISIÓN: el recordatorio NO se manda solo. No hay forma de mandar 40
 * WhatsApps desde una página web —el navegador bloquea abrir 40 pestañas y
 * WhatsApp no lo permite— y aunque la hubiera, un mensaje automático a los
 * invitados de una boda ajena es exactamente como se quema un teléfono. Lo que
 * hace esto es quitar el trabajo de ACORDARSE: filtrar a los pendientes,
 * abrir el chat correcto con el texto ya escrito, y apuntar a quién ya
 * perseguiste y cuándo.
 */

/** Donde se apunta a quién se le recordó y cuándo (una fila por invitado). */
export const COLECCION_RECORDATORIOS = "recordatorios";

/** Una fila de esa colección. */
export type RecordatorioItem = { id: string; fecha: number };

/** Un día, en milisegundos. */
const DIA = 86_400_000;

/**
 * "hoy", "ayer", "hace 3 días". Devuelve "" si nunca se le recordó, para que
 * la pantalla pueda no enseñar nada en vez de enseñar un "nunca" acusador.
 *
 * `ahora` se pasa como parámetro (y no se lee de `Date.now()` dentro) para que
 * esto se pueda probar sin depender de la hora a la que corran las pruebas.
 */
export function haceCuanto(fecha: number | undefined, ahora: number): string {
  if (!fecha || fecha > ahora) return "";
  // Se comparan DÍAS DE CALENDARIO, no múltiplos de 24 horas: para quien mira
  // la pantalla, un mensaje de anoche a las 11 fue "ayer", no "hace 9 horas".
  const dias = Math.floor((mediaNoche(ahora) - mediaNoche(fecha)) / DIA);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/** El instante del inicio del día al que pertenece esa marca de tiempo. */
function mediaNoche(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * El texto del recordatorio. NO es el de la primera invitación: quien ya
 * recibió el enlace y no contestó no necesita que se lo presenten otra vez,
 * necesita que le digan qué falta y hasta cuándo.
 *
 * La fecha límite entra solo si el salón la capturó en la invitación. Sin
 * ella, el mensaje no se inventa una: apurar con una fecha falsa es peor que
 * no apurar.
 */
export function mensajeRecordatorio(
  nombreEvento: string,
  fechaLimite: string,
  url: string,
): string {
  const evento = nombreEvento.trim() || "nuestro evento";
  const limite = fechaLimite.trim();
  const cierre = limite
    ? `Nos ayudas un montón si nos confirmas antes del ${limite}.`
    : "Nos ayudas un montón si nos confirmas cuando puedas.";
  return `¡Hola! Te recordamos confirmar tu asistencia a ${evento}. ${cierre}\n${url}`;
}

/**
 * ¿A cuántos de estos hay que perseguir todavía? Se cuenta aparte de "los
 * pendientes" a secas porque lo que el salón quiere saber al abrir el tablero
 * no es cuántos faltan, sino **cuántos faltan a los que aún no les he escrito
 * hoy** — que es la lista de trabajo de ese rato.
 */
export function porRecordarHoy(
  pendientes: { id: string }[],
  recordados: Map<string, number>,
  ahora: number,
): number {
  return pendientes.filter((p) => haceCuanto(recordados.get(p.id), ahora) !== "hoy").length;
}
