import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * EL CANDADO DE SOBRESCRITURA TIENE QUE SEGUIR EN LAS MIGRACIONES (0016).
 * ---------------------------------------------------------------------------
 * Hermana de `migraciones-cortes.test.ts`, y por el mismo motivo: lee los
 * ARCHIVOS, así que corre sin Supabase, no se salta nunca y pone el CI en rojo
 * si alguien borra el candado o lo deshace en una migración posterior.
 *
 * Lo que vigila, y por qué cada cosa importa (todo medido contra producción el
 * 9 ago 2026, con un pase de invitado normal, antes de escribir la 0016):
 *
 *   · LA IDENTIDAD DE LA FILA. Cambiarle la `coleccion` a una fila la hace
 *     desaparecer de todas las pantallas, porque todo se consulta filtrando por
 *     evento + colección. Eso es un borrado con otro nombre: rodea el candado
 *     de la 0009 sin romperlo. Salía HTTP 200.
 *
 *   · LAS CUATRO COLECCIONES DE SOLO AÑADIR. Una sola petición PATCH filtrada
 *     por colección —sin nombrar ni un id— dejaba en blanco todas sus filas de
 *     golpe. En una boda: el álbum entero y el muro entero, de una vez.
 *
 *   · QUE LA LISTA BLANCA SIGA SIENDO DE SEIS. Si alguien añade una séptima sin
 *     discutirlo, esta prueba se pone roja. No es que las seis estén bien: es
 *     que están abiertas por una razón concreta (las pantallas de organizador
 *     que las usan trabajan con pase de invitado) y esa razón hay que
 *     desmontarla con código, no ampliando la lista.
 */

const MIGRACIONES = join(__dirname, "..", "..", "supabase", "migrations");
const NOMBRE = "0016_candado_sobrescritura.sql";

/** El SQL que de verdad se ejecuta: sin las líneas comentadas. */
function sqlActivo(archivo: string): string {
  return readFileSync(join(MIGRACIONES, archivo), "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
}

/** Las seis colecciones que un invitado SÍ puede reescribir, y por qué. */
const LISTA_BLANCA = ["canciones", "respuestas", "mesas", "acomodo", "pases", "accesos"];

/** Las cuatro que pasan a ser de solo añadir: es donde vive el recuerdo. */
const CERRADAS = ["fotos", "mensajes", "brindis", "ranking"];

describe("El candado de sobrescritura vive en las migraciones (0016)", () => {
  it("la migración existe", () => {
    expect(readdirSync(MIGRACIONES)).toContain(NOMBRE);
  });

  it("engancha un disparador ANTES de actualizar `items`", () => {
    // Sin el disparador, la tabla y la función no hacen absolutamente nada.
    // Es el único paso que cambia el comportamiento y va el último del archivo.
    expect(sqlActivo(NOMBRE)).toMatch(
      /create\s+trigger\s+trg_items_candado_sobrescritura[\s\S]{0,120}before\s+update\s+on\s+items/i,
    );
  });

  it("congela la identidad de la fila (id, coleccion, creado…)", () => {
    const sql = sqlActivo(NOMBRE);
    for (const col of ["id", "evento", "coleccion", "module", "creado", "tenant_id"]) {
      expect(sql, `no vigila la columna ${col}`).toMatch(
        new RegExp(`new\\.${col}\\s+is\\s+distinct\\s+from\\s+old\\.${col}`, "i"),
      );
    }
  });

  it("dice que NO de forma honesta: 403, no un 200 vacío", () => {
    // Es la lección del 204 del borrado. Una política que rechaza por su
    // cláusula `using` devuelve 200 con cero filas: el ataque parece haber
    // funcionado y nadie se entera. 42501 lo traduce PostgREST a un 403.
    const sql = sqlActivo(NOMBRE);
    expect(sql).toMatch(/raise\s+exception/i);
    expect(sql).toMatch(/errcode\s*=\s*'42501'/);
  });

  it("el anfitrión y la llave de servicio siguen pudiendo moderar", () => {
    const sql = sqlActivo(NOMBRE);
    expect(sql, "el anfitrión quedaría bloqueado y la moderación moriría").toMatch(
      /evento_del_pase_anfitrion/,
    );
    expect(sql, "una Edge Function chocaría contra el candado").toMatch(/service_role/);
  });

  it("la lista blanca es EXACTAMENTE de seis, las conocidas", () => {
    // Se acota al bloque del `insert`. Buscar `('algo',` por todo el archivo
    // engancharía también el `current_user in ('service_role', …)` de más
    // abajo, y la prueba se pondría roja o verde por el motivo equivocado.
    const sql = sqlActivo(NOMBRE);
    const desde = sql.indexOf("insert into items_reescribibles");
    expect(desde, "no se encuentra el insert de la lista blanca").toBeGreaterThan(-1);
    const bloque = sql.slice(desde, sql.indexOf(";", desde));
    const apuntadas = [...bloque.matchAll(/\(\s*'([a-z-]+)'\s*,/g)].map((m) => m[1]);
    expect([...apuntadas].sort()).toEqual([...LISTA_BLANCA].sort());
  });

  it("las cuatro colecciones del recuerdo NO están en la lista blanca", () => {
    const sql = sqlActivo(NOMBRE);
    for (const col of CERRADAS) {
      expect(sql, `${col} quedó abierta: se puede vaciar de una petición`).not.toMatch(
        new RegExp(`\\(\\s*'${col}'\\s*,`),
      );
    }
  });

  it("la lista blanca está cerrada al público", () => {
    // Si `items_reescribibles` se pudiera escribir desde el navegador, abrirse
    // una colección sería un insert y el candado entero no valdría nada.
    expect(sqlActivo(NOMBRE)).toMatch(
      /alter\s+table\s+items_reescribibles\s+enable\s+row\s+level\s+security/i,
    );
  });

  it("NINGUNA migración posterior desengancha el candado ni abre una colección", () => {
    const posteriores = readdirSync(MIGRACIONES)
      .filter((f) => f.endsWith(".sql") && f > NOMBRE)
      .sort();

    for (const archivo of posteriores) {
      const sql = sqlActivo(archivo);
      expect(sql, `${archivo} quita el disparador del candado`).not.toMatch(
        /drop\s+trigger\s+if\s+exists\s+trg_items_candado_sobrescritura\s+on\s+items\s*;(?![\s\S]{0,400}create\s+trigger\s+trg_items_candado_sobrescritura)/i,
      );
      for (const col of CERRADAS) {
        expect(sql, `${archivo} vuelve a abrir "${col}" a los invitados`).not.toMatch(
          new RegExp(`items_reescribibles[\\s\\S]{0,400}'${col}'`, "i"),
        );
      }
    }
  });
});
