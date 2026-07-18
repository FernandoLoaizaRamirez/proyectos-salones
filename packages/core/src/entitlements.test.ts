import { describe, it, expect } from "vitest";
import {
  resolveEntitlements,
  tieneFuncion,
  FEATURES_CONOCIDAS as F,
  type Plan,
} from "./index";

const planGestionado: Plan = {
  id: "gestionado",
  nombre: "Gestionado",
  funciones: [F.Muro, F.Playlist, F.Rsvp, F.Dinamicas, F.Album, F.SyncColectivo],
};

const planRenta: Plan = {
  id: "renta",
  nombre: "Renta",
  funciones: [F.Muro, F.Playlist, F.Rsvp, F.Dinamicas, F.Album],
};

describe("resolveEntitlements", () => {
  it("el plan gestionado habilita sync-colectivo; renta no", () => {
    const g = resolveEntitlements(planGestionado);
    expect(tieneFuncion(g, F.SyncColectivo)).toBe(true);

    const r = resolveEntitlements(planRenta);
    expect(tieneFuncion(r, F.SyncColectivo)).toBe(false);
    // los 5 módulos sí están en renta
    expect(tieneFuncion(r, F.Muro)).toBe(true);
    expect(tieneFuncion(r, F.Album)).toBe(true);
  });

  it("un override de tenant puede APAGAR una función del plan", () => {
    const ent = resolveEntitlements(planGestionado, { [F.Album]: false });
    expect(tieneFuncion(ent, F.Album)).toBe(false);
    expect(tieneFuncion(ent, F.Muro)).toBe(true); // las demás intactas
  });

  it("un override de tenant puede ENCENDER una función extra", () => {
    const ent = resolveEntitlements(planRenta, { [F.Realtime]: true });
    expect(tieneFuncion(ent, F.Realtime)).toBe(true);
  });

  it("el override de EVENTO tiene la última palabra sobre el de tenant", () => {
    const ent = resolveEntitlements(
      planGestionado,
      { [F.Playlist]: false }, // el tenant la apaga
      { [F.Playlist]: true }, // el evento la vuelve a encender
    );
    expect(tieneFuncion(ent, F.Playlist)).toBe(true);
  });

  it("un override de evento puede apagar una función", () => {
    const ent = resolveEntitlements(planGestionado, {}, { [F.Dinamicas]: false });
    expect(tieneFuncion(ent, F.Dinamicas)).toBe(false);
  });

  it("es PURO: no muta los overrides que recibe", () => {
    const overrides = { [F.Album]: false };
    resolveEntitlements(planGestionado, overrides);
    expect(overrides).toEqual({ [F.Album]: false });
  });

  it("es DETERMINISTA: mismas entradas → misma salida", () => {
    const a = resolveEntitlements(planGestionado, { [F.Album]: false });
    const b = resolveEntitlements(planGestionado, { [F.Album]: false });
    expect(a).toEqual(b);
  });
});
