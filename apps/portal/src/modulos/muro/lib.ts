/**
 * MÓDULO MURO (dentro del portal) — datos y utilidades.
 *
 * Primer módulo migrado al portal. Habla con el "lugar central" por
 * `@salones/sync` usando la MISMA colección que la app `muro` original
 * ("mensajes"), así que ambos ven el mismo contenido del evento mientras dure la
 * migración (estrategia strangler-fig: el portal ya sirve la experiencia y la app
 * vieja sigue viva hasta retirarla).
 *
 * Nota: estas utilidades son una copia acotada de las de `apps/muro`. Cuando el
 * portal absorba también la pantalla del anfitrión, el módulo se puede extraer a
 * un paquete `@salones/module-muro` sin cambiar el contrato.
 */

/** Un mensaje del libro de firmas. Misma forma que en la app `muro`. */
export type Mensaje = {
  id: string;
  nombre: string;
  texto: string;
  /** Foto opcional como dataURL (texto), ya comprimida. */
  foto?: string;
  /** Marca de tiempo (ms). */
  fecha: number;
  /**
   * El renglón del invitado en la lista del anfitrión, si firmó con perfil de
   * enlace personal. Campo ADICIONAL: la app `muro` original lo ignora sola, y
   * solo viaja en mensajes nuevos (los de antes no se reescriben — candado 0016).
   */
  invitadoId?: string;
};

/** Colección compartida en el lugar central (la misma que usa `apps/muro`). */
export const COLECCION_MENSAJES = "mensajes";

/** Una hora en milisegundos, para armar fechas de ejemplo legibles. */
const HORA = 3600 * 1000;

/**
 * Los 8 mensajes de ejemplo con los que abre la demo.
 *
 * COPIA EXACTA de `mensajesIniciales` de `apps/muro` —mismos ids, mismos textos
 * y las mismas fotos—, y no por pereza: las dos apps escriben la MISMA colección
 * ("mensajes") del mismo evento, así que si cada una sembrara su propia versión
 * el visitante vería una boda distinta según por dónde entrara. Con textos e ids
 * idénticos, siembre quien siembre primero, la historia que se cuenta es una
 * sola: la boda de Ana & Rodrigo que ya sale en la invitación y en el acomodo.
 *
 * Las fechas se calculan sobre "ahora" para que el muro luzca recién firmado
 * cuando el dueño del salón lo abre delante de su cliente.
 *
 * Las tres fotos (`/img/m1..m3.jpg`) se copiaron a `apps/portal/public/` a
 * propósito, aunque el portal ya tuviera esos MISMOS bytes con otro nombre
 * (a02/a05/a07 del álbum): la ruta la escribe quien siembre PRIMERO, y si el
 * visitante empezó por la app suelta del muro, el portal se encontraría con
 * "/img/m1.jpg" y enseñaría tres marcos rotos. Mismo nombre en las dos apps =
 * la demo se ve bien entre por donde entre.
 */
export function mensajesIniciales(): Mensaje[] {
  const ahora = Date.now();
  return [
    {
      id: "MS-001",
      nombre: "Valentina Montes",
      texto:
        "¡Qué felicidad verlos dar este paso! Les deseo una vida llena de amor, risas y aventuras juntos. 💍",
      foto: "/img/m1.jpg",
      fecha: ahora - 0.2 * HORA,
    },
    {
      id: "MS-002",
      nombre: "Familia Loaiza Ramírez",
      texto:
        "Gracias por dejarnos ser parte de este día tan especial. Que su amor crezca cada día más. ¡Los queremos!",
      fecha: ahora - 0.6 * HORA,
    },
    {
      id: "MS-003",
      nombre: "Carlos y Diana",
      texto:
        "Por muchos años de complicidad, viajes y cafés por la mañana. ¡Felicidades, tortolitos!",
      foto: "/img/m2.jpg",
      fecha: ahora - 1.4 * HORA,
    },
    {
      id: "MS-004",
      nombre: "Abuela Carmen",
      texto:
        "Mi niña, hoy mi corazón está lleno. Que Dios los bendiga y los acompañe siempre. Con todo mi cariño.",
      fecha: ahora - 2.1 * HORA,
    },
    {
      id: "MS-005",
      nombre: "Diego Salazar",
      texto:
        "¡Hasta que por fin! 😄 Los mejores deseos para mi hermano y su reina. Salud por ustedes.",
      fecha: ahora - 3 * HORA,
    },
    {
      id: "MS-006",
      nombre: "Grupo Alvarado",
      texto:
        "Un brindis por el comienzo de su historia. Que nunca les falte música para bailar juntos.",
      foto: "/img/m3.jpg",
      fecha: ahora - 4.5 * HORA,
    },
    {
      id: "MS-007",
      nombre: "Regina y José",
      texto: "Con cariño para los novios: que cada día se elijan una y otra vez. ¡Felicidades!",
      fecha: ahora - 6 * HORA,
    },
    {
      id: "MS-008",
      nombre: "Miguel Ángel Torres",
      texto:
        "¡Enhorabuena! Gracias por una noche inolvidable. Se ven felices y se nota que es de verdad.",
      fecha: ahora - 20 * HORA,
    },
  ];
}

/** Genera un id corto para un mensaje nuevo. */
export function nuevoIdMensaje(): string {
  return "MS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Texto tipo "hace un momento / hace 2 h / ayer". */
export function tiempoRelativo(fecha: number, ahora = Date.now()): string {
  const seg = Math.max(0, Math.round((ahora - fecha) / 1000));
  if (seg < 60) return "hace un momento";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.round(hrs / 24);
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/**
 * La compresión vive en `@salones/sync`, junto a `subirArchivo`. Devuelve un
 * **Blob** (antes daba texto), que es lo que permite subir la foto al almacén
 * en vez de meterla dentro del mensaje.
 */
export { comprimirImagen } from "@salones/sync";
