import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cancionesDemo, porVotos, EstadoCancion } from "../../apps/portal/src/modulos/playlist/lib";
import { cancionesIniciales } from "../../apps/playlist/src/lib/playlist";

/**
 * LA PLAYLIST DEL PORTAL TIENE QUE ABRIR CON SU RANKING EN LA DEMO.
 * ---------------------------------------------------------------------------
 * Hasta el 22 ago 2026 la siembra del módulo estaba en código muerto: solo
 * corría con `sync.nombre === "local"`, y en producción el portal nunca corre
 * en local. Resultado medido en vivo: con `?e=demo` salían dos restos de prueba
 * con un voto cada uno, y con la vitrina propia (`?e=demo-xxxxxx`) un "0 en
 * cola" pelado. Lo que se está vendiendo es justo lo contrario —una lista
 * peleada, con votos— y era lo único que no se veía.
 *
 * LO QUE PROTEGE ESTA PRUEBA (las tres formas de que vuelva a pasar):
 *
 *   1. Que la siembra se vuelva a quedar sin sitio donde correr, o que corra
 *      donde no debe. Son dos y solo dos: el modo local y la VITRINA PROPIA del
 *      visitante (con `idDeEjemplo` poniéndole su sufijo a cada id, porque
 *      `items.id` es llave primaria GLOBAL). En el "demo" compartido no, y en un
 *      evento REAL jamás.
 *
 *   2. Que el portal y la app suelta cuenten fiestas distintas. Las dos escriben
 *      la MISMA colección ("canciones") del mismo evento y el catálogo reparte
 *      el código de la vitrina a las dos: siembra la que se abra primero, así
 *      que con semillas distintas el visitante ve una lista según por qué puerta
 *      entre (y si siembran a la vez, "Bailando" aparece dos veces).
 *
 *   3. Que la lista deje de ser un RANKING. Cinco canciones empatadas a un voto
 *      no enseñan nada: lo que vende es ver que la gente vota y que hay una
 *      ganando.
 *
 * Corre sin Supabase y no se salta nunca: lee los archivos.
 */

const raiz = join(__dirname, "..", "..");
const modulo = readFileSync(
  join(raiz, "apps/portal/src/modulos/playlist/playlist-modulo.tsx"),
  "utf8",
);

describe("La playlist del portal en la demo", () => {
  it("siembra donde el resto del proyecto lo hace, y solo ahí", () => {
    // Mismo criterio que el muro, las dinámicas y la app suelta de playlist.
    expect(modulo).toContain('sync.nombre === "local" || esVitrinaPropia(evento)');
    // Con el sufijo de la vitrina en cada id: sin él, dos visitantes se pisarían
    // los ejemplos contra la llave primaria global de `items`.
    expect(modulo).toContain("idDeEjemplo(c.id, evento)");
    // Y se pregunta con `listar` (la colección entera), no con lo que trae el
    // sondeo: si esta vitrina ya tiene canciones, no se toca nada.
    expect(modulo).toMatch(/listar<Cancion>\(evento, COLECCION_CANCIONES\)/);
  });

  it("no dice 'aún no hay canciones' mientras las está trayendo", () => {
    // El parpadeo también vende mal: con la siembra en camino, la lista vacía
    // significa "todavía no sabemos", no "nadie ha pedido nada".
    expect(modulo).toMatch(/sembrando \?[\s\S]{0,400}Trayendo las canciones/);
  });

  it("toca la misma fiesta que la app suelta de playlist", () => {
    const portal = cancionesDemo();
    const app = cancionesIniciales();
    expect(portal).toHaveLength(app.length);
    expect(portal.map((c) => c.id)).toEqual(app.map((c) => c.id));
    expect(portal.map((c) => c.titulo)).toEqual(app.map((c) => c.titulo));
    expect(portal.map((c) => c.artista ?? null)).toEqual(app.map((c) => c.artista ?? null));
    expect(portal.map((c) => c.votos)).toEqual(app.map((c) => c.votos));
    // El estado importa tanto como el título: es lo que le da al panel del DJ
    // su columna de "puesta" y la de "descartada" en vez de dos huecos.
    expect(portal.map((c) => c.estado)).toEqual(app.map((c) => c.estado));
  });

  it("abre con un ranking de verdad, no con empates a un voto", () => {
    // El invitado solo ve las PENDIENTES: son esas las que tienen que llenar la
    // pantalla del teléfono.
    const enCola = cancionesDemo()
      .filter((c) => c.estado === EstadoCancion.Pendiente)
      .sort(porVotos);
    expect(enCola.length).toBeGreaterThanOrEqual(5);
    // Votos distintos y en orden: se tiene que ver quién va ganando.
    expect(new Set(enCola.map((c) => c.votos)).size).toBe(enCola.length);
    expect(enCola[0].votos).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < enCola.length; i++) {
      expect(enCola[i].votos).toBeLessThan(enCola[i - 1].votos);
    }
  });
});
