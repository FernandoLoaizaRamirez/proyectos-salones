import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mensajeDeSubida } from "../../packages/sync/src/index";

/**
 * EL PAQUETE DE VIDEO TIENE QUE SEGUIR SIENDO DE PAGO (0017).
 * ---------------------------------------------------------------------------
 * Hermana de `candado-sobrescritura.test.ts`: lee los ARCHIVOS, así que corre
 * sin Supabase, no se salta nunca y pone el CI en rojo si alguien afloja el
 * candado sin querer.
 *
 * QUÉ PROTEGE, Y POR QUÉ NO BASTA CON ESCONDER EL BOTÓN:
 *   El video se vende aparte porque cuesta: una foto se comprime a ~250 KB y un
 *   video sube tal cual hasta 25 MB. Un video pesa como CIEN fotos, y todos los
 *   eventos comparten el mismo almacén.
 *
 *   Esconder el botón en la pantalla no cierra nada —quien manipule la petición
 *   la manda igual—, así que la prueba que de verdad importa es que
 *   `media-subir` PREGUNTE a la base antes de firmar la subida de un video. Es
 *   la misma lección de la llave de anfitrión: la interfaz decide qué se dibuja,
 *   el servidor decide qué se permite.
 *
 *   Y vigila algo que se rompe muy fácil al refactorizar: que el cliente NO se
 *   caiga al "camino viejo" de subida cuando el servidor dice 402. Ese camino no
 *   pregunta por el paquete, así que colaría por detrás justo lo que se acaba de
 *   negar por delante.
 */

const RAIZ = join(__dirname, "..", "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");
const NOMBRE = "0017_paquete_video.sql";

