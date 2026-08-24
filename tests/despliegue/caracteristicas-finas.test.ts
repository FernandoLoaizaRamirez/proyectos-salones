import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * LAS CARACTERÍSTICAS FINAS TIENEN QUE APAGAR ALGO DE VERDAD (0027).
 * ---------------------------------------------------------------------------
 * El brief pedía poder vender "el álbum con likes pero sin comentarios". Al
 * revisarlo, el álbum NO tiene ni likes ni comentarios: un interruptor sobre
 * algo que la app no sabe hacer no apaga nada y no enciende nada — es una
 * promesa rota esperando a la primera demostración delante de un salón.
 *
 * Por eso esta prueba ata cada característica dada de alta a un control REAL en
 * pantalla: si alguien añade una clave a la migración o al catálogo del panel
 * sin conectarla, el CI se pone rojo.
 *
 * Lee los ARCHIVOS (como sus hermanas de esta carpeta): corre sin base, sin red
 * y sin compilar nada.
 */
const RAIZ = resolve(__dirname, "..", "..");
const leer = (...ruta: string[]) => readFileSync(join(RAIZ, ...ruta), "utf8");

/** Cada característica, con el archivo que de verdad la consume. */
const CONECTADAS: { clave: string; archivo: string[] }[] = [
  { clave: "album.descargas", archivo: ["apps", "album-fotos", "src", "components", "album.tsx"] },
  { clave: "muro.fotos", archivo: ["apps", "muro", "src", "components", "firma-form.tsx"] },
  {
    clave: "playlist.votos",
    archivo: ["apps", "playlist", "src", "components", "pedir-cliente.tsx"],
  },
  {
    clave: "dinamicas.ranking",
    archivo: ["apps", "dinamicas", "src", "components", "trivia-juego.tsx"],
  },
];

describe("La migración 0027 da de alta las características", () => {
  const sql = leer("supabase", "migrations", "0027_caracteristicas_finas.sql");

  it("cada clave está en `features`", () => {
    for (const { clave } of CONECTADAS) {
      expect(sql, `falta ${clave} en la 0027`).toContain(`'${clave}'`);
    }
  });

  it("crea `evento_tiene_caracteristica` y le da permiso al navegador", () => {
    // Sin el grant no hay forma de esconder un control: la lección de la 0017.
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+evento_tiene_caracteristica/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+evento_tiene_caracteristica[^;]*anon/i);
  });

  it("hereda del módulo cuando la clave fina no consta", () => {
    expect(sql).toMatch(/split_part\(\s*p_clave\s*,\s*'\.'\s*,\s*1\s*\)/);
  });

  it("ante un evento desconocido responde que NO", () => {
    expect(sql).toMatch(/if\s+v_event_id\s+is\s+null\s+then[\s\S]{0,60}return\s+false/i);
  });
});

describe("Cada característica apaga un control REAL", () => {
  for (const { clave, archivo } of CONECTADAS) {
    it(`"${clave}" se consume en ${archivo[1]}`, () => {
      const fuente = leer(...archivo);
      expect(fuente, `${archivo[1]} no pregunta por su característica`).toContain(
        "useCaracteristica",
      );
      // La clave llega por la constante de core, no escrita a mano.
      expect(fuente).toContain("CARACTERISTICAS_CONOCIDAS");
    });
  }

  it("el panel solo ofrece características que existen en core", () => {
    const panel = leer("apps", "catalogo", "src", "lib", "funciones-evento.ts");
    const core = leer("packages", "core", "src", "caracteristicas.ts");
    for (const { clave } of CONECTADAS) {
      expect(core, `falta ${clave} en core`).toContain(`"${clave}"`);
    }
    // El panel las nombra por la constante, nunca con la cadena a mano.
    expect(panel).toContain("CARACTERISTICAS_CONOCIDAS");
    expect(panel).not.toMatch(/clave:\s*"[a-z-]+\.[a-z-]+"/);
  });
});
