import { describe, expect, it } from "vitest";
import { consultaUnica } from "./consulta-unica";

describe("consultaUnica (el single-flight con reintento)", () => {
  it("una sola consulta por código, compartida", async () => {
    const mapa = new Map<string, Promise<string | null>>();
    let llamadas = 0;
    const consultar = () => {
      llamadas++;
      return Promise.resolve("tema");
    };
    const [a, b] = await Promise.all([
      consultaUnica(mapa, "boda-x", consultar),
      consultaUnica(mapa, "boda-x", consultar),
    ]);
    expect(a).toBe("tema");
    expect(b).toBe("tema");
    expect(llamadas).toBe(1); // la segunda montura comparte la promesa
  });

  it("el ÉXITO se recuerda: montar de nuevo no vuelve a consultar", async () => {
    const mapa = new Map<string, Promise<string | null>>();
    let llamadas = 0;
    const consultar = () => Promise.resolve(`tema-${++llamadas}`);
    await consultaUnica(mapa, "boda-x", consultar);
    const segunda = await consultaUnica(mapa, "boda-x", consultar);
    expect(segunda).toBe("tema-1");
    expect(llamadas).toBe(1);
  });

  it("el FALLO (null) no se cachea: el siguiente montaje reintenta", async () => {
    const mapa = new Map<string, Promise<string | null>>();
    let llamadas = 0;
    const consultar = () => Promise.resolve(++llamadas === 1 ? null : "tema");
    expect(await consultaUnica(mapa, "boda-x", consultar)).toBeNull();
    // La red volvió: el segundo montaje SÍ consulta de nuevo y encuentra.
    expect(await consultaUnica(mapa, "boda-x", consultar)).toBe("tema");
    expect(llamadas).toBe(2);
  });

  it("una consulta que LANZA tampoco se cachea (y no revienta a nadie)", async () => {
    const mapa = new Map<string, Promise<string | null>>();
    let llamadas = 0;
    const consultar = () =>
      ++llamadas === 1 ? Promise.reject(new Error("red caída")) : Promise.resolve("tema");
    expect(await consultaUnica(mapa, "boda-x", consultar)).toBeNull();
    expect(await consultaUnica(mapa, "boda-x", consultar)).toBe("tema");
  });

  it("códigos distintos no se pisan", async () => {
    const mapa = new Map<string, Promise<string | null>>();
    expect(await consultaUnica(mapa, "boda-a", () => Promise.resolve("a"))).toBe("a");
    expect(await consultaUnica(mapa, "boda-b", () => Promise.resolve("b"))).toBe("b");
  });
});
