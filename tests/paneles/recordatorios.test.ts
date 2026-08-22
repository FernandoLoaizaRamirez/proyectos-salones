import { describe, it, expect } from "vitest";
import {
  COLECCION_RECORDATORIOS,
  haceCuanto,
  mensajeRecordatorio,
  porRecordarHoy,
} from "../../apps/catalogo/src/lib/recordatorios";

/**
 * RECORDARLE A QUIEN NO HA CONTESTADO
 * (`apps/catalogo/src/lib/recordatorios.ts`).
 * ---------------------------------------------------------------------------
 * Lo que se vigila aquí es lo que el salón LEE en pantalla mientras persigue a
 * 40 invitados, que es cuando más fácil se pierde la cuenta:
 *
 *   · Que "ayer" quiera decir ayer. Un mensaje de anoche a las once fue AYER,
 *     aunque hayan pasado nueve horas. Contar en múltiplos de 24 h haría que la
 *     pantalla dijera "hoy" a las ocho de la mañana y "ayer" a las nueve, y
 *     quien mira concluiría que el tablero miente.
 *   · Que el recordatorio NO se invente una fecha límite que el salón no puso.
 *     Apurar con una fecha falsa es peor que no apurar.
 */

/** Un momento fijo para que las pruebas no dependan de la hora en que corran. */
const AHORA = new Date(2026, 7, 22, 10, 0, 0).getTime(); // 22 ago 2026, 10:00
const enDia = (diasAtras: number, hora: number, min = 0) =>
  new Date(2026, 7, 22 - diasAtras, hora, min, 0).getTime();

describe("cuánto hace que se le recordó", () => {
  it("el mismo día es 'hoy'", () => {
    expect(haceCuanto(enDia(0, 9), AHORA)).toBe("hoy");
    expect(haceCuanto(enDia(0, 0, 1), AHORA)).toBe("hoy");
  });

  it("anoche a las once es 'ayer', no 'hace 11 horas'", () => {
    // El caso que rompe contar de 24 en 24: han pasado 11 horas, pero para
    // quien mira la pantalla eso fue ayer.
    expect(haceCuanto(enDia(1, 23), AHORA)).toBe("ayer");
  });

  it("y esta madrugada a la una sigue siendo 'hoy'", () => {
    expect(haceCuanto(enDia(0, 1), AHORA)).toBe("hoy");
  });

  it("de tres días para atrás lo dice en días", () => {
    expect(haceCuanto(enDia(3, 12), AHORA)).toBe("hace 3 días");
    expect(haceCuanto(enDia(14, 8), AHORA)).toBe("hace 14 días");
  });

  it("sin recordatorio no dice nada, en vez de un 'nunca' acusador", () => {
    expect(haceCuanto(undefined, AHORA)).toBe("");
    expect(haceCuanto(0, AHORA)).toBe("");
  });

  it("un apunte hecho HACE UN MINUTO, con el reloj congelado, dice 'hoy'", () => {
    /*
     * EL FALLO QUE ESTO TAPA, cazado probándolo en producción el 22 ago 2026:
     * la pantalla congela su "ahora" al abrirse, así que un recordatorio hecho
     * dos minutos después queda técnicamente en el futuro. La primera versión
     * devolvía "" y el "recordado hoy" no aparecía hasta recargar la página —
     * que es justo el aviso que evita escribirle dos veces a la misma persona.
     */
    expect(haceCuanto(AHORA + 120_000, AHORA)).toBe("hoy");
  });

  it("pero un apunte de MAÑANA sigue sin decir nada (reloj torcido)", () => {
    expect(haceCuanto(AHORA + 86_400_000, AHORA)).toBe("");
  });
});

describe("el texto del recordatorio", () => {
  it("dice el evento y la fecha límite cuando el salón la capturó", () => {
    expect(mensajeRecordatorio("Boda Ana & Rodrigo", "1 de marzo de 2027", "https://x.mx/a")).toBe(
      "¡Hola! Te recordamos confirmar tu asistencia a Boda Ana & Rodrigo. " +
        "Nos ayudas un montón si nos confirmas antes del 1 de marzo de 2027.\nhttps://x.mx/a",
    );
  });

  it("NO se inventa una fecha cuando no hay", () => {
    const msg = mensajeRecordatorio("Boda Citla", "", "https://x.mx/a");
    expect(msg).toContain("cuando puedas");
    expect(msg).not.toContain("antes del");
  });

  it("aguanta un evento sin nombre sin dejar un hueco raro", () => {
    expect(mensajeRecordatorio("   ", "", "https://x.mx/a")).toContain("a nuestro evento.");
  });

  it("no es el mismo texto que la primera invitación", () => {
    // Si fueran iguales, el invitado recibiría dos veces la misma presentación
    // y el recordatorio no se leería como recordatorio.
    const msg = mensajeRecordatorio("Boda", "", "https://x.mx/a");
    expect(msg).toContain("Te recordamos");
    expect(msg).not.toContain("Nos encantaría contar contigo");
  });
});

describe("cuántos faltan por recordar hoy", () => {
  const pendientes = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("cuenta a todos cuando no se le ha escrito a nadie", () => {
    expect(porRecordarHoy(pendientes, new Map(), AHORA)).toBe(3);
  });

  it("descuenta solo a los de HOY: los de ayer vuelven a la lista de trabajo", () => {
    const recordados = new Map([
      ["a", enDia(0, 9)], // hoy → ya está
      ["b", enDia(1, 20)], // ayer → toca otra vez
    ]);
    expect(porRecordarHoy(pendientes, recordados, AHORA)).toBe(2);
  });

  it("llega a cero cuando ya se persiguió a todos hoy", () => {
    const recordados = new Map(pendientes.map((p) => [p.id, enDia(0, 8)]));
    expect(porRecordarHoy(pendientes, recordados, AHORA)).toBe(0);
  });

  it("ignora recordatorios de quien ya no está pendiente", () => {
    // Alguien contestó después de que se le recordó: ya no cuenta como trabajo.
    const recordados = new Map([["zzz", enDia(0, 9)]]);
    expect(porRecordarHoy(pendientes, recordados, AHORA)).toBe(3);
  });
});

describe("la colección donde se apunta", () => {
  it("tiene nombre propio y no se mezcla con las respuestas", () => {
    // Guardarlos en `respuestas` habría sido más rápido y habría ensuciado el
    // conteo de confirmaciones, que es el número que se lleva al banquetero.
    expect(COLECCION_RECORDATORIOS).toBe("recordatorios");
  });
});
