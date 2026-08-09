/**
 * EXPORTAR A CSV — para que el salón le pase la lista al banquetero.
 *
 * Tres detalles deciden si el archivo sirve de verdad o si el banquetero lo abre
 * y ve un desastre. Los tres están resueltos aquí, y son la razón de que esto no
 * sea un `filas.join(",")` de dos líneas:
 *
 *   1. **El separador.** Excel en español (y en casi toda Latinoamérica y Europa)
 *      espera `;`, no `,`. Con comas mete todo en una sola columna y parece que
 *      el archivo está roto. Se usa `;` y además se escribe la primera línea
 *      `sep=;`, que es la señal que Excel entiende para no dudar.
 *
 *   2. **Los acentos.** Sin la marca de orden de bytes al principio (el "BOM"),
 *      Excel abre el archivo como si fuera de otra codificación y "José" sale
 *      como "JosÃ©". En una lista de invitados mexicanos eso es media lista.
 *
 *   3. **Lo que rompe el formato.** Un nombre con `;`, con comillas o con un
 *      salto de línea parte la fila en dos. Se entrecomilla y se escapa.
 *
 * Google Sheets y LibreOffice abren esto igual de bien.
 */

/** Una columna: su título y cómo sacar el valor de cada fila. */
export type ColumnaCSV<T> = {
  titulo: string;
  valor: (fila: T) => string | number | null | undefined;
};

const SEPARADOR = ";";

/** Deja una celda a salvo del separador, las comillas y los saltos de línea. */
function celda(v: string | number | null | undefined): string {
  const texto = v === null || v === undefined ? "" : String(v);
  if (!/[";\n\r]/.test(texto)) return texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Arma el CSV completo (con la línea `sep=` que Excel necesita). */
export function aCSV<T>(filas: T[], columnas: ColumnaCSV<T>[]): string {
  const lineas = [
    `sep=${SEPARADOR}`,
    columnas.map((c) => celda(c.titulo)).join(SEPARADOR),
    ...filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(SEPARADOR)),
  ];
  // Fin de línea de Windows: es lo que espera Excel y no molesta a nadie más.
  return lineas.join("\r\n");
}

/**
 * Baja el CSV como archivo. Lleva el BOM delante (ver el punto 2 de arriba) y
 * el nombre saneado, porque suele venir del nombre del evento.
 */
export function descargarCSV(nombreArchivo: string, contenido: string): void {
  if (typeof window === "undefined") return;
  const limpio = (nombreArchivo || "datos").replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
  const BOM = "﻿";
  const blob = new Blob([BOM + contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = limpio.endsWith(".csv") ? limpio : `${limpio}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
