import { describe, it, expect } from "vitest";
import {
  resolveEntitlements,
  tieneFuncion,
  FEATURES_CONOCIDAS as F,
  type Plan,
} from "./index";

/**
 * Casos BORDE de `resolveEntitlements` (complementan a `entitlements.test.ts`).
 *
 * Esta función pura es la que HACE VALER qué está encendido para cada cliente y
 * evento: el servidor la usa para no dejar pasar funciones apagadas (= no hay
 * fuga de dinero) y el cliente para mostrar/ocultar. Por eso conviene fijar su
 * comportamiento en los rincones raros: plan vacío, funciones desconocidas,
 * la prioridad de las tres capas, y que no mute lo que recibe.
 */

const planGestionado: Plan = {
  id: "gestionado",
  nombre: "Gestionado",
  funciones: [F.Muro, F.Playlist, F.Rsvp, F.Dinamicas, F.Album, F.SyncColectivo],
};

const planVacio: Plan = {
  id: "vacio",
  nombre: "Sin funciones",
  funciones: [],
};

describe("resolveEntitlements — casos borde", () => {
  it("un plan SIN funciones no habilita nada (ni siquiera funciones conocidas)", () => {
    const ent = resolveEntitlements(planVacio);
    expect(tieneFuncion(ent, F.Muro)).toBe(false);
    expect(tieneFuncion(ent, F.SyncColectivo)).toBe(false);
    expect(Object.keys(ent)).toHaveLength(0);
  });

  it("una función DESCONOCIDA (no vendible) siempre da false", () => {
    const ent = resolveEntitlements(planGestionado);
    expect(tieneFuncion(ent, "funcion-que-no-existe")).toBe(false);
    // …y `tieneFuncion` distingue "encendida" de "cualquier otra cosa".
    expect(tieneFuncion(ent, "")).toBe(false);
  });

  it("el override de EVENTO puede apagar lo que el TENANT encendió (el evento manda)", () => {
    // Inverso del caso del test base: aquí el tenant enciende y el evento apaga.
    const ent = resolveEntitlements(
      planVacio,
      { [F.Realtime]: true }, // el cliente lo enciende
      { [F.Realtime]: false }, // el evento tiene la última palabra: lo apaga
    );
    expect(tieneFuncion(ent, F.Realtime)).toBe(false);
  });

  it("un override de EVENTO puede encender algo que ni el plan ni el tenant traían", () => {
    const ent = resolveEntitlements(planVacio, {}, { [F.Realtime]: true });
    expect(tieneFuncion(ent, F.Realtime)).toBe(true);
  });

  it("respeta la prioridad completa plan → tenant → evento sobre la MISMA función", () => {
    // Plan la trae encendida; el tenant la apaga; el evento la vuelve a encender.
    const a = resolveEntitlements(planGestionado, { [F.Album]: false }, { [F.Album]: true });
    expect(tieneFuncion(a, F.Album)).toBe(true);

    // Plan la trae encendida; el tenant no dice nada; el evento la apaga.
    const b = resolveEntitlements(planGestionado, {}, { [F.Album]: false });
    expect(tieneFuncion(b, F.Album)).toBe(false);

    // Plan la trae encendida; el tenant la apaga; el evento no dice nada → queda apagada.
    const c = resolveEntitlements(planGestionado, { [F.Album]: false }, {});
    expect(tieneFuncion(c, F.Album)).toBe(false);
  });

  it("apagar una función que el plan NO tenía es inofensivo (queda apagada)", () => {
    const ent = resolveEntitlements(planVacio, { [F.Muro]: false });
    expect(tieneFuncion(ent, F.Muro)).toBe(false);
  });

  it("los overrides vacíos {} equivalen a usar solo el plan", () => {
    const soloPlan = resolveEntitlements(planGestionado);
    const conVacios = resolveEntitlements(planGestionado, {}, {});
    expect(conVacios).toEqual(soloPlan);
  });

  it("es robusto ante funciones DUPLICADAS en el plan (siguen encendidas)", () => {
    const planDup: Plan = { id: "dup", nombre: "Duplicado", funciones: [F.Muro, F.Muro] };
    const ent = resolveEntitlements(planDup);
    expect(tieneFuncion(ent, F.Muro)).toBe(true);
  });

  it("NO muta el plan de entrada (sus funciones quedan intactas)", () => {
    const funcionesAntes = [...planGestionado.funciones];
    resolveEntitlements(planGestionado, { [F.Album]: false }, { [F.Muro]: false });
    expect(planGestionado.funciones).toEqual(funcionesAntes);
  });

  it("cada llamada devuelve un objeto nuevo (no comparte referencia)", () => {
    const a = resolveEntitlements(planGestionado);
    const b = resolveEntitlements(planGestionado);
    expect(a).not.toBe(b); // objetos distintos…
    expect(a).toEqual(b); // …pero con el mismo contenido.
  });

  it("resuelve una mezcla realista de overrides de tenant y evento a la vez", () => {
    // Un salón "gestionado" al que se le apaga Dinámicas por contrato,
    // pero en un evento puntual se le enciende Realtime y se reactiva Dinámicas.
    const ent = resolveEntitlements(
      planGestionado,
      { [F.Dinamicas]: false }, // el cliente no contrató dinámicas
      { [F.Dinamicas]: true, [F.Realtime]: true }, // este evento sí las quiere + realtime
    );
    expect(tieneFuncion(ent, F.Dinamicas)).toBe(true);
    expect(tieneFuncion(ent, F.Realtime)).toBe(true);
    expect(tieneFuncion(ent, F.Muro)).toBe(true); // el resto del plan, intacto
    expect(tieneFuncion(ent, F.SyncColectivo)).toBe(true);
  });

  it("es DETERMINISTA incluso con overrides de evento (mismas entradas → misma salida)", () => {
    const args = [planGestionado, { [F.Album]: false }, { [F.Realtime]: true }] as const;
    const a = resolveEntitlements(...args);
    const b = resolveEntitlements(...args);
    expect(a).toEqual(b);
  });
});
