/**
 * MÓDULO "MI MESA" (dentro del portal) — datos y utilidades.
 *
 * Aquí no hay lógica propia: el vocabulario del acomodo (tipos, colecciones,
 * búsqueda, compañeros, ocupación) vive en `@salones/core`, porque quien
 * ESCRIBE esas colecciones es la app del organizador (apps/mesas) y este módulo
 * solo las LEE. Se reexporta para que el componente importe de un solo lugar,
 * igual que los demás módulos del portal.
 */
import type { InvitadoMesa, MesaEvento } from "@salones/core";

export {
  COLECCION_ACOMODO,
  COLECCION_MESAS,
  asientosOcupados,
  buscarEnAcomodo,
  companerosDe,
  mesaDe,
  normalizarAcomodoCrudo,
  normalizarMesasCrudas,
  normalizarNombre,
  porOrdenAcomodo,
} from "@salones/core";
export type { InvitadoMesa, MesaEvento } from "@salones/core";

/* ------------------------------------------------------------------ */
/* Semilla de muestra (solo para el evento "demo")                     */
/* ------------------------------------------------------------------ */

/*
 * MISMA semilla que la app de mesas (`mesasIniciales`/`invitadosIniciales` de
 * apps/mesas), para que la demo cuente una sola historia: la boda de Ana &
 * Rodrigo que ya aparece en la invitación, la trivia y el acomodo del
 * organizador. El `orden` es el índice, igual que cuando apps/mesas siembra su
 * demo local (allá hace `{ ...m, orden: i }` al guardar).
 *
 * SOLO SE MUESTRA cuando el evento es "demo" Y las colecciones llegan vacías;
 * jamás se escribe al almacén — sus ids fijos chocarían con la llave primaria
 * global de `items`, y un evento real nacería con invitados falsos.
 */

export const SEMILLA_MESAS: MesaEvento[] = [
  { id: "M-PRIN", nombre: "Mesa principal", capacidad: 10, orden: 0 },
  { id: "M-NOVIA", nombre: "Familia de la novia", capacidad: 10, orden: 1 },
  { id: "M-NOVIO", nombre: "Familia del novio", capacidad: 10, orden: 2 },
  { id: "M-AMIG", nombre: "Amigos", capacidad: 8, orden: 3 },
  { id: "M-TRAB", nombre: "Compañeros de trabajo", capacidad: 8, orden: 4 },
];

export const SEMILLA_ACOMODO: InvitadoMesa[] = [
  // Mesa principal (novios y más cercanos)
  { id: "G-A001", nombre: "Ana Herrera", asientos: 1, mesaId: "M-PRIN", orden: 0 },
  { id: "G-A002", nombre: "Rodrigo Salazar", asientos: 1, mesaId: "M-PRIN", orden: 1 },
  { id: "G-A003", nombre: "Sofía Herrera (dama)", asientos: 1, mesaId: "M-PRIN", orden: 2 },
  { id: "G-A004", nombre: "Diego Salazar (padrino)", asientos: 1, mesaId: "M-PRIN", orden: 3 },

  // Familia de la novia
  { id: "G-B001", nombre: "Familia Herrera Medina", asientos: 4, mesaId: "M-NOVIA", orden: 4 },
  { id: "G-B002", nombre: "Tía Lucía y Tío Marco", asientos: 2, mesaId: "M-NOVIA", orden: 5 },
  { id: "G-B003", nombre: "Abuela Carmen", asientos: 1, mesaId: "M-NOVIA", orden: 6 },

  // Familia del novio
  { id: "G-C001", nombre: "Familia Salazar Ruiz", asientos: 4, mesaId: "M-NOVIO", orden: 7 },
  { id: "G-C002", nombre: "Regina y José", asientos: 2, mesaId: "M-NOVIO", orden: 8 },

  // Amigos
  { id: "G-D001", nombre: "Valentina Montes", asientos: 1, mesaId: "M-AMIG", orden: 9 },
  { id: "G-D002", nombre: "Carlos y Diana Pérez", asientos: 2, mesaId: "M-AMIG", orden: 10 },
  { id: "G-D003", nombre: "Grupo Alvarado", asientos: 3, mesaId: "M-AMIG", orden: 11 },

  // Aún sin lugar (así se ve cómo avisa el módulo)
  { id: "G-Z001", nombre: "Miguel Ángel Torres", asientos: 1, mesaId: null, orden: 12 },
  { id: "G-Z002", nombre: "Familia Loaiza Ramírez", asientos: 4, mesaId: null, orden: 13 },
  { id: "G-Z003", nombre: "Paola y Andrés", asientos: 2, mesaId: null, orden: 14 },
  { id: "G-Z004", nombre: "Fernanda Ríos", asientos: 1, mesaId: null, orden: 15 },
];

/** Texto amable de lugares: "1 lugar" / "4 lugares". */
export function lugaresTexto(n: number): string {
  return n === 1 ? "1 lugar" : `${n} lugares`;
}
