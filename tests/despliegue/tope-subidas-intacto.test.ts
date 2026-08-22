import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * EL TOPE DE SUBIDAS SIGUE ENTERO, MIGRACIÓN TRAS MIGRACIÓN.
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTA PRUEBA: el 21 ago 2026 el tope de subidas llevaba horas
 * sin topar nada en producción, y nadie se enteró. No fue un ataque ni un
 * descuido tonto: la migración 0022 REESCRIBIÓ `permitir_subida` para darle su
 * propio techo a las vitrinas por visitante, y al reescribirla se perdieron dos
 * cosas que estaban en la 0015 y que no se ven al leer el diff:
 *
 *   1. El `insert into media_permisos`. La función contaba Y APUNTABA en la
 *      misma llamada. Sin el apunte, nadie escribe nunca en esa tabla, los
 *      contadores se quedan en cero y la respuesta es SIEMPRE que sí.
 *      Medido entonces: 65 llamadas seguidas, 65 concedidas, con un tope de 60.
 *
 *   2. El candado. La 0015 decía "solo la Edge Function (llave de servicio)
 *      puede pedir permiso"; la 0022 le dio `grant execute` a `anon`.
 *
 * De esas dos, la prueba de aislamiento (`tests/aislamiento/media.test.ts`)
 * cazó SOLO la segunda, y encima solo cuando alguien miraba el CI. La primera
 * —la grave, la que deja el almacén sin freno— no la cazaba nadie, porque desde
 * fuera un tope roto y un tope holgado se ven exactamente igual.
 *
 * Esto corre SIN RED y SIN BASE: lee los archivos de `supabase/migrations/` y
 * comprueba cómo queda la función después de aplicarlas todas en orden. Es una
 * prueba de INTENCIÓN, no de estado: dice qué debe decir el repo. Que la base
 * de verdad esté así lo comprueba la de aislamiento.
 */

const MIGRACIONES = resolve(__dirname, "../../supabase/migrations");

/** Los .sql en el orden en que se aplican (0001, 0002, … 0023). */
function migracionesEnOrden(): { nombre: string; sql: string }[] {
  return readdirSync(MIGRACIONES)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((nombre) => ({ nombre, sql: readFileSync(join(MIGRACIONES, nombre), "utf8") }));
}

/** Quita los comentarios: lo comentado no se ejecuta, y aquí engañaría. */
function sinComentarios(sql: string): string {
  return sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
}

describe("el tope de subidas (permitir_subida) sigue entero", () => {
  const archivos = migracionesEnOrden().map((m) => ({ ...m, sql: sinComentarios(m.sql) }));

  /** La ÚLTIMA migración que define la función es la que manda. */
  const definiciones = archivos.filter((m) =>
    /create\s+or\s+replace\s+function\s+permitir_subida/i.test(m.sql),
  );
  const ultima = definiciones.at(-1);

  it("alguna migración define la función (si no, no hay nada que vigilar)", () => {
    expect(definiciones.length, "Nadie define permitir_subida.").toBeGreaterThan(0);
  });

  it("la definición que manda CUENTA Y APUNTA, no solo cuenta", () => {
    const cuerpo = ultima?.sql ?? "";
    expect(
      /insert\s+into\s+media_permisos/i.test(cuerpo),
      `La última definición de permitir_subida está en ${ultima?.nombre} y NO apunta en ` +
        "`media_permisos`. Sin ese insert nadie escribe nunca en esa tabla, los contadores se " +
        "quedan en cero y el tope concede SIEMPRE: el almacén se queda sin freno y desde fuera " +
        "no se nota. Pasó de verdad entre la 0022 y la 0023.",
    ).toBe(true);
  });

  it("al final, solo la llave de servicio puede pedir permiso", () => {
    // Se recogen TODOS los grant/revoke sobre la función, en orden de aplicación:
    // manda el último que mencione a cada quien.
    const permisos: string[] = [];
    for (const m of archivos) {
      for (const linea of m.sql.split(/;\s*\n|;\s*$/)) {
        const t = linea.trim().toLowerCase().replace(/\s+/g, " ");
        if (/^(grant|revoke)\b/.test(t) && t.includes("permitir_subida")) permisos.push(t);
      }
    }
    expect(permisos.length, "Nadie toca los permisos de permitir_subida.").toBeGreaterThan(0);

    const ultimoQueMenciona = (quien: string) =>
      [...permisos].reverse().find((p) => new RegExp(`\\b${quien}\\b`).test(p)) ?? "";

    for (const quien of ["anon", "authenticated", "public"]) {
      expect(
        ultimoQueMenciona(quien).startsWith("revoke"),
        `Lo último que se hace con "${quien}" sobre permitir_subida es:\n  ` +
          `${ultimoQueMenciona(quien) || "(nada)"}\n\n` +
          "Tiene que ser un revoke. Si se puede llamar desde el navegador, cualquiera con la " +
          "llave pública gasta el cupo de una boda — y la llama la Edge Function con la llave " +
          "de servicio, así que nadie de fuera la necesita.",
      ).toBe(true);
    }

    expect(
      ultimoQueMenciona("service_role").startsWith("grant"),
      "La Edge Function `media-subir` la llama con SERVICE_ROLE: si le quitamos ese permiso, " +
        "deja de haber tope (la función devuelve 404 y `media-subir` deja pasar a propósito).",
    ).toBe(true);
  });
});
