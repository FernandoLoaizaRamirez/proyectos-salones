/**
 * LA PUERTA DEL INVITADO TIENE QUE LLEVAR A LA DEMO QUE SÍ ESTÁ LLENA.
 *
 * El 22 ago 2026 se midió en producción que hay dos demos y no se parecen:
 * `?e=demo` (la compartida) sale VACÍA —el muro dice "Aún no hay mensajes" y la
 * playlist enseña dos restos de pruebas—, mientras que `?e=demo-xxxxxx` (la
 * vitrina propia del visitante) se siembra sola. La puerta del invitado mandaba
 * a la primera, o sea al camino muerto, justo cuando un salón pulsaba "Mira
 * cómo se ve por dentro".
 *
 * Estas pruebas cubren las dos formas de romperlo otra vez:
 *  1. que alguien cambie el prefijo en @salones/sync y el sitio se quede atrás;
 *  2. que alguien vuelva a poner en el campo un código de ejemplo con pinta de
 *     real (decía "Ej. boda-ana-rodrigo", un evento que NO existe).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PREFIJO_VITRINA as PREFIJO_SITIO,
  conVitrina,
} from "../../apps/sitio-salon/src/lib/vitrina";
import { puertaInvitado } from "../../apps/sitio-salon/src/lib/salon";

/**
 * El prefijo de @salones/sync se lee del ARCHIVO, no se importa.
 *
 * Importar el módulo arrastraría el cliente de Supabase entero a una prueba que
 * solo necesita una cadena de seis letras, y además ese paquete no está aliado
 * en la configuración de vitest. Leer el texto es más tonto y más robusto: si
 * alguien cambia el valor, esto lo ve igual.
 */
function prefijoDeSync(): string {
  const ruta = fileURLToPath(new URL("../../packages/sync/src/index.ts", import.meta.url));
  const fuente = readFileSync(ruta, "utf8");
  const hallado = fuente.match(/export const PREFIJO_VITRINA\s*=\s*"([^"]+)"/);
  if (!hallado) {
    throw new Error(
      "No encontré PREFIJO_VITRINA en packages/sync/src/index.ts. " +
        "Si se renombró, hay que actualizar esta prueba Y apps/sitio-salon/src/lib/vitrina.ts.",
    );
  }
  return hallado[1];
}

describe("La vitrina en el sitio del salón", () => {
  it("usa EXACTAMENTE el mismo prefijo que @salones/sync", () => {
    // El sitio copia la constante en vez de importarla, para no arrastrar el
    // cliente de la base a una web de marketing. Esta prueba es el precio.
    expect(PREFIJO_SITIO).toBe(prefijoDeSync());
  });

  it("pega el código al enlace del portal", () => {
    expect(conVitrina("https://portal.test", "demo-k3f9x2")).toBe(
      "https://portal.test?e=demo-k3f9x2",
    );
  });

  it("respeta una dirección que ya trae pregunta", () => {
    expect(conVitrina("https://portal.test/?x=1", "demo-abc123")).toBe(
      "https://portal.test/?x=1&e=demo-abc123",
    );
  });

  it("sin código deja la dirección intacta (navegación privada)", () => {
    // Se pierde la mejora, no la demo: sigue llevando al portal.
    expect(conVitrina("https://portal.test", null)).toBe("https://portal.test");
  });

  it("el código que genera es una vitrina propia, no el demo compartido", () => {
    const inventado = `${PREFIJO_SITIO}${Math.random().toString(36).slice(2, 8)}`;
    expect(inventado.startsWith(PREFIJO_SITIO)).toBe(true);
    expect(inventado).not.toBe("demo");
  });
});

describe("El texto de ejemplo del campo", () => {
  it("NO propone un código con pinta de real", () => {
    // Un texto tipo "Ej. boda-ana-rodrigo" invita a escribirlo tal cual, y ese
    // evento no existe: el cliente se topaba con "No encontramos este evento".
    expect(puertaInvitado.ejemplo).not.toMatch(/^Ej\./i);
    expect(puertaInvitado.ejemplo).not.toMatch(/\b[a-z]+-[a-z]+-[a-z]+\b/);
  });
});
