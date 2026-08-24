import { describe, expect, it } from "vitest";
import { derivarTextoSobre, luminancia, mezclarConBlanco, ratioContraste } from "./contraste";

describe("ratioContraste (WCAG)", () => {
  it("blanco sobre negro da el máximo (21)", () => {
    expect(ratioContraste("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });

  it("un color contra sí mismo da 1", () => {
    expect(ratioContraste("#7a2e3b", "#7a2e3b")).toBeCloseTo(1, 5);
  });

  it("es simétrico: no importa el orden", () => {
    const a = ratioContraste("#7a2e3b", "#fbf9f5");
    const b = ratioContraste("#fbf9f5", "#7a2e3b");
    expect(a).toBeCloseTo(b as number, 6);
  });

  it("la tinta del sitio sobre su crema pasa 4.5:1 de sobra", () => {
    // Los valores reales de la demo: si esto fallara, el rediseño entero
    // arrancaría con un tema ilegible.
    const ratio = ratioContraste("#241d1a", "#fbf9f5");
    expect(ratio).toBeGreaterThan(12);
  });

  it("la crema sobre el vino (texto de botón de la demo) pasa 4.5:1", () => {
    expect(ratioContraste("#fbf9f5", "#7a2e3b")).toBeGreaterThan(4.5);
  });

  it("entiende rgb(), hsl(), oklch() y oklab()", () => {
    expect(ratioContraste("rgb(255, 255, 255)", "rgb(0 0 0)")).toBeCloseTo(21, 0);
    expect(ratioContraste("hsl(0, 0%, 100%)", "hsl(0 0% 0%)")).toBeCloseTo(21, 0);
    // Blanco y negro en oklch/oklab.
    expect(ratioContraste("oklch(1 0 0)", "oklch(0 0 0)")).toBeCloseTo(21, 0);
    expect(ratioContraste("oklab(1 0 0)", "oklab(0 0 0)")).toBeCloseTo(21, 0);
  });

  it("oklch coincide razonablemente con su equivalente hex", () => {
    // El vino de la 0007 vieja: oklch(0.45 0.11 15) es un rojo vino medio.
    const l = luminancia("oklch(0.45 0.11 15)");
    expect(l).not.toBeNull();
    // Debe caer en el rango de un color medio-oscuro, no en blanco ni negro.
    expect(l as number).toBeGreaterThan(0.03);
    expect(l as number).toBeLessThan(0.3);
  });

  it("con un color ilegible devuelve null, no inventa", () => {
    expect(ratioContraste("var(--primary)", "#ffffff")).toBeNull();
    expect(ratioContraste("bonito", "#ffffff")).toBeNull();
    expect(ratioContraste("#zz0000", "#ffffff")).toBeNull();
  });

  it("ignora el alfa (el contraste se mide sobre fondo opaco)", () => {
    const con = ratioContraste("rgb(255 255 255 / 0.5)", "#000000");
    expect(con).toBeCloseTo(21, 0);
  });

  it("rgb() numérico SIEMPRE es 0-255: rgb(1,0,0) es casi negro, no rojo puro", () => {
    // La heurística "v > 1" leía los canales 0 y 1 como fracciones: rgb(1,0,0)
    // salía como rojo puro y derivaba texto negro sobre botón negro.
    const l = luminancia("rgb(1, 0, 0)");
    expect(l).not.toBeNull();
    expect(l as number).toBeLessThan(0.01);
    expect(derivarTextoSobre("rgb(1, 0, 0)")).toBe("#ffffff");
    // Y los porcentajes siguen siendo porcentajes.
    expect(luminancia("rgb(100% 100% 100%)")).toBeCloseTo(1, 3);
  });
});

describe("mezclarConBlanco (el color que pintará color-mix en oscuro)", () => {
  it("aclara de verdad: el vino mezclado 55% es más luminoso que el vino", () => {
    const aclarado = mezclarConBlanco("#7a2e3b", 55);
    expect(aclarado).toMatch(/^#[0-9a-f]{6}$/);
    expect(luminancia(aclarado as string) as number).toBeGreaterThan(
      luminancia("#7a2e3b") as number,
    );
  });

  it("100% de color = el color; 0% = blanco", () => {
    expect(luminancia(mezclarConBlanco("#7a2e3b", 100) as string) as number).toBeCloseTo(
      luminancia("#7a2e3b") as number,
      1,
    );
    expect(luminancia(mezclarConBlanco("#7a2e3b", 0) as string) as number).toBeCloseTo(1, 1);
  });

  it("con un color ilegible devuelve null", () => {
    expect(mezclarConBlanco("bonito", 55)).toBeNull();
  });
});

describe("derivarTextoSobre", () => {
  it("sobre colores oscuros propone blanco", () => {
    expect(derivarTextoSobre("#7a2e3b")).toBe("#ffffff");
    expect(derivarTextoSobre("#000000")).toBe("#ffffff");
  });

  it("sobre colores claros propone negro", () => {
    expect(derivarTextoSobre("#fbf9f5")).toBe("#000000");
    expect(derivarTextoSobre("#c9a96e")).toBe("#000000");
  });

  it("lo que deriva SIEMPRE pasa 4.5:1, con CUALQUIER color", () => {
    // Los de la casa…
    for (const color of ["#7a2e3b", "#c9a96e", "#fbf9f5", "#241d1a", "#3b82f6", "#e11d48"]) {
      expect(ratioContraste(derivarTextoSobre(color), color)).toBeGreaterThanOrEqual(4.5);
    }
    // …y un barrido determinista del cubo RGB, incluidos los tonos medios
    // donde un "casi-negro" fallaría (por eso se deriva negro puro).
    for (let r = 0; r <= 255; r += 51) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
          expect(ratioContraste(derivarTextoSobre(hex), hex)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("ante un color ilegible cae a blanco (el fallo legible)", () => {
    expect(derivarTextoSobre("lo-que-sea")).toBe("#ffffff");
  });
});
