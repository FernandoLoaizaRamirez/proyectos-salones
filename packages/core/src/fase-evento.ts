/**
 * LA FASE DEL EVENTO — antes / cerca / hoy / después.
 *
 * La portada del invitado no es la misma pantalla en todo momento: decide qué
 * encabeza la historia (confirmar y prepararse, llegar, vivir la fiesta, o
 * guardar los recuerdos). Se calcula por DÍA calendario, no por hora exacta:
 * un evento "es hoy" desde las 00:00 de esa fecha, así quien se asoma en la
 * mañana ya ve la portada del gran día y no la cuenta regresiva de ayer.
 */
export type FaseEvento = "antes" | "cerca" | "hoy" | "despues";

const DIA_MS = 24 * 60 * 60 * 1000;
/** A cuántos días se empieza a priorizar ubicación/mesa/vestimenta sobre RSVP. */
const DIAS_CERCA = 7;

export function faseDeEvento(fechaISO: string | null | undefined, ahora: Date): FaseEvento {
  const f = fechaISO ? /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO) : null;
  if (!f) return "antes";

  // Componentes LOCALES en los dos lados de la resta: `new Date("2027-03-20")`
  // caería en UTC y correría el día en cualquier huso al oeste de Greenwich.
  const diaEvento = new Date(Number(f[1]), Number(f[2]) - 1, Number(f[3])).getTime();
  const diaAhora = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const dias = Math.round((diaEvento - diaAhora) / DIA_MS);

  if (dias < 0) return "despues";
  if (dias === 0) return "hoy";
  if (dias <= DIAS_CERCA) return "cerca";
  return "antes";
}
