import { describe, it, expect } from "vitest";
import {
  PANTALLAS,
  APPS_CON_LLAVE,
  baseDeApp,
  esInterna,
} from "../../apps/catalogo/src/lib/pantallas";

/**
 * LOS ENLACES DE ANFITRIÓN TIENEN QUE LLEVAR ALGO DENTRO.
 * ---------------------------------------------------------------------------
 * La tarjeta del panel que dice «Copiar mis enlaces de anfitrión» copiaba un
 * texto **sin ni un solo enlace**, y llevaba así desde que se migró la última
 * pantalla hacia dentro del panel.
 *
 * El motivo: construía la lista con `PANTALLAS.filter(p => !esInterna(p))`, o
 * sea "las que todavía viven fuera". Cuando las cinco terminaron de mudarse
 * adentro, esa lista quedó vacía y el botón siguió diciendo «¡Copiado!» igual.
 * Nadie podía notarlo salvo pegando el resultado en algún sitio.
 *
 * Y lo que se perdía no era un adorno: sin ese enlace, quien organiza no tiene
 * la llave en el teléfono, y TODA la moderación construida antes —quitar un
 * mensaje subido de tono, borrar una foto— está muerta en un evento real.
 *
 * Esta prueba es el candado. Corre sin Supabase y sin navegador.
 */

describe("La tarjeta de enlaces de anfitrión no puede quedarse vacía", () => {
  it("hay al menos una app que necesita la llave y vive fuera del panel", () => {
    expect(APPS_CON_LLAVE.length).toBeGreaterThan(0);
  });

  it("cada una tiene una dirección de verdad a la que apuntar", () => {
    // Si `baseDeApp` devolviera "" (porque el producto no está en el catálogo o
    // se quedó sin `demoUrl`), la tarjeta volvería a copiar un texto pelado.
    for (const app of APPS_CON_LLAVE) {
      const base = baseDeApp(app.appId);
      expect(base, `"${app.appId}" no tiene dirección en el catálogo`).not.toBe("");
      expect(base, `la dirección de "${app.appId}" no parece una dirección`).toMatch(/^https?:\/\//);
      expect(base, `la dirección de "${app.appId}" termina en barra`).not.toMatch(/\/$/);
    }
  });

  it("son las dos que escriben con pase de invitado: mesas y la puerta", () => {
    // Están en la lista blanca de `items_reescribibles` (migración 0016) por
    // culpa de esto. El día que se les dé la llave de verdad, sus colecciones
    // (mesas, acomodo, pases, accesos) se pueden cerrar y esta lista cambia.
    expect([...APPS_CON_LLAVE].map((a) => a.appId).sort()).toEqual(["mesas", "pases-qr"]);
  });

  it("no repiten lo que ya vive dentro del panel", () => {
    // Una pantalla interna no necesita enlace con `&a=`: el panel ya tiene la
    // llave en su propio almacenamiento. Duplicarla confundiría a quien copie.
    const dentro = PANTALLAS.filter(esInterna).map((p) => p.appId);
    for (const app of APPS_CON_LLAVE) {
      expect(dentro, `"${app.appId}" ya vive dentro del panel`).not.toContain(app.appId);
    }
  });
});