/** El SQL que de verdad se ejecuta: sin las líneas comentadas. */
function sqlActivo(archivo: string): string {
  return readFileSync(join(MIGRACIONES, archivo), "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
}

const leer = (...ruta: string[]) => readFileSync(join(RAIZ, ...ruta), "utf8");

describe("La migración 0017 crea la función vendible y la respuesta única", () => {
  it("la migración existe", () => {
    expect(readdirSync(MIGRACIONES)).toContain(NOMBRE);
  });

  it("da de alta la función vendible `video`", () => {
    expect(sqlActivo(NOMBRE)).toMatch(/insert\s+into\s+features[\s\S]{0,200}'video'/i);
  });

  it("crea `evento_tiene_funcion`, la ÚNICA respuesta para el navegador y el servidor", () => {
    // Si cada lado lo calculara por su cuenta habría dos motores comerciales que
    // pueden discrepar, y el que mandaría sería justo el equivocado.
    expect(sqlActivo(NOMBRE)).toMatch(
      /create\s+or\s+replace\s+function\s+evento_tiene_funcion\s*\(\s*p_codigo\s+text\s*,\s*p_clave\s+text\s*\)/i,
    );
  });

  it("ante la duda responde que NO: evento desconocido o parámetros vacíos", () => {
    const sql = sqlActivo(NOMBRE);
    // Sin esto, un código inventado heredaría lo que trajese un plan nulo.
    expect(sql).toMatch(/if\s+v_event_id\s+is\s+null\s+then[\s\S]{0,60}return\s+false/i);
    expect(sql).toMatch(/p_codigo\s+is\s+null[\s\S]{0,120}return\s+false/i);
  });

  it("respeta la misma precedencia que `resolveEntitlements`: plan → salón → evento", () => {
    const sql = sqlActivo(NOMBRE);
    const plan = sql.search(/plan_features/i);
    const salon = sql.search(/tenant_entitlements/i);
    const evento = sql.search(/event_overrides/i);
    expect(plan).toBeGreaterThan(-1);
    expect(salon).toBeGreaterThan(plan);
    // El override del EVENTO va el último porque tiene la última palabra: es lo
    // que permite venderle el video a una boda suelta sin tocarle el plan al salón.
    expect(evento).toBeGreaterThan(salon);
  });

  it("el navegador puede preguntar (si no, no hay forma de esconder el botón)", () => {
    expect(sqlActivo(NOMBRE)).toMatch(
      /grant\s+execute\s+on\s+function\s+evento_tiene_funcion\s*\(\s*text\s*,\s*text\s*\)\s+to\s+anon/i,
    );
  });

  it("SOLO el plan nuevo trae video: ahí está la diferencia por la que se cobra", () => {
    const sql = sqlActivo(NOMBRE);
    expect(sql).toMatch(/\(\s*'gestionado-video'\s*,\s*'video'\s*\)/i);
    // Si alguien se lo añade a un plan que no lo paga, esto se pone rojo.
    for (const plan of ["gestionado", "renta", "compra"]) {
      expect(sql).not.toMatch(new RegExp(`\\(\\s*'${plan}'\\s*,\\s*'video'\\s*\\)`, "i"));
    }
  });
});

describe("El candado de verdad: `media-subir` pregunta antes de firmar un video", () => {
  const fuente = leer("supabase", "functions", "media-subir", "index.ts");

  it("le pregunta a la base por la función 'video'", () => {
    expect(fuente).toMatch(/rpc\/evento_tiene_funcion/);
    expect(fuente).toMatch(/p_clave:\s*"video"/);
  });

  it("niega la subida de un video sin paquete, y lo dice con 402", () => {
    // 402 y no 403: no es que al invitado le falte un permiso, es que el evento
    // no contrató la función. La app lo distingue para no enseñar el mensaje de
    // "revisa tu conexión" ante algo que la conexión no va a arreglar.
    expect(fuente).toMatch(
      /tipo\.startsWith\("video\/"\)\s*&&\s*!\(await\s+tienePaqueteDeVideo\(evento\)\)[\s\S]{0,300}402/,
    );
  });

  it("pregunta ANTES de gastar cupo: una subida que se va a negar no cuesta nada", () => {
    const pregunta = fuente.indexOf("await tienePaqueteDeVideo(evento)");
    const cupo = fuente.indexOf("await cabeUnaSubidaMas(evento, usado)");
    expect(pregunta).toBeGreaterThan(-1);
    expect(cupo).toBeGreaterThan(-1);
    expect(pregunta).toBeLessThan(cupo);
  });
});

describe("El cliente no cuela el video por la puerta de atrás", () => {
  const sync = leer("packages", "sync", "src", "index.ts");

  it("un 402 LANZA, no devuelve null", () => {
    // Devolver null mandaría la subida por el "camino viejo" (subida directa),
    // que no pregunta por el paquete. Sería regalar justo lo que se acaba de
    // negar. Mismo trato que el tope de subidas (429).
    expect(sync).toMatch(/res\.status\s*===\s*402\)\s*throw\s+new\s+Error\("video-no-incluido"\)/);
  });

  it("y el `catch` lo deja pasar en vez de tragárselo", () => {
    // El catch de `pedirPermisoSubida` convierte cualquier fallo en `null` (que
    // significa "tira por el camino viejo"). Si no se re-lanza aquí, el throw de
    // arriba no sirve de nada.
    //
    // Desde la 0018 los cortes viven en una lista (`CORTES_DEL_SERVIDOR`) en vez
    // de en un `if` encadenado, justo para que al añadir el siguiente no se
    // olvide esta mitad. La lista completa se comprueba en
    // `cupo-almacenamiento.test.ts`; aquí basta con que el video esté dentro.
    expect(sync).toMatch(/CORTES_DEL_SERVIDOR\.has\(e\.message\)\)\s*throw\s+e/);
    expect(sync).toMatch(/CORTES_DEL_SERVIDOR\s*=\s*new\s+Set\(\[[\s\S]{0,200}"video-no-incluido"/);
  });

  it("al invitado se le dice qué SÍ puede hacer, sin hablarle de dinero", () => {
    const msg = mensajeDeSubida(new Error("video-no-incluido"));
    expect(msg).toMatch(/solo se pueden subir fotos/i);
    // El invitado no contrató nada: culparle a él, o pedirle que pague, sería
    // echarle encima un problema que no es suyo.
    expect(msg).not.toMatch(/pag|contrat|plan|cuesta/i);
  });

  it("no se confunde con el tope de subidas ni con un fallo de red", () => {
    expect(mensajeDeSubida(new Error("tope-de-subidas"))).not.toEqual(
      mensajeDeSubida(new Error("video-no-incluido")),
    );
    expect(mensajeDeSubida(new Error("vaya"))).toMatch(/conexión/i);
  });

  it("ante la duda (sin red, evento desconocido) se esconde", () => {
    // Enseñar un botón de video que el servidor va a rechazar es peor que no
    // enseñarlo: el invitado graba el momento, lo intenta subir y lo pierde.
    expect(sync).toMatch(/catch\s*\{[\s\S]{0,220}return\s+false;/);
  });
});

describe("Los dos álbumes esconden el video cuando no está contratado", () => {
  const albumes = [
    ["app suelta", join("apps", "album-fotos", "src", "components", "album.tsx")],
    ["portal", join("apps", "portal", "src", "modulos", "album", "album-modulo.tsx")],
  ] as const;

  for (const [cual, ruta] of albumes) {
    it(`${cual}: el selector solo ofrece video si hay paquete`, () => {
      expect(leer(ruta)).toMatch(/accept=\{conVideo\s*\?\s*"image\/\*,video\/\*"\s*:\s*"image\/\*"\}/);
    });

    it(`${cual}: arrastrar un video tampoco cuela`, () => {
      // `accept` solo gobierna el selector de archivos. Un archivo SOLTADO encima
      // de la zona de subida se lo salta, así que el filtro tiene que estar
      // también en el código que recibe la lista.
      expect(leer(ruta)).toMatch(/conVideo\s*&&\s*a\.type\.startsWith\("video\/"\)|conVideo\s*\|\|\s*!esVideo\(a\.type\)/);
    });
  }

  it("el portal lo resuelve en el servidor, con los entitlements del evento", () => {
    // Así la primera pintada ya sabe si el video va: no hay parpadeo ni espera.
    expect(leer("apps", "portal", "src", "app", "album", "page.tsx")).toMatch(
      /conVideo=\{tieneFuncion\(config\.entitlements,\s*F\.Video\)\}/,
    );
  });

  it("la función `video` existe en el motor comercial de core", () => {
    expect(leer("packages", "core", "src", "entitlements.ts")).toMatch(/Video:\s*"video"/);
  });
});
