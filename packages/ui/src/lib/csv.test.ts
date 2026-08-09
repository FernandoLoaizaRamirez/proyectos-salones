import { describe, it, expect } from "vitest";
import { aCSV, type ColumnaCSV } from "./csv";

/**
 * PRUEBAS DEL CSV — el archivo que el salón le pasa al banquetero.
 *
 * Lo que se comprueba aquí no es que "genere un csv": es que se ABRA BIEN. Los
 * tres fallos clásicos son silenciosos —el archivo existe y parece correcto
 * hasta que alguien lo abre— y los tres arruinan la lista:
 *
 *   · separador equivocado  → todo en una sola columna;
 *   · acentos               → "José" sale como "JosÃ©" (media lista mexicana);
 *   · celdas sin escapar    → un nombre con `;` parte la fila en dos.
 */

type Fila = { nombre: string; cupos: number; estado: string };

const COLUMNAS: ColumnaCSV<Fila>[] = [
  { titulo: "Invitado", valor: (f) => f.nombre },
  { titulo: "Cupos", valor: (f) => f.cupos },
  { titulo: "Estado", valor: (f) => f.estado },
];

const lineas = (csv: string) => csv.split("\r\n");

describe("aCSV — que Excel lo abra bien", () => {
  it("empieza con la señal que Excel necesita para no meter todo en una columna", () => {
    const csv = aCSV([], COLUMNAS);
    expect(lineas(csv)[0]).toBe("sep=;");
  });

  it("usa punto y coma, que es lo que espera Excel en español", () => {
    const csv = aCSV([{ nombre: "Ana", cupos: 2, estado: "Confirmado" }], COLUMNAS);
    expect(lineas(csv)[1]).toBe("Invitado;Cupos;Estado");
    expect(lineas(csv)[2]).toBe("Ana;2;Confirmado");
  });

  it("un nombre con punto y coma NO parte la fila", () => {
    // Sin comillas, "Pérez; Ana" se leería como dos columnas y la lista entera
    // se descuadraría a partir de ahí.
    const csv = aCSV([{ nombre: "Pérez; Ana", cupos: 1, estado: "Pendiente" }], COLUMNAS);
    expect(lineas(csv)[2]).toBe('"Pérez; Ana";1;Pendiente');
    expect(lineas(csv)).toHaveLength(3);
  });

  it("las comillas dentro de un nombre se escapan", () => {
    const csv = aCSV([{ nombre: 'Ana "La Güera"', cupos: 1, estado: "Confirmado" }], COLUMNAS);
    expect(lineas(csv)[2]).toBe('"Ana ""La Güera""";1;Confirmado');
  });

  it("un salto de línea dentro de una celda no rompe el archivo", () => {
    const csv = aCSV([{ nombre: "Ana\nGarcía", cupos: 1, estado: "Confirmado" }], COLUMNAS);
    // La celda va entrecomillada, así que el salto queda DENTRO de ella.
    expect(csv).toContain('"Ana\nGarcía"');
    expect(lineas(csv)[0]).toBe("sep=;");
  });

  it("los acentos y las eñes se conservan tal cual", () => {
    const csv = aCSV([{ nombre: "José Muñoz Ibáñez", cupos: 3, estado: "Confirmado" }], COLUMNAS);
    expect(csv).toContain("José Muñoz Ibáñez");
  });

  it("los vacíos salen vacíos, no como 'null' ni 'undefined'", () => {
    const columnas: ColumnaCSV<{ x: null }>[] = [
      { titulo: "A", valor: () => null },
      { titulo: "B", valor: () => undefined },
      { titulo: "C", valor: () => 0 },
    ];
    expect(lineas(aCSV([{ x: null }], columnas))[2]).toBe(";;0");
  });

  it("sin invitados sale solo la cabecera (no un archivo vacío que asuste)", () => {
    expect(lineas(aCSV([], COLUMNAS))).toEqual(["sep=;", "Invitado;Cupos;Estado"]);
  });

  it("los saltos de línea entre filas son los de Windows, que es lo que espera Excel", () => {
    const csv = aCSV(
      [
        { nombre: "Ana", cupos: 1, estado: "Confirmado" },
        { nombre: "Beto", cupos: 2, estado: "Pendiente" },
      ],
      COLUMNAS,
    );
    expect(csv.split("\r\n")).toHaveLength(4);
    expect(csv).not.toMatch(/[^\r]\n/);
  });
});
