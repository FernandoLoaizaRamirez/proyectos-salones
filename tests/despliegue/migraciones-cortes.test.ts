import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * EL REPOSITORIO TIENE QUE PODER RECONSTRUIR LA BASE **SEGURA**.
 * ---------------------------------------------------------------------------
 * Los tres cortes de seguridad (borrar solo el anfitrión, subir solo con permiso
 * firmado, ver solo con dirección firmada) se corrieron a mano en el proyecto en
 * vivo el 24 jul 2026 y se quedaron COMENTADOS en las migraciones. Durante ocho
 * archivos, `supabase/migrations/` describió la base INSEGURA: quien recreara el
 * proyecto desde aquí —un segundo salón, una copia de pruebas, una recuperación
 * tras un desastre— obtenía una base con los tres agujeros abiertos.
 *
 * La `0014` los deja escritos y ejecutables. Estas pruebas son el candado para
 * que no se vuelvan a perder: corren SIN Supabase (leen los archivos), así que
 * nunca se saltan y ponen el CI en rojo si alguien borra la 0014 o vuelve a
 * comentar un corte.
 */

const MIGRACIONES = join(__dirname, "..", "..", "supabase", "migrations");

/** El SQL que de verdad se ejecuta: sin las líneas comentadas. */
function sqlActivo(archivo: string): string {
  return readFileSync(join(MIGRACIONES, archivo), "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
}

describe("Los tres cortes viven en las migraciones, no solo en producción", () => {
  const NOMBRE = "0014_cortes_aplicados.sql";

  it("la migración de los cortes existe", () => {
    expect(readdirSync(MIGRACIONES)).toContain(NOMBRE);
  });

  it("CORTE 2 · quita la regla que dejaba subir a cualquiera", () => {
    expect(sqlActivo(NOMBRE)).toMatch(
      /drop\s+policy\s+if\s+exists\s+"subida publica media"\s+on\s+storage\.objects/i,
    );
  });

  it("CORTE 3 · deja el almacén PRIVADO", () => {
    const sql = sqlActivo(NOMBRE);
    expect(sql).toMatch(/update\s+storage\.buckets\s+set\s+public\s*=\s*false\s+where\s+id\s*=\s*'media'/i);
    // Y no puede quedarse la línea contraria activa por un despiste.
    expect(sql).not.toMatch(/update\s+storage\.buckets\s+set\s+public\s*=\s*true/i);
  });

  it("CORTE 1 · BORRAR exige el pase de ANFITRIÓN, y solo ese", () => {
    const sql = sqlActivo(NOMBRE);
    const borrado = sql.slice(sql.indexOf('create policy "borrado por evento"'));
    const hastaElPuntoYComa = borrado.slice(0, borrado.indexOf(";") + 1);

    expect(hastaElPuntoYComa).toContain("for delete");
    expect(hastaElPuntoYComa).toContain("evento_del_pase_anfitrion");
    // Si aceptara también el pase de invitado o el encabezado crudo, cualquiera
    // podría vaciar la boda: es justo el agujero que cierra este corte.
    expect(hastaElPuntoYComa).not.toMatch(/evento_del_pase\(/);
    expect(hastaElPuntoYComa).not.toMatch(/'x-evento'/);
  });

  it("CORTE 1 · el encabezado crudo `x-evento` ya no abre nada", () => {
    // Las 4 políticas de `items` que deja la 0014 solo miran pases firmados.
    expect(sqlActivo(NOMBRE)).not.toMatch(/->>\s*'x-evento'/);
  });

  it("NINGUNA migración posterior vuelve a abrir lo que la 0014 cerró", () => {
    // Lo que importa no es que la 0014 sea la última —irán llegando más—, sino
    // que ninguna de las que vengan después deshaga un corte sin querer. Este
    // caso es el que avisaría de eso.
    const posteriores = readdirSync(MIGRACIONES)
      .filter((f) => f.endsWith(".sql") && f > NOMBRE)
      .sort();

    for (const archivo of posteriores) {
      const sql = sqlActivo(archivo);
      expect(sql, `${archivo} vuelve a abrir la subida al almacén`).not.toMatch(
        /create\s+policy\s+"subida publica media"/i,
      );
      expect(sql, `${archivo} vuelve a poner el almacén público`).not.toMatch(
        /update\s+storage\.buckets\s+set\s+public\s*=\s*true/i,
      );
      // Si alguna vuelve a tocar el borrado de `items`, tiene que seguir siendo
      // solo del anfitrión.
      if (/create\s+policy\s+"borrado por evento"/i.test(sql)) {
        const desde = sql.slice(sql.indexOf('create policy "borrado por evento"'));
        const politica = desde.slice(0, desde.indexOf(";") + 1);
        expect(politica, `${archivo} deja borrar sin ser anfitrión`).not.toMatch(
          /evento_del_pase\(|'x-evento'/,
        );
      }
    }
  });
});
