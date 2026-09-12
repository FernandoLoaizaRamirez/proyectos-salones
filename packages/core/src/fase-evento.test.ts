import { describe, expect, it } from "vitest";
import { faseDeEvento } from "./fase-evento";

describe("faseDeEvento", () => {
  it("sin fecha, cae en 'antes'", () => {
    const ahora = new Date(2027, 2, 13);
    expect(faseDeEvento(null, ahora)).toBe("antes");
    expect(faseDeEvento(undefined, ahora)).toBe("antes");
    expect(faseDeEvento("no-es-una-fecha", ahora)).toBe("antes");
  });

  it("a más de 7 días, es 'antes'", () => {
    expect(faseDeEvento("2027-03-20T18:00", new Date(2027, 2, 1))).toBe("antes");
  });

  it("a 7 días o menos, es 'cerca'", () => {
    expect(faseDeEvento("2027-03-20T18:00", new Date(2027, 2, 13))).toBe("cerca");
    expect(faseDeEvento("2027-03-20T18:00", new Date(2027, 2, 19))).toBe("cerca");
  });

  it("el mismo día calendario, es 'hoy' — sin importar la hora", () => {
    expect(faseDeEvento("2027-03-20T18:00", new Date(2027, 2, 20, 8, 0))).toBe("hoy");
    expect(faseDeEvento("2027-03-20T18:00", new Date(2027, 2, 20, 23, 59))).toBe("hoy");
  });

  it("un día después, es 'despues'", () => {
    expect(faseDeEvento("2027-03-20T18:00", new Date(2027, 2, 21))).toBe("despues");
  });
});
