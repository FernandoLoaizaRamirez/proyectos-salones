import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mensajesIniciales as semillaPortal } from "../../apps/portal/src/modulos/muro/lib";
import { mensajesIniciales as semillaApp } from "../../apps/muro/src/lib/muro";

/**
 * EL MURO DEL PORTAL TIENE QUE ABRIR LLENO EN LA DEMO.
 * ---------------------------------------------------------------------------
 * Hasta el 22 ago 2026, el muro del portal abría diciendo "Aún no hay mensajes.
 * ¡Sé el primero en firmar!". Delante del dueño de un salón, un libro de firmas
 * vacío parece un formulario de contacto cualquiera: es lo contrario de lo que
 * vende esta app. La app suelta del muro sí sembraba sus 8 ejemplos; el módulo
 * del portal, que escribe la MISMA colección, no.
 *
 * LO QUE PROTEGE ESTA PRUEBA (las tres formas de que vuelva a pasar):
 *
 *   1. Que alguien quite la siembra del módulo y el muro del portal vuelva a
 *      abrir vacío sin que nadie se entere hasta enseñárselo a un cliente.
 *
 *   2. Que las dos semillas se separen. Portal y app suelta escriben la misma
 *      colección ("mensajes") del mismo evento, así que si cada una siembra su
 *      propia versión, el visitante ve una boda distinta según por dónde entre
 *      —y con los mismos ids, la primera en escribir gana y la otra queda
 *      contradiciéndose.
 *
 *   3. Que las fotos de la semilla no existan en el portal. Compilan igual y
 *      la prueba de tipos pasa: el fallo solo se ve con los ojos, como tres
 *      marcos rotos en medio del muro.
 *
 * Corre sin Supabase y no se salta nunca: lee los archivos.
 */

const raiz = join(__dirname, "..", "..");
const modulo = readFileSync(
  join(raiz, "apps/portal/src/modulos/muro/muro-modulo.tsx"),
  "utf8",
);

describe("El muro del portal en la demo", () => {
  it("siembra los ejemplos, y solo donde el resto del proyecto lo hace", () => {
    // En modo local (nada sale del teléfono) y en la vitrina PROPIA del
    // visitante. En el "demo" compartido conectado no: allí los ids serían
    // fijos y globales, y se pisarían entre visitantes.
    expect(modulo).toContain('sync.nombre === "local" || esVitrinaPropia(evento)');
    // Con el sufijo de la vitrina en cada id, que es lo que evita el choque
    // contra la llave primaria global de `items`.
    expect(modulo).toContain("idDeEjemplo(m.id, evento)");
    // Y se pregunta con `listar` (la colección entera), no con lo que trae el
    // sondeo: si esta vitrina ya tiene mensajes, no se toca nada.
    expect(modulo).toMatch(/listar<Mensaje>\(evento, COLECCION_MENSAJES\)/);
  });

  it("UNA BODA DE VERDAD NUNCA recibe los ejemplos, ni con el portal sin llaves", () => {
    /*
     * La condición de sembrar tiene que colgar de `esVitrina(evento)`, igual
     * que en el acomodo (`modulos/mesas`) y en el ranking de la trivia
     * (`modulos/dinamicas/use-ranking.ts`).
     *
     * El motivo: `sync.nombre === "local"` NO habla del evento, habla del
     * despliegue. Un portal que se quede sin sus llaves de Supabase —le pasó en
     * agosto a invitaciones y a photobooth, y por eso existe
     * `apps-conectadas.test.ts`— se pone en modo local para TODOS los eventos,
     * incluida la boda de un cliente que pagó. Sin este candado, esa boda
     * abriría con ocho firmas de invitados inventados y fotos de otra boda.
     * Un muro vacío se ve roto; uno con firmas falsas se ve auténtico.
     */
    expect(modulo).toMatch(
      /esVitrina\(evento\)\s*&&\s*\(\s*sync\.nombre === "local" \|\| esVitrinaPropia\(evento\)\s*\)/,
    );
    // Y que no se cuele una siembra por otra puerta: la única llamada a
    // `guardar` con datos de ejemplo es la que cuelga de esa condición.
    const siembras = modulo.match(/mensajesIniciales\(\)/g) ?? [];
    expect(siembras).toHaveLength(1);
  });

  it("no dice 'aún no hay mensajes' mientras todavía está cargando", () => {
    // El parpadeo también vende mal: mientras no llega el primer dato, un muro
    // vacío significa "no sabemos", no "nadie ha firmado".
    expect(modulo).toContain("cargando || sembrando");
  });

  it("cuenta la MISMA boda que la app suelta del muro", () => {
    const portal = semillaPortal();
    const app = semillaApp();
    expect(portal).toHaveLength(app.length);
    expect(portal.map((m) => m.id)).toEqual(app.map((m) => m.id));
    expect(portal.map((m) => m.nombre)).toEqual(app.map((m) => m.nombre));
    expect(portal.map((m) => m.texto)).toEqual(app.map((m) => m.texto));
    // Y las mismas fotos: si divergen, el que siembre primero deja al otro
    // enseñando rutas que en su carpeta no existen.
    expect(portal.map((m) => m.foto ?? null)).toEqual(app.map((m) => m.foto ?? null));
  });

  it("las fotos de la semilla existen en las DOS apps", () => {
    const fotos = semillaPortal()
      .map((m) => m.foto)
      .filter((f): f is string => Boolean(f));
    // Que haya fotos es parte del argumento: un muro de puro texto luce pobre.
    expect(fotos.length).toBeGreaterThan(0);
    for (const foto of fotos) {
      expect(foto.startsWith("/")).toBe(true);
      for (const app of ["apps/portal", "apps/muro"]) {
        expect(existsSync(join(raiz, app, "public", foto.slice(1)))).toBe(true);
      }
    }
  });

  it("el muro abre con bastantes mensajes como para que se vea lleno", () => {
    // Media docena larga: con dos o tres el muro sigue pareciendo recién
    // estrenado, que es justo la impresión que se quiere evitar.
    expect(semillaPortal().length).toBeGreaterThanOrEqual(8);
  });
});
