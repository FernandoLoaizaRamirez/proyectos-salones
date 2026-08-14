import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COLECCION_INVITACION,
  idInvitacion,
  invitacionDe,
  normalizarInvitacion,
} from "../../packages/core/src/invitacion";
import { enlaceInvitacion } from "../../apps/catalogo/src/lib/pantallas";

/**
 * LA INVITACIÓN QUE EL SALÓN CAPTURA EN SU PANEL.
 * ---------------------------------------------------------------------------
 * Tres cosas tienen que cuadrar para que esto sea un producto y no una demo:
 *
 *   1. EL ENLACE QUE SE MANDA POR WHATSAPP lleva el código del evento. Sin `?e=`
 *      todos los invitados de todas las bodas verían la misma invitación de
 *      muestra, que es exactamente lo que había antes.
 *
 *   2. LA GUARDA Y LA LEE EL MISMO SITIO. El panel escribe con un identificador
 *      y la invitación lo busca por ese identificador: si dejan de coincidir, el
 *      salón captura una boda entera y el invitado ve "se está preparando".
 *
 *   3. SOLO EL ANFITRIÓN LA PUEDE CAMBIAR. Eso no lo decide el código de la
 *      pantalla, lo decide la base: la colección `invitacion` NO está en la
 *      lista blanca del candado de la 0016, así que reescribirla exige el pase
 *      de anfitrión. Si algún día alguien la apuntara en esa lista, cualquiera
 *      con el enlace de la boda podría cambiar la fecha o el lugar del evento.
 *      Por eso se vigila aquí, leyendo el SQL.
 *
 * Corre sin Supabase y sin navegador.
 */

describe("El enlace de la invitación", () => {
  it("apunta a la app de invitaciones con el código del evento", () => {
    const enlace = enlaceInvitacion("boda-garcia-x7k2");
    expect(enlace).toMatch(/^https?:\/\//);
    expect(enlace).toContain("?e=boda-garcia-x7k2");
    // Sin barra doble: `baseDeApp` ya quita la final y aquí se pone una sola.
    expect(enlace.replace(/^https?:\/\//, "")).not.toContain("//");
  });

  it("dos eventos distintos NO comparten enlace", () => {
    expect(enlaceInvitacion("boda-garcia")).not.toBe(enlaceInvitacion("xv-renata"));
  });
});

describe("Lo que guarda el panel es lo que lee la invitación", () => {
  const codigo = "boda-garcia-x7k2";

  /** Tal cual lo manda la pantalla del panel al pulsar «Guardar invitación». */
  const guardado = {
    ...normalizarInvitacion({
      tipo: "boda",
      novia: "Ana",
      novio: "Rodrigo",
      fechaISO: "2027-03-20T18:00",
      ceremonia: { titulo: "Ceremonia", hora: "6:00 pm", lugar: "Capilla Santa Renata" },
    }),
    id: idInvitacion(codigo),
  };

  it("la fila viaja en la colección `invitacion`", () => {
    expect(COLECCION_INVITACION).toBe("invitacion");
  });

  it("la invitación la encuentra y la pinta con esos datos", () => {
    const leida = invitacionDe(codigo, [guardado]);
    expect(leida?.novia).toBe("Ana");
    expect(leida?.ceremonia.lugar).toBe("Capilla Santa Renata");
    // Lo que el salón no capturó no se inventa: se queda vacío y esa sección
    // de la invitación no se dibuja.
    expect(leida?.recepcion.lugar).toBe("");
  });

  it("guardar dos veces CORRIGE la invitación, no crea una segunda", () => {
    // El id no depende de la hora ni del azar: es el mismo siempre, y `guardar`
    // de @salones/sync es un "mete o actualiza" por id.
    const otraVez = { ...guardado, novia: "Ana María" };
    expect(otraVez.id).toBe(guardado.id);
    expect(invitacionDe(codigo, [otraVez])?.novia).toBe("Ana María");
  });
});

describe("Solo quien organiza puede cambiar la invitación", () => {
  const SQL = join(__dirname, "..", "..", "supabase", "migrations", "0016_candado_sobrescritura.sql");

  /** El SQL que de verdad se ejecuta: sin las líneas comentadas. */
  const sqlActivo = readFileSync(SQL, "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");

  it("`invitacion` NO está en la lista de colecciones reescribibles", () => {
    /*
     * Este es EL candado de esta pantalla, y no está en el código de la
     * pantalla: está en la base. Todo lo que no aparezca en
     * `items_reescribibles` nace cerrado, así que un invitado que reescriba la
     * fila de la invitación recibe un 403.
     *
     * Si alguien apuntara `invitacion` en esa lista, cualquiera con el enlace de
     * la boda podría cambiar la fecha, el lugar o la CLABE de la mesa de
     * regalos. Esta prueba se pondría roja antes de que llegara a producción.
     */
    const listaBlanca = /insert\s+into\s+items_reescribibles[\s\S]*?on\s+conflict/i.exec(sqlActivo);
    expect(listaBlanca, "no se encontró la lista blanca en la 0016").not.toBeNull();
    expect(listaBlanca![0]).not.toMatch(/'invitacion'/);
  });

  it("el disparador que lo aplica sigue enganchado", () => {
    expect(sqlActivo).toMatch(
      /create\s+trigger\s+trg_items_candado_sobrescritura[\s\S]{0,120}before\s+insert\s+or\s+update\s+on\s+items/i,
    );
  });
});
