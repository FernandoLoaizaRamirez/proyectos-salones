/**
 * Datos del evento + utilidades de los PASES CON QR.
 *
 * La lista de invitados ya NO vive aquí fija: se administra dentro de la app
 * (agregar / editar / borrar) y se guarda en el dispositivo (localStorage),
 * con opción de exportar/importar. Aquí quedan los datos del evento, la lista
 * inicial de ejemplo y las funciones para generar y leer los pases.
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  fechaCorta: "20 mar 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

export type Tipo = "General" | "VIP";

export type Invitado = {
  id: string; // token único que va dentro del QR
  nombre: string;
  mesa: string;
  personas: number;
  tipo: Tipo;
};

/** Lista de ejemplo (se puede borrar y crear la real desde la app). */
export const invitadosIniciales: Invitado[] = [
  { id: "SR-1042", nombre: "Ana Herrera Medina", mesa: "1", personas: 2, tipo: "VIP" },
  { id: "SR-1043", nombre: "Rodrigo Salazar Ruiz", mesa: "1", personas: 2, tipo: "VIP" },
  { id: "SR-2087", nombre: "Familia Loaiza Ramírez", mesa: "4", personas: 4, tipo: "General" },
  { id: "SR-2091", nombre: "Valentina Montes", mesa: "6", personas: 1, tipo: "General" },
  { id: "SR-2104", nombre: "Grupo Alvarado", mesa: "8", personas: 3, tipo: "General" },
  { id: "SR-2115", nombre: "Carlos y Diana Pérez", mesa: "5", personas: 2, tipo: "General" },
  { id: "SR-2151", nombre: "Miguel Ángel Torres", mesa: "3", personas: 2, tipo: "VIP" },
  { id: "SR-2168", nombre: "Regina y José", mesa: "7", personas: 2, tipo: "General" },
];

/** Texto que se guarda dentro del código QR del pase. */
export function contenidoQR(inv: Invitado): string {
  return `PASE-SR:${inv.id}`;
}

/** Extrae el id del pase a partir del texto leído por el escáner. */
export function idDesdeQR(texto: string): string | null {
  const m = texto.trim().match(/^PASE-SR:(.+)$/);
  return m ? (m[1] ?? null) : null;
}

/** Genera un id de pase corto y único, no repetido con los existentes. */
export function nuevoId(existentes: Invitado[]): string {
  const usados = new Set(existentes.map((i) => i.id));
  let id = "";
  do {
    id = "SR-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (usados.has(id));
  return id;
}

/** Empaqueta un invitado para compartir su pase por un enlace (sin servidor). */
export function codificarPase(inv: Invitado): string {
  return btoa(encodeURIComponent(JSON.stringify(inv)));
}

/** Recupera el invitado desde el enlace del pase. */
export function decodificarPase(datos: string): Invitado | null {
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
