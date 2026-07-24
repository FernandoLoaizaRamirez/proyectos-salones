import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { esDelEvento, soloRuta, texto } from "../../supabase/functions/_shared/validar";

/**
 * PRUEBAS DE LOS CANDADOS DE ENTRADA de las Edge Functions.
 * ---------------------------------------------------------------------------
 * Estas tres funciones deciden cosas serias y hasta ahora NO TENÍAN NINGUNA
 * prueba que corriera: vivían dentro de archivos que arrancan un servidor al
 * cargarse, así que la única cobertura era contra el Supabase real, y esa suite
 * se salta sola mientras las funciones no estén desplegadas.
 *
 *   · `esDelEvento` (media-ver) — decide si el invitado de UNA boda puede pedir
 *     que le firmen las fotos de OTRA. Es el candado anti-travesía del álbum.
 *   · `soloRuta` (diagnostico) — impide que la LLAVE DE ANFITRIÓN (el `?a=…`,
 *     que permite borrar el evento entero) acabe guardada en la base al
 *     registrar un fallo.
 *   · `texto` — recorta y limpia todo lo que llega de fuera.
 *
 * Corren en Node, sin Supabase y sin Deno.
 */

describe("esDelEvento — el candado anti-travesía del álbum", () => {
  it("deja pasar una foto de la carpeta del evento", () => {
    expect(esDelEvento("demo/foto.jpg", "demo")).toBe(true);
    expect(esDelEvento("boda-ana-x7k2/IMG_0001.jpg", "boda-ana-x7k2")).toBe(true);
  });

  it("una carpeta que EMPIEZA igual no cuela", () => {
    // El caso que un `startsWith` dejaría pasar: "demo-otra" empieza por "demo".
    // Si esto se rompe, el invitado de una boda ve el álbum de otra.
    expect(esDelEvento("demo-otra/foto.jpg", "demo")).toBe(false);
    expect(esDelEvento("demo2/foto.jpg", "demo")).toBe(false);
    expect(esDelEvento("boda-ana-x7k2-copia/foto.jpg", "boda-ana-x7k2")).toBe(false);
  });

  it("otro evento distinto no cuela", () => {
    expect(esDelEvento("boda-beto/foto.jpg", "boda-ana")).toBe(false);
  });

  it("no se puede salir de la carpeta con '..'", () => {
    expect(esDelEvento("demo/../boda-ana/foto.jpg", "demo")).toBe(false);
    expect(esDelEvento("../boda-ana/foto.jpg", "demo")).toBe(false);
    expect(esDelEvento("..%2Fboda-ana/foto.jpg", "demo")).toBe(false);
  });

  it("no se puede bajar más hondo ni apuntar a la raíz", () => {
    expect(esDelEvento("demo/sub/foto.jpg", "demo")).toBe(false); // demasiado hondo
    expect(esDelEvento("demo", "demo")).toBe(false); // sin archivo
    expect(esDelEvento("demo/", "demo")).toBe(false); // archivo vacío
    expect(esDelEvento("/demo/foto.jpg", "demo")).toBe(false); // ruta absoluta
  });

  it("distingue mayúsculas: 'DEMO' no es 'demo'", () => {
    expect(esDelEvento("DEMO/foto.jpg", "demo")).toBe(false);
  });

  it("una ruta larguísima se rechaza", () => {
    expect(esDelEvento(`demo/${"x".repeat(300)}.jpg`, "demo")).toBe(false);
    // Justo por debajo del tope sí pasa.
    expect(esDelEvento(`demo/${"x".repeat(200)}.jpg`, "demo")).toBe(true);
  });

  it("lo que no es texto se rechaza sin reventar", () => {
    for (const basura of [null, undefined, 42, {}, [], true]) {
      expect(esDelEvento(basura as unknown as string, "demo")).toBe(false);
    }
    expect(esDelEvento("", "demo")).toBe(false);
  });

  it("el nombre del evento se compara ya codificado", () => {
    // El evento viaja en la ruta tal y como lo codifica el navegador. Se fija
    // aquí para que nadie cambie la comparación por descuido.
    expect(esDelEvento("a%20b/foto.jpg", "a b")).toBe(true);
    expect(esDelEvento("a b/foto.jpg", "a b")).toBe(false);
  });

  it("un evento vacío no abre nada", () => {
    expect(esDelEvento("/foto.jpg", "")).toBe(false);
    expect(esDelEvento("foto.jpg", "")).toBe(false);
  });
});

