import { describe, it, expect } from "vitest";
import {
  FUNCIONES_PAQUETE_TODO,
  estadoPaqueteTodo,
  type OverrideEvento,
} from "../../apps/catalogo/src/lib/paquete-evento";
import { FEATURES_CONOCIDAS } from "../../packages/core/src/entitlements";

/**
 * EL PAQUETE DEL EVENTO (`apps/catalogo/src/lib/paquete-evento.ts`).
 * ---------------------------------------------------------------------------
 * Mientras el cobro en línea siga apagado, el "Paquete Todo Incluido" se cobra
 * por fuera y se ENCIENDE A MANO en el panel. Aquí se vigilan las dos únicas
 * cosas que pueden hacerse mal sin que nadie se entere hasta el día del evento:
 *
 *   1. QUÉ FUNCIONES LLEVA EL PAQUETE. De más: se regalaría el paquete de video,
 *      que se vende aparte y donde un solo video pesa como cien fotos del mismo
 *      cajón. De menos: el salón cobra el paquete completo y a su cliente le
 *      falta una experiencia en el portal.
 *
 *   2. QUE UN PAQUETE A MEDIAS NO SE VEA COMO ENCENDIDO. Si la pantalla dijera
 *      "encendido" con dos de cuatro, el salón le prometería a la novia un
 *      photobooth que el portal no le va a enseñar.
 *
 * Todo es puro: corre sin Supabase y sin navegador (leer y escribir las filas
 * hablan con la base, y eso lo vigila la RLS de la 0008, no una prueba).
 */

/** Una fila de `event_overrides` como la devuelve la base. */
const fila = (feature_clave: string, habilitado = true): OverrideEvento => ({
  feature_clave,
  habilitado,
});

describe("FUNCIONES_PAQUETE_TODO — qué se enciende con el paquete", () => {
  it("son exactamente las cuatro experiencias nuevas del portal", () => {
    expect([...FUNCIONES_PAQUETE_TODO].sort()).toEqual(
      ["brindis", "invitacion", "mesas", "photobooth"].sort(),
    );
  });

  it("usa las claves de @salones/core, no textos escritos a mano", () => {
    // Si alguien renombrara una clave en el core y aquí quedara la vieja, el
    // interruptor escribiría una función que no existe en `features` y la base
    // lo rechazaría por la llave foránea… el día del evento.
    expect(FUNCIONES_PAQUETE_TODO).toContain(FEATURES_CONOCIDAS.Invitacion);
    expect(FUNCIONES_PAQUETE_TODO).toContain(FEATURES_CONOCIDAS.Mesas);
    expect(FUNCIONES_PAQUETE_TODO).toContain(FEATURES_CONOCIDAS.Photobooth);
    expect(FUNCIONES_PAQUETE_TODO).toContain(FEATURES_CONOCIDAS.Brindis);
  });

  it("NO incluye el paquete de video: ese se cobra aparte", () => {
    expect(FUNCIONES_PAQUETE_TODO).not.toContain(FEATURES_CONOCIDAS.Video);
    expect(FUNCIONES_PAQUETE_TODO).not.toContain("video");
  });

  it("NO incluye sync-colectivo: eso ya viene con el plan gestionado", () => {
    expect(FUNCIONES_PAQUETE_TODO).not.toContain(FEATURES_CONOCIDAS.SyncColectivo);
    expect(FUNCIONES_PAQUETE_TODO).not.toContain("sync-colectivo");
  });

  it("no repite ninguna clave (se escribe una fila por función)", () => {
    expect(new Set(FUNCIONES_PAQUETE_TODO).size).toBe(FUNCIONES_PAQUETE_TODO.length);
  });
});

describe("estadoPaqueteTodo — cómo se le enseña al salón", () => {
  it("las cuatro en true: encendido", () => {
    const filas = FUNCIONES_PAQUETE_TODO.map((c) => fila(c));
    expect(estadoPaqueteTodo(filas)).toBe("encendido");
  });

  it("sin ninguna fila: apagado", () => {
    // Es el caso de un evento recién creado: no tiene overrides.
    expect(estadoPaqueteTodo([])).toBe("apagado");
  });

  it("dos de cuatro: parcial, nunca encendido", () => {
    const filas = [fila(FEATURES_CONOCIDAS.Invitacion), fila(FEATURES_CONOCIDAS.Mesas)];
    expect(estadoPaqueteTodo(filas)).toBe("parcial");
  });

  it("las cuatro filas, pero una en false: parcial", () => {
    // Estar en la tabla no es estar encendido: `habilitado` puede ser false, y
    // el portal esconde esa experiencia igual que si no hubiera fila.
    const filas = FUNCIONES_PAQUETE_TODO.map((c) =>
      fila(c, c !== FEATURES_CONOCIDAS.Photobooth),
    );
    expect(estadoPaqueteTodo(filas)).toBe("parcial");
  });

  it("las cuatro en false: apagado (ninguna cuenta como encendida)", () => {
    const filas = FUNCIONES_PAQUETE_TODO.map((c) => fila(c, false));
    expect(estadoPaqueteTodo(filas)).toBe("apagado");
  });

  it("las filas de otras funciones no cuentan", () => {
    // El paquete de video vive en la misma tabla: si se colara en la cuenta, un
    // evento que solo pagó el video se vería como "paquete a medias".
    expect(estadoPaqueteTodo([fila(FEATURES_CONOCIDAS.Video), fila("realtime")])).toBe("apagado");

    const conRuido = [
      ...FUNCIONES_PAQUETE_TODO.map((c) => fila(c)),
      fila(FEATURES_CONOCIDAS.Video, false),
      fila("sync-colectivo"),
    ];
    expect(estadoPaqueteTodo(conRuido)).toBe("encendido");
  });
});
