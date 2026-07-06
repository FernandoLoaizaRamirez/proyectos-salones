/**
 * Datos del evento y su lista de invitados para los PASES CON QR.
 *
 * Cada invitado tiene un pase con un código QR único. En la entrada se escanea
 * el QR (o se marca en la lista) para controlar el acceso. Todo editable aquí.
 *
 * NOTA: al no haber servidor, el estado de "ingresó" se guarda en el propio
 * dispositivo (localStorage). Para un evento real con varias entradas a la vez
 * se conectaría a un backend compartido; el diseño ya queda listo para eso.
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

export type Invitado = {
  id: string; // token único que va dentro del QR
  nombre: string;
  mesa: string;
  personas: number; // cuántas personas entran con este pase
  tipo: "General" | "VIP";
};

export const invitados: Invitado[] = [
  { id: "SR-1042", nombre: "Ana Herrera Medina", mesa: "1", personas: 2, tipo: "VIP" },
  { id: "SR-1043", nombre: "Rodrigo Salazar Ruiz", mesa: "1", personas: 2, tipo: "VIP" },
  { id: "SR-2087", nombre: "Familia Loaiza Ramírez", mesa: "4", personas: 4, tipo: "General" },
  { id: "SR-2091", nombre: "Valentina Montes", mesa: "6", personas: 1, tipo: "General" },
  { id: "SR-2104", nombre: "Grupo Alvarado", mesa: "8", personas: 3, tipo: "General" },
  { id: "SR-2115", nombre: "Carlos y Diana Pérez", mesa: "5", personas: 2, tipo: "General" },
  { id: "SR-2130", nombre: "Sofía Beltrán", mesa: "6", personas: 1, tipo: "General" },
  { id: "SR-2146", nombre: "Familia Castro", mesa: "9", personas: 5, tipo: "General" },
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

export function buscarInvitado(id: string): Invitado | undefined {
  return invitados.find((i) => i.id === id);
}

/** Total de personas esperadas (suma de todos los pases). */
export const totalPersonas = invitados.reduce((s, i) => s + i.personas, 0);
