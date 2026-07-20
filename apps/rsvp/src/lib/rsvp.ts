/**
 * Datos y utilidades de la app de RSVP (confirmación de asistencia).
 *
 * El organizador administra la lista de invitados (guardada en el dispositivo).
 * A cada invitado le comparte un enlace para confirmar; la respuesta se guarda
 * y el tablero se actualiza. Todo editable aquí.
 */
import { EstadoRSVP } from "@salones/core";

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  fechaLimite: "1 de marzo de 2027",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

/** Estado de confirmación (usa el vocabulario común de @salones/core). */
export type Estado = (typeof EstadoRSVP)[keyof typeof EstadoRSVP];
export { EstadoRSVP };

export type Invitado = {
  id: string;
  nombre: string;
  cupos: number; // cuántas personas caben en esta invitación
};

export type Respuesta = { estado: Estado; personas: number };

/**
 * Evento compartido y colección de respuestas para @salones/sync. Las respuestas
 * de los invitados llegan al tablero del anfitrión: en local, entre pestañas;
 * con el servicio gestionado, desde el teléfono de cada invitado.
 */
export const EVENTO_ID = "demo";
export const COLECCION_RESPUESTAS = "respuestas";

/**
 * Una respuesta como item sincronizable (lleva el id del invitado).
 *
 * `nombre` y `fecha` los añade el PORTAL cuando alguien confirma con el enlace
 * general del evento (sin invitación personal): ahí el id no está en esta lista,
 * así que el nombre es lo único que identifica a quien contestó. Son opcionales;
 * las respuestas de siempre siguen llegando igual.
 */
export type RespuestaItem = Respuesta & { id: string; nombre?: string; fecha?: number };

/** Lista de ejemplo (editable / borrable desde la app). */
export const invitadosIniciales: Invitado[] = [
  { id: "IN-1042", nombre: "Ana Herrera Medina", cupos: 2 },
  { id: "IN-1043", nombre: "Rodrigo Salazar Ruiz", cupos: 2 },
  { id: "IN-2087", nombre: "Familia Loaiza Ramírez", cupos: 4 },
  { id: "IN-2091", nombre: "Valentina Montes", cupos: 1 },
  { id: "IN-2104", nombre: "Grupo Alvarado", cupos: 3 },
  { id: "IN-2115", nombre: "Carlos y Diana Pérez", cupos: 2 },
  { id: "IN-2151", nombre: "Miguel Ángel Torres", cupos: 2 },
  { id: "IN-2168", nombre: "Regina y José", cupos: 2 },
];

/** Respuestas de ejemplo, para que el tablero luzca con datos desde el inicio. */
export const respuestasIniciales: Record<string, Respuesta> = {
  "IN-1042": { estado: EstadoRSVP.Confirmado, personas: 2 },
  "IN-2087": { estado: EstadoRSVP.Confirmado, personas: 3 },
  "IN-2115": { estado: EstadoRSVP.Confirmado, personas: 2 },
  "IN-2151": { estado: EstadoRSVP.Rechazado, personas: 0 },
};

export function nuevoId(existentes: Invitado[]): string {
  const usados = new Set(existentes.map((i) => i.id));
  let id = "";
  do {
    id = "IN-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (usados.has(id));
  return id;
}

/** Empaqueta un invitado en el enlace para confirmar (sin servidor). */
export function codificar(inv: Invitado): string {
  return btoa(encodeURIComponent(JSON.stringify(inv)));
}

export function decodificar(datos: string): Invitado | null {
  try {
    const obj = JSON.parse(decodeURIComponent(atob(datos)));
    if (obj && typeof obj.id === "string" && typeof obj.nombre === "string") {
      return obj as Invitado;
    }
    return null;
  } catch {
    return null;
  }
}

export const etiquetaEstado: Record<Estado, string> = {
  [EstadoRSVP.Pendiente]: "Pendiente",
  [EstadoRSVP.Confirmado]: "Confirmó",
  [EstadoRSVP.Rechazado]: "No asiste",
};
