import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { esVitrina, esVitrinaPropia, idDeEjemplo, PREFIJO_VITRINA } from "../../packages/sync/src/index";

/**
 * UNA VITRINA POR VISITANTE (0022) TIENE QUE SEGUIR AISLADA.
 * ---------------------------------------------------------------------------
 * Antes todas las demostraciones caían en el mismo evento, "demo": abrían
 * vacías (los ejemplos no se podían sembrar sin chocar), lo que subía un
 * visitante lo veían todos, y si alguien borraba algo se lo borraba a los demás.
 * Ahora cada navegador estrena su propia vitrina, `demo-k3f9x2`.
 *
 * LO QUE DE VERDAD PROTEGE ESTA PRUEBA (las tres formas de romperlo):
 *
 *   1. Que alguien "simplifique" `idDeEjemplo` y los ejemplos vuelvan a llevar
 *      ids fijos. `items.id` es llave primaria GLOBAL: dos vitrinas con el
 *      mismo "M-PRIN" chocan, y la segunda demo nace rota. Peor todavía: una
 *      boda real podría acabar heredando los invitados de Ana & Rodrigo.
 *
 *   2. Que el prefijo deje de estar reservado y una vitrina se cuele como
 *      evento normal (o al revés: que una boda de verdad se tome por vitrina y
 *      cualquiera pueda moderarla sin llave de anfitrión).
 *
 *   3. Que el SQL y el TypeScript dejen de contar la misma historia. La regla
 *      vive en dos sitios a la fuerza —`es_vitrina` en la base y `esVitrina`
 *      aquí— y si una de las dos cambia sin la otra, las demos se quedan sin
 *      pase y no pueden escribir (401 en silencio).
 *
 * Corre sin Supabase y no se salta nunca: lee los archivos.
 */

const raiz = join(__dirname, "..", "..");
const sql = readFileSync(join(raiz, "supabase/migrations/0022_vitrina_por_visitante.sql"), "utf8");

describe("La vitrina de cada visitante", () => {
  it("reconoce las vitrinas y NO confunde una boda de verdad con una", () => {
    expect(esVitrina("demo")).toBe(true); // la vitrina compartida de siempre
    expect(esVitrina("demo-k3f9x2")).toBe(true); // la de un visitante
    expect(esVitrina("boda-garcia-x7k2")).toBe(false); // una boda real
    expect(esVitrina("demostracion")).toBe(false); // parecido no basta: hace falta el guion
  });

  it("distingue la vitrina propia del demo compartido (solo la propia se siembra)", () => {
    expect(esVitrinaPropia("demo-k3f9x2")).toBe(true);
    // En "demo" NO se siembra: allí los ids serían fijos y globales.
    expect(esVitrinaPropia("demo")).toBe(false);
    expect(esVitrinaPropia("boda-garcia-x7k2")).toBe(false);
  });

  it("da a cada vitrina sus propios ids, para que dos visitantes no choquen", () => {
    const unaVitrina = idDeEjemplo("M-PRIN", "demo-aaa111");
    const otraVitrina = idDeEjemplo("M-PRIN", "demo-bbb222");
    expect(unaVitrina).not.toBe(otraVitrina);
    expect(unaVitrina).toBe("M-PRIN-aaa111");
  });

  it("es estable: sembrar dos veces reescribe, no duplica la demo entera", () => {
    // Dos pestañas abiertas a la vez sembrarían dos veces; con ids deterministas
    // la segunda pasada cae sobre las mismas filas.
    expect(idDeEjemplo("G-A001", "demo-aaa111")).toBe(idDeEjemplo("G-A001", "demo-aaa111"));
  });

  it("no toca los ids del demo compartido ni los de una boda real", () => {
    expect(idDeEjemplo("M-PRIN", "demo")).toBe("M-PRIN");
    expect(idDeEjemplo("M-PRIN", "boda-garcia-x7k2")).toBe("M-PRIN");
  });

  it("el SQL y el TypeScript cuentan la misma historia", () => {
    // La regla del SQL: demo exacto, o el prefijo.
    expect(sql).toMatch(/create or replace function es_vitrina/);
    expect(sql).toContain("p_codigo = 'demo' or p_codigo like 'demo-%'");
    // Y el prefijo de aquí es justo ese.
    expect(PREFIJO_VITRINA).toBe("demo-");
  });

  it("las cinco puertas que trataban a 'demo' aparte ya usan la misma regla", () => {
    // Si una se queda fuera, las vitrinas se quedan sin pase (o sin cupo) y la
    // demo deja de funcionar justo para quien la está probando.
    for (const fn of [
      "emitir_pase",
      "emitir_pase_anfitrion",
      "permitir_subida",
      "cupo_bytes_del_evento",
    ]) {
      expect(sql).toMatch(new RegExp(`create or replace function ${fn}\\(`));
    }
    expect(sql).toMatch(/es_vitrina\(p_codigo\)/);
    expect(sql).toMatch(/es_vitrina\(p_evento\)/);
  });

  it("una vitrina de visitante gasta MENOS que el demo compartido", () => {
    // El plan de Supabase es el gratuito: si cada visita pudiera gastar lo mismo
    // que la vitrina compartida, unas pocas visitas vaciarían el GB.
    expect(sql).toContain("(25 * 1024 * 1024)::bigint");
    expect(sql).toMatch(/when es_vitrina\(p_evento\) then 60/);
  });
});
