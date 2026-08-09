import { describe, it, expect } from "vitest";
import {
  porOrden,
  nuevoIdMesa,
  nuevoIdInvitado,
  validarAcomodo,
  codificarAcomodo,
  decodificarAcomodo,
  COLECCION_MESAS,
  COLECCION_ACOMODO,
  mesasIniciales,
  invitadosIniciales,
  type Mesa,
  type Invitado,
} from "../../apps/mesas/src/lib/mesas";

/**
 * PRUEBAS DEL ACOMODO DE MESAS (`apps/mesas/src/lib/mesas.ts`).
 * ---------------------------------------------------------------------------
 * El acomodo dejó de vivir en dos llaves de una tablet y pasó al evento
 * (@salones/sync). Ese cambio trae dos riesgos nuevos, y son los que se vigilan
 * aquí:
 *
 *   1. EL ORDEN. Un almacén central devuelve las filas como quiera. Sin un
 *      criterio propio, las mesas bailarían de sitio en cada refresco delante de
 *      quien está acomodando.
 *   2. LOS IDENTIFICADORES. Antes se numeraban mirando la lista que había en
 *      pantalla ("la siguiente es la 6"). Con dos personas acomodando a la vez,
 *      las dos verían la 5 y las dos crearían la 6: una pisaría a la otra.
 */

const mesa = (nombre: string, orden?: number): Mesa => ({
  id: `m-${nombre}`,
  nombre,
  capacidad: 10,
  ...(orden === undefined ? {} : { orden }),
});

describe("porOrden: las mesas no bailan solas", () => {
  it("respeta el orden guardado, no el que llegue del servidor", () => {
    const desordenadas = [mesa("Rosa", 2), mesa("Azul", 0), mesa("Verde", 1)];
    expect([...desordenadas].sort(porOrden).map((m) => m.nombre)).toEqual([
      "Azul",
      "Verde",
      "Rosa",
    ]);
  });

  it("lo que no tiene orden se va al final, nunca se pierde", () => {
    const mezcla = [mesa("Sin orden"), mesa("Primera", 0)];
    expect([...mezcla].sort(porOrden).map((m) => m.nombre)).toEqual(["Primera", "Sin orden"]);
  });

  it("con el mismo orden desempata por nombre, siempre igual", () => {
    // Dos mesas creadas en el mismo milisegundo comparten `orden`. Si el
    // desempate no fuera estable, saltarían entre ellas en cada refresco.
    const empate = [mesa("Zafiro", 5), mesa("Ámbar", 5)];
    const unaVez = [...empate].sort(porOrden).map((m) => m.nombre);
    const otraVez = [...empate].reverse().sort(porOrden).map((m) => m.nombre);
    expect(unaVez).toEqual(otraVez);
  });

  it("ordena 'Mesa 10' después de 'Mesa 9', como cuenta una persona", () => {
    const numeradas = [mesa("Mesa 10"), mesa("Mesa 9"), mesa("Mesa 2")];
    expect([...numeradas].sort(porOrden).map((m) => m.nombre)).toEqual([
      "Mesa 2",
      "Mesa 9",
      "Mesa 10",
    ]);
  });
});

describe("identificadores: dos tablets no chocan", () => {
  it("no repite aunque se creen muchos de golpe", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 2000; i++) ids.add(nuevoIdMesa([]));
    expect(ids.size).toBe(2000);
  });

  it("mesas e invitados no se pisan entre sí", () => {
    const deMesa = nuevoIdMesa([]);
    const deInvitado = nuevoIdInvitado([]);
    expect(deMesa.startsWith("M-")).toBe(true);
    expect(deInvitado.startsWith("G-")).toBe(true);
  });

  it("no reutiliza un id que ya existe en la lista", () => {
    const existentes: Mesa[] = Array.from({ length: 50 }, () => mesa(nuevoIdMesa([])));
    const nuevo = nuevoIdMesa(existentes);
    expect(existentes.some((m) => m.id === nuevo)).toBe(false);
  });
});

describe("el acomodo que se comparte por enlace", () => {
  it("el invitado ve las mesas en el mismo orden que las puso el salón", () => {
    // El enlace guarda el orden en la POSICIÓN, no en un número (así el QR
    // cabe). Lo que hay que asegurar no es que el número sobreviva, sino que la
    // SECUENCIA sí — y que al ordenarla al otro lado no salga alfabética.
    const original = {
      v: 1 as const,
      evento: { nombre: "Ana & Rodrigo", fecha: "2026-09-12", lugar: "Salón Aurora" },
      mesas: [mesa("Rosa", 7), mesa("Azul", 3), mesa("Ámbar", 9)],
      invitados: [
        { id: "G-1", nombre: "Lucía", asientos: 1, mesaId: "m-Rosa", orden: 4 } as Invitado,
        { id: "G-2", nombre: "Andrés", asientos: 2, mesaId: "m-Azul", orden: 1 } as Invitado,
      ],
    };
    const vuelta = decodificarAcomodo(codificarAcomodo(original));
    expect([...(vuelta?.mesas ?? [])].sort(porOrden).map((m) => m.nombre)).toEqual([
      "Rosa",
      "Azul",
      "Ámbar",
    ]);
    expect([...(vuelta?.invitados ?? [])].sort(porOrden).map((g) => g.nombre)).toEqual([
      "Lucía",
      "Andrés",
    ]);
    // Y cada quien sigue en su mesa.
    expect(vuelta?.invitados[0]?.mesaId).toBe(vuelta?.mesas[0]?.id);
  });

  it("acepta un acomodo viejo, sin orden, sin romperse", () => {
    const viejo = {
      v: 1,
      evento: { nombre: "Boda", fecha: "2026-01-01", lugar: "Salón" },
      mesas: [{ id: "m1", nombre: "Uno", capacidad: 8 }],
      invitados: [{ id: "g1", nombre: "Pedro", asientos: 2, mesaId: "m1" }],
    };
    const ok = validarAcomodo(viejo);
    expect(ok).not.toBeNull();
    expect(ok?.mesas[0]?.orden).toBeUndefined();
  });

  it("rechaza lo que no es un acomodo", () => {
    expect(validarAcomodo({ v: 1, mesas: "no soy una lista" })).toBeNull();
    expect(decodificarAcomodo("basura-que-no-es-base64")).toBeNull();
  });
});

describe("las dos cajas del evento", () => {
  it("no se llaman igual", () => {
    expect(COLECCION_MESAS).not.toBe(COLECCION_ACOMODO);
  });

  it("los ejemplos siguen cuadrando entre sí", () => {
    // Se siembran solo en la demo local, pero si un invitado de ejemplo
    // apuntara a una mesa inexistente, la demo abriría rota.
    const idsDeMesa = new Set(mesasIniciales.map((m) => m.id));
    const huerfanos = invitadosIniciales.filter((g) => g.mesaId && !idsDeMesa.has(g.mesaId));
    expect(huerfanos).toEqual([]);
  });
});
