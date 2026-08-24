import { describe, expect, it } from "vitest";
import { resolverTema } from "./resolver";
import { legibleEnAmbosTemas, temaAVariables } from "./variables";

describe("temaAVariables", () => {
  it("emite SOLO las variables de los campos presentes", () => {
    const vacio = temaAVariables(resolverTema({ nombre: "X" }));
    expect(vacio).toEqual({});
  });

  it("el primario va envuelto en light-dark para leerse en ambos modos", () => {
    const vars = temaAVariables(resolverTema({ nombre: "X", primario: "#7a2e3b" }));
    expect(vars["--primary"]).toBe(legibleEnAmbosTemas("#7a2e3b"));
    expect(vars["--primary"]).toContain("light-dark(");
    expect(vars["--primary"]).toContain("color-mix(in oklab");
    expect(vars["--ring"]).toBe("#7a2e3b");
  });

  it("el acento manda sobre el primario en el anillo de foco", () => {
    const vars = temaAVariables(
      resolverTema({ nombre: "X", primario: "#7a2e3b", acento: "#c9a96e" }),
    );
    expect(vars["--ring"]).toBe("#c9a96e");
    expect(vars["--accent"]).toBe(legibleEnAmbosTemas("#c9a96e"));
    // Derivado: negro sobre el oro, y también negro sobre el oro ACLARADO del
    // modo oscuro — como coinciden, se emite plano, sin light-dark.
    expect(vars["--accent-fg"]).toBe("#000000");
  });

  it("el texto sobre el primario se adapta al modo oscuro (light-dark)", () => {
    // El caso medido de la propia demo: crema sobre el vino pasa en claro,
    // pero en oscuro el vino se pinta ACLARADO (color-mix 55% blanco) y la
    // crema daba ≈2.8:1. El fg del modo oscuro se deriva contra el aclarado.
    const vars = temaAVariables(
      resolverTema({ nombre: "X", primario: "#7a2e3b", primarioTexto: "#fbf9f5" }),
    );
    expect(vars["--primary-fg"]).toMatch(/^light-dark\(#fbf9f5, #000000\)$/);
  });

  it("de fondo+tinta salen las nueve variables de superficie", () => {
    const vars = temaAVariables(
      resolverTema({ nombre: "X", fondo: "#fbf9f5", tinta: "#241d1a" }),
    );
    for (const v of [
      "--bg",
      "--fg",
      "--card",
      "--card-fg",
      "--muted",
      "--muted-fg",
      "--border",
      "--surface",
      "--surface-fg",
    ]) {
      expect(vars[v], v).toBeDefined();
    }
    // Todas con su pareja oscura derivada (la "gala nocturna").
    expect(vars["--bg"]).toContain("light-dark(#fbf9f5");
    expect(vars["--bg"]).toContain("#0f0c0a");
  });

  it("sin superficie no se emite ninguna variable de superficie", () => {
    const vars = temaAVariables(resolverTema({ nombre: "X", primario: "#7a2e3b" }));
    expect(vars["--bg"]).toBeUndefined();
    expect(vars["--card"]).toBeUndefined();
  });

  it("las fuentes emiten las tres variables con sus respaldos", () => {
    const vars = temaAVariables(resolverTema({ nombre: "X", fuentes: "clasica" }));
    expect(vars["--font-display"]).toContain('"Cormorant Garamond"');
    expect(vars["--font-sans"]).toContain('"Jost"');
    expect(vars["--font-script"]).toContain('"Parisienne"');
  });

  it("con fuentes del sistema no se emite tipografía (mandan los tokens)", () => {
    const vars = temaAVariables(resolverTema({ nombre: "X" }));
    expect(vars["--font-display"]).toBeUndefined();
  });

  it("el radio pasa tal cual", () => {
    expect(temaAVariables(resolverTema({ nombre: "X", radio: "1rem" }))["--radius"]).toBe("1rem");
  });
});
