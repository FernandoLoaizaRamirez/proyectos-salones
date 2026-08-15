import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mensajeDeSubida } from "../../packages/sync/src/index";

/**
 * CERRAR EL ÁLBUM (0021).
 * ---------------------------------------------------------------------------
 * QUÉ RESUELVE: cuando la boda termina, el álbum seguía abierto para siempre.
 * Cualquiera con el QR —o con una foto del QR hecha en la fiesta— podía seguir
 * subiendo semanas después, y cada foto gastaba el cupo del plan gratis, que es
 * de todas las bodas a la vez.
 *
 * LA REGLA QUE SE VIGILA AQUÍ, porque es la que se rompe sola al refactorizar:
 * **ante la duda, ABIERTO.** Es al revés que el resto de candados de este
 * proyecto (el video, el cupo, la llave de autor), donde la duda se resuelve
 * cerrando. Aquí no: equivocarse hacia el lado cerrado deja a una boda sin poder
 * subir fotos en plena fiesta, y eso no se arregla al día siguiente. Equivocarse
 * hacia el abierto solo cuesta una petición que el servidor rechazará igual.
 */

const RAIZ = join(__dirname, "..", "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");
const NOMBRE = "0021_album_cerrado.sql";
const leer = (...ruta: string[]) => readFileSync(join(RAIZ, ...ruta), "utf8");

function sqlActivo(archivo: string): string {
  return readFileSync(join(MIGRACIONES, archivo), "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
}

describe("La migración 0021: un estado, no una función vendible", () => {
  const sql = sqlActivo(NOMBRE);

  it("la migración existe", () => {
    expect(readdirSync(MIGRACIONES)).toContain(NOMBRE);
  });

  it("es una COLUMNA de events, no una fila en `features`", () => {
    // La trampa que se evitó: si esto viviera en `features` y alguien lo
    // agregara a un plan, cerraría de golpe el álbum de TODOS los eventos de
    // ese plan, y ese fallo sería dificilísimo de entender.
    expect(sql).toMatch(/alter table events add column if not exists album_cerrado boolean/i);
    expect(sql).not.toMatch(/insert into features[\s\S]{0,120}album.cerrado/i);
  });

  it("nace ABIERTO y ante la duda responde abierto", () => {
    expect(sql).toMatch(/album_cerrado boolean not null default false/i);
    // `coalesce(..., false)`: un evento que no existe NO bloquea las subidas.
    expect(sql).toMatch(/coalesce\(\(select album_cerrado from events where codigo = p_codigo\), false\)/i);
  });

  it("cerrar exige el pase de ANFITRIÓN, no el del QR", () => {
    // El del invitado lo tiene cualquiera: si sirviera, un invitado podría
    // dejar sin subir al resto de la boda.
    expect(sql).toMatch(/v_codigo := evento_del_pase_anfitrion\(p_pase\)/);
    expect(sql).toMatch(/if v_codigo is null or v_codigo = ''\s*then[\s\S]{0,40}return false/i);
  });

  it("se puede volver a abrir (es un interruptor, no una puerta de un solo sentido)", () => {
    expect(sql).toMatch(/cerrar_album\(p_pase text, p_cerrado boolean\)/);
    expect(sql).toMatch(/update events set album_cerrado = p_cerrado/);
  });

  it("no se confunde con `evento-cierre`, que entrega y BORRA la boda", () => {
    // Aquella pone `estado='cerrado'` y pide sesión de staff. Si esta migración
    // tocara `estado`, cerrar el álbum parecería haber borrado el evento.
    expect(sql).not.toMatch(/set\s+estado\s*=/i);
  });
});

describe("El candado está en el servidor", () => {
  const fn = leer("supabase", "functions", "media-subir", "index.ts");

  it("pregunta a la base antes de firmar", () => {
    expect(fn).toMatch(/rpc\/album_esta_cerrado/);
  });

  it("con el álbum cerrado responde 423", () => {
    expect(fn).toMatch(/await albumCerrado\(evento\)[\s\S]{0,300}423/);
  });

  it("el ANFITRIÓN sí puede seguir subiendo", () => {
    // Cerrar es para que no entre nada de fuera, no para atarse las manos:
    // después se agregan las fotos del fotógrafo.
    expect(fn).toMatch(/if \(!esAnfitrion && \(await albumCerrado\(evento\)\)\)/);
  });

  it("si la migración no está, se deja pasar (abierto)", () => {
    expect(fn).toMatch(/if \(!res\.ok\) return false;[\s\S]{0,120}catch \{[\s\S]{0,40}return false;/);
  });
});

describe("Las dos pantallas", () => {
  for (const [cual, ruta] of [
    ["app suelta", join("apps", "album-fotos", "src", "components", "album.tsx")],
    ["portal", join("apps", "portal", "src", "modulos", "album", "album-modulo.tsx")],
  ] as const) {
    it(`${cual}: esconde la zona de subir al invitado, no al anfitrión`, () => {
      expect(leer(ruta)).toMatch(/cerrado && !anfitrion \?/);
    });

    it(`${cual}: arranca ABIERTO mientras no se sepa`, () => {
      // Si arrancara cerrado, habría un parpadeo en el que nadie puede subir —y
      // en un teléfono con mala cobertura, ese parpadeo dura toda la fiesta.
      expect(leer(ruta)).toMatch(/const \[cerrado, setCerrado\] = React\.useState\(false\)/);
    });
  }

  it("el anfitrión tiene el interruptor en su panel", () => {
    const panel = leer("apps", "album-fotos", "src", "components", "panel-anfitrion.tsx");
    expect(panel).toMatch(/cambiarAlbumCerrado/);
    expect(panel).toMatch(/Volver a abrirlo/);
    // Solo se pinta el cambio si el servidor dijo que sí: enseñar el
    // interruptor cambiado sin haberlo guardado sería mentir justo en la
    // decisión que menos admite dudas.
    expect(panel).toMatch(/if \(ok\) setCerrado\(!cerrado\)/);
  });

  it("al invitado que lo intente igual se le explica, sin hablarle de la conexión", () => {
    const msg = mensajeDeSubida(new Error("album-cerrado"));
    expect(msg).toMatch(/no admite fotos nuevas/i);
    // Lo importante: que sepa que NO ha perdido nada, solo no puede aportar más.
    expect(msg).toMatch(/viéndolo|descargándolo/i);
    expect(msg).not.toMatch(/conexión/i);
  });

  it("el 423 se re-lanza, no se cuela por el camino viejo", () => {
    const sync = leer("packages", "sync", "src", "index.ts");
    expect(sync).toMatch(/res\.status === 423\) throw new Error\("album-cerrado"\)/);
    expect(sync).toMatch(/"album-cerrado", \/\/ 423/);
  });
});
