import { describe, expect, it } from "vitest";
import { FUENTES, familiasCSS, hrefFuentes, parejaDe } from "./fuentes";

describe("parejaDe (la red de seguridad de la allowlist)", () => {
  it("una clave conocida devuelve su pareja", () => {
    expect(parejaDe("clasica").display.familia).toBe("Cormorant Garamond");
    expect(parejaDe("editorial").sans.familia).toBe("Source Sans 3");
  });

  it("una clave desconocida cae a sistema — NUNCA revienta ni inventa", () => {
    for (const clave of ["comic-sans", "'; drop table", "https://mal.example/f.css", "", "CLASICA"]) {
      expect(parejaDe(clave).clave).toBe("sistema");
    }
    expect(parejaDe(undefined).clave).toBe("sistema");
  });

  it("las claves del PROTOTIPO también caen a sistema (Object.hasOwn, no `in`)", () => {
    // "toString" in FUENTES es true por herencia: con `in`, parejaDe devolvía
    // una FUNCIÓN y el primer `.display.familia` reventaba.
    for (const clave of ["toString", "constructor", "valueOf", "hasOwnProperty", "__proto__"]) {
      expect(parejaDe(clave).clave, clave).toBe("sistema");
    }
  });
});

describe("hrefFuentes (el <link> se construye SOLO desde la allowlist)", () => {
  it("sistema no descarga nada", () => {
    expect(hrefFuentes("sistema")).toBeNull();
    expect(hrefFuentes(undefined)).toBeNull();
  });

  it("clasica tampoco: viene compilada en la app (autoalojada)", () => {
    expect(hrefFuentes("clasica")).toBeNull();
  });

  it("las demás claves dan UNA URL de Google Fonts con display=swap", () => {
    for (const clave of ["editorial", "moderna", "romantica", "festiva"] as const) {
      const href = hrefFuentes(clave);
      expect(href).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=/);
      expect(href).toContain("display=swap");
    }
  });

  it("un valor malicioso jamás se convierte en URL", () => {
    expect(hrefFuentes("https://mal.example/x.css")).toBeNull();
    expect(hrefFuentes("editorial'><script>")).toBeNull();
  });
});

describe("familiasCSS", () => {
  it("sistema devuelve null: mandan los tokens base", () => {
    expect(familiasCSS("sistema")).toBeNull();
    expect(familiasCSS("desconocida")).toBeNull();
  });

  it("toda familia lleva su pila de respaldo", () => {
    const f = familiasCSS("clasica");
    expect(f?.display).toContain('"Cormorant Garamond"');
    expect(f?.display).toContain("serif");
    expect(f?.sans).toContain('"Jost"');
    expect(f?.sans).toContain("sans-serif");
  });

  it("sin script en la pareja, el script cae al display", () => {
    const f = familiasCSS("moderna"); // Fraunces + Inter, sin script
    expect(f?.script).toBe(f?.display);
  });

  it("con script, el script cae al display si la letra no llega", () => {
    const f = familiasCSS("clasica");
    expect(f?.script).toContain('"Parisienne"');
    expect(f?.script).toContain('"Cormorant Garamond"');
  });
});

describe("la allowlist misma", () => {
  it("toda pareja con google trae familias con nombre", () => {
    for (const pareja of Object.values(FUENTES)) {
      if (pareja.clave === "sistema") continue;
      expect(pareja.display.familia.length).toBeGreaterThan(0);
      expect(pareja.sans.familia.length).toBeGreaterThan(0);
    }
  });
});