describe("soloRuta — que la llave de anfitrión no acabe guardada", () => {
  const LLAVE = "9f3c2b1a4d5e6f708a9b0c1d";

  it("quita la query, que es donde viaja la llave", () => {
    expect(soloRuta(`/album?e=boda-ana&a=${LLAVE}`)).toBe("/album");
  });

  it("quita también el ancla", () => {
    expect(soloRuta("/album#seccion-3")).toBe("/album");
    expect(soloRuta(`/album?a=${LLAVE}#abajo`)).toBe("/album");
  });

  it("pase lo que pase, la llave NUNCA sale en el resultado", () => {
    // La red de seguridad: da igual cómo venga montada la dirección.
    const direcciones = [
      `/album?a=${LLAVE}`,
      `/album?e=boda&a=${LLAVE}&otra=1`,
      `/album#x?a=${LLAVE}`,
      `/eventos/boda/album?a=${LLAVE}`,
      `  /album?a=${LLAVE}  `,
      `/album?A=${LLAVE}`,
    ];
    for (const d of direcciones) {
      const limpia = soloRuta(d);
      expect(limpia ?? "", `se filtró la llave en "${d}"`).not.toContain(LLAVE);
    }
  });

  it("una dirección limpia se queda igual", () => {
    expect(soloRuta("/album")).toBe("/album");
    expect(soloRuta("/eventos/boda-ana/album")).toBe("/eventos/boda-ana/album");
  });

  it("recorta los espacios de los lados", () => {
    expect(soloRuta("  /album  ")).toBe("/album");
  });

  it("si no queda nada útil, devuelve null", () => {
    expect(soloRuta(`?a=${LLAVE}`)).toBeNull();
    expect(soloRuta("")).toBeNull();
    expect(soloRuta("   ")).toBeNull();
    for (const basura of [null, undefined, 42, {}, []]) {
      expect(soloRuta(basura)).toBeNull();
    }
  });

  it("una dirección larguísima se recorta a 200", () => {
    const larga = `/${"x".repeat(500)}`;
    expect(soloRuta(larga)).toHaveLength(200);
  });
});

describe("texto — lo que llega de fuera no es de fiar", () => {
  it("recorta espacios y limita el largo", () => {
    expect(texto("  hola  ", 40)).toBe("hola");
    expect(texto("abcdef", 3)).toBe("abc");
  });

  it("lo que no es texto, o queda vacío, es null", () => {
    expect(texto("", 10)).toBeNull();
    expect(texto("    ", 10)).toBeNull();
    for (const basura of [null, undefined, 42, {}, [], true]) {
      expect(texto(basura, 10)).toBeNull();
    }
  });

  it("un texto justo en el límite pasa entero", () => {
    expect(texto("abcde", 5)).toBe("abcde");
  });
});

describe("el módulo compartido sigue siendo probable", () => {
  it("no usa Deno ni sale a la red", () => {
    // Si alguien mete aquí un `Deno.env` o un `fetch`, estas funciones vuelven a
    // ser imposibles de probar y esta suite entera deja de servir. Este guardián
    // avisa antes de que pase.
    const fuente = readFileSync(
      resolve(__dirname, "../../supabase/functions/_shared/validar.ts"),
      "utf8",
    );
    // Se miran solo las líneas de CÓDIGO: los comentarios de este archivo hablan
    // de Deno precisamente para explicar que no se usa.
    const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(codigo).not.toMatch(/\bDeno\./);
    expect(codigo).not.toMatch(/\bfetch\s*\(/);
    expect(codigo).not.toMatch(/^\s*import\s/m); // sin dependencias
  });
});
