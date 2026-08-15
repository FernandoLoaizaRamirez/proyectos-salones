import { describe, it, expect } from "vitest";
import {
  asientosOcupados,
  buscarEnAcomodo,
  companerosDe,
  mesaDe,
  normalizarAcomodoCrudo,
  normalizarMesasCrudas,
  normalizarNombre,
  type InvitadoMesa,
  type MesaEvento,
} from "./index";

/*
 * Un acomodo de ejemplo como el que escribe apps/mesas: dos mesas y cinco
 * invitados, uno todavía sin lugar. El `orden` viene revuelto a propósito,
 * porque del servidor las filas llegan de lo más nuevo a lo más viejo.
 */
const mesas: MesaEvento[] = [
  { id: "M-PRIN", nombre: "Mesa principal", capacidad: 10, orden: 1 },
  { id: "M-AMIG", nombre: "Amigos", capacidad: 8, orden: 2 },
];

const ana: InvitadoMesa = { id: "G-1", nombre: "Ana Herrera", asientos: 1, mesaId: "M-PRIN", orden: 3 };
const miguel: InvitadoMesa = { id: "G-5", nombre: "Miguel Ángel Torres", asientos: 1, mesaId: null, orden: 5 };

const invitados: InvitadoMesa[] = [
  ana,
  { id: "G-2", nombre: "Rodrigo Salazar", asientos: 1, mesaId: "M-PRIN", orden: 1 },
  { id: "G-3", nombre: "Familia Núñez", asientos: 4, mesaId: "M-PRIN", orden: 2 },
  { id: "G-4", nombre: "Valentina Montes", asientos: 1, mesaId: "M-AMIG", orden: 4 },
  miguel,
];

describe("normalizarNombre: buscar sin pelearse con el teclado", () => {
  it("quita acentos, mayúsculas y espacios de sobra", () => {
    expect(normalizarNombre("  Núñez  ")).toBe("nunez");
    expect(normalizarNombre("MIGUEL ÁNGEL")).toBe("miguel angel");
    expect(normalizarNombre("José Pérez")).toBe("jose perez");
  });

  it("una cadena de puros espacios queda vacía", () => {
    expect(normalizarNombre("   ")).toBe("");
  });
});

describe("buscarEnAcomodo: como en '¿En qué mesa me toca?'", () => {
  it("encuentra por subcadena, sin importar acentos ni mayúsculas", () => {
    // El invitado teclea "nunez" a secas y tiene que dar con "Núñez".
    expect(buscarEnAcomodo("nunez", invitados).map((i) => i.id)).toEqual(["G-3"]);
    expect(buscarEnAcomodo("ANGEL", invitados).map((i) => i.id)).toEqual(["G-5"]);
    // Subcadena de en medio, no solo el inicio del nombre.
    expect(buscarEnAcomodo("errera", invitados).map((i) => i.id)).toEqual(["G-1"]);
  });

  it("consulta vacía (o de puros espacios) no enseña nada", () => {
    expect(buscarEnAcomodo("", invitados)).toEqual([]);
    expect(buscarEnAcomodo("   ", invitados)).toEqual([]);
  });

  it("a lo más 8 resultados: más que eso ya es leerse la lista entera", () => {
    const muchos: InvitadoMesa[] = Array.from({ length: 20 }, (_, i) => ({
      id: `G-${i}`,
      nombre: `Invitado ${i}`,
      asientos: 1,
      mesaId: null,
    }));
    expect(buscarEnAcomodo("invitado", muchos)).toHaveLength(8);
  });
});

describe("la mesa del invitado y sus compañeros", () => {
  it("mesaDe encuentra la mesa asignada", () => {
    expect(mesaDe(ana, mesas)?.nombre).toBe("Mesa principal");
  });

  it("sin lugar asignado (o con una mesa que ya no existe) devuelve null", () => {
    expect(mesaDe(miguel, mesas)).toBeNull();
    const fantasma: InvitadoMesa = { id: "G-9", nombre: "Colado", asientos: 1, mesaId: "M-BORRADA" };
    expect(mesaDe(fantasma, mesas)).toBeNull();
  });

  it("companerosDe: la misma mesa, sin el propio invitado y en el orden del acomodo", () => {
    // Ana (orden 3) comparte la principal con Rodrigo (1) y los Núñez (2).
    expect(companerosDe(ana, invitados).map((i) => i.id)).toEqual(["G-2", "G-3"]);
  });

  it("sin mesa asignada no hay compañeros que enseñar", () => {
    expect(companerosDe(miguel, invitados)).toEqual([]);
  });

  it("asientosOcupados suma los lugares, y una familia cuenta por los suyos", () => {
    // Ana (1) + Rodrigo (1) + Familia Núñez (4).
    expect(asientosOcupados("M-PRIN", invitados)).toBe(6);
    expect(asientosOcupados("M-AMIG", invitados)).toBe(1);
    expect(asientosOcupados("M-VACIA", invitados)).toBe(0);
  });

  it("asientos raros cuentan al menos como 1 (igual que en apps/mesas)", () => {
    const raros: InvitadoMesa[] = [{ id: "G-0", nombre: "Solo", asientos: 0, mesaId: "M-X" }];
    expect(asientosOcupados("M-X", raros)).toBe(1);
  });
});

describe("filas crudas de la colección: se filtran, nunca lanzan", () => {
  /*
   * EL FALLO QUE ESTO VIGILA: dar de alta filas sigue abierto a cualquiera con
   * el enlace (migración 0016), así que la colección puede traer basura. Una
   * fila colada se descarta; las buenas se pintan.
   */
  it("normalizarMesasCrudas descarta lo malformado y coacciona lo salvable", () => {
    const crudas: unknown[] = [
      { id: "M-1", nombre: "Mesa 1", capacidad: 8, orden: 1 },
      { id: "M-2", nombre: "Mesa 2", capacidad: "diez" }, // capacidad rara → 1
      { id: "M-3", nombre: "Mesa 3", capacidad: -5 }, // negativa → 1
      { id: 42, nombre: "Sin id de texto" }, // se descarta
      { nombre: "Sin id" }, // se descarta
      "💥", // se descarta
      null, // se descarta
    ];
    const mesasLimpias = normalizarMesasCrudas(crudas);
    expect(mesasLimpias.map((m) => m.id)).toEqual(["M-1", "M-2", "M-3"]);
    expect(mesasLimpias.map((m) => m.capacidad)).toEqual([8, 1, 1]);
    expect(mesasLimpias.map((m) => m.orden)).toEqual([1, undefined, undefined]);
  });

  it("normalizarAcomodoCrudo: mesaId que no sea texto = aún sin sentar", () => {
    const crudas: unknown[] = [
      { id: "G-1", nombre: "Ana", asientos: 2, mesaId: "M-1", orden: 7 },
      { id: "G-2", nombre: "Rodrigo", asientos: "dos", mesaId: null }, // asientos raros → 1
      { id: "G-3", nombre: "Colado", asientos: 1, mesaId: 42 }, // mesaId basura → null
      { id: "G-4" }, // sin nombre: se descarta
      [], // se descarta
    ];
    const limpios = normalizarAcomodoCrudo(crudas);
    expect(limpios.map((i) => i.id)).toEqual(["G-1", "G-2", "G-3"]);
    expect(limpios[0]).toEqual({ id: "G-1", nombre: "Ana", asientos: 2, mesaId: "M-1", orden: 7 });
    expect(limpios.map((i) => i.asientos)).toEqual([2, 1, 1]);
    expect(limpios.map((i) => i.mesaId)).toEqual(["M-1", null, null]);
  });

  it("con una lista de pura basura devuelven vacío, no una excepción", () => {
    expect(() => normalizarMesasCrudas([null, 1, "x", {}])).not.toThrow();
    expect(normalizarMesasCrudas([null, 1, "x", {}])).toEqual([]);
    expect(normalizarAcomodoCrudo([undefined, true, {}])).toEqual([]);
  });
});
