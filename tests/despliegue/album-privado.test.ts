import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ÁLBUM PRIVADO: cada invitado ve SOLO lo suyo (0022).
 * ---------------------------------------------------------------------------
 * LO QUE MÁS SE VIGILA AQUÍ NO ES LA FUNCIÓN NUEVA. Esta migración reescribe la
 * política de lectura de `items`, que es por donde leen TODAS las apps: el muro,
 * la playlist, el rsvp, las mesas, los pases, las dinámicas. Un fallo ahí no
 * rompe el álbum — deja media suite sin datos, en plena boda. Por eso la mitad
 * de los casos son "esto tiene que seguir exactamente igual".
 *
 * Y la otra mitad vigila que la privacidad sea DE VERDAD: que el servidor no
 * mande las fotos ajenas, en vez de mandarlas y que la pantalla las esconda.
 * Prometer "privado" y enviar los datos igual es peor que no prometerlo.
 */

const RAIZ = join(__dirname, "..", "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");
const NOMBRE = "0022_album_privado.sql";
const leer = (...ruta: string[]) => readFileSync(join(RAIZ, ...ruta), "utf8");

function sqlActivo(archivo: string): string {
  return readFileSync(join(MIGRACIONES, archivo), "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
}

describe("La privacidad la hace valer la BASE, no la pantalla", () => {
  const sql = sqlActivo(NOMBRE);

  it("la migración existe", () => {
    expect(readdirSync(MIGRACIONES)).toContain(NOMBRE);
  });

  it("filtra en la POLÍTICA de lectura, así que las filas ajenas ni se envían", () => {
    // Si esto fuera un filtro en el navegador, el teléfono del invitado
    // recibiría igualmente las fotos de todos y solo dejaría de pintarlas.
    expect(sql).toMatch(/create policy "lectura por evento" on items for select/i);
    expect(sql).toMatch(/dato->>'autorHuella' =[\s\S]{0,120}'x-autor-huella'/);
  });

  it("compara contra la HUELLA, que es lo que ya llevaban las fotos", () => {
    // La llave entera nunca viaja en una lectura: la huella no se puede
    // deshacer, así que aunque alguien la copiara no podría BORRAR nada.
    expect(sql).not.toMatch(/x-autor-llave/);
  });

  it("sin huella no se ve ninguna foto (el lado seguro del error)", () => {
    // Con el encabezado ausente la comparación da NULL y la política no deja
    // pasar la fila. No hay un `or ... is null` que lo abra.
    expect(sql).not.toMatch(/x-autor-huella'\s*\)?\s*is null/i);
  });
});

describe("Lo que NO se puede haber roto", () => {
  const sql = sqlActivo(NOMBRE);

  it("el ANFITRIÓN sigue viéndolo todo, sin presentar huella", () => {
    expect(sql).toMatch(/evento = evento_del_pase_anfitrion\(/);
  });

  it("la condición nueva se limita a la colección `fotos`", () => {
    // Es lo que deja fuera al muro, la playlist, el rsvp, las mesas y los pases.
    expect(sql).toMatch(/coleccion <> 'fotos'/);
  });

  it("y solo se aplica cuando el álbum está marcado como privado", () => {
    expect(sql).toMatch(/not album_es_privado\(evento\)/);
  });

  it("el aislamiento entre bodas no se toca", () => {
    // Las dos ramas siguen atadas a `evento = ...`: sin eso, una huella válida
    // en una boda abriría fotos de otra.
    const ramas = sql.match(/evento = evento_del_pase/g) ?? [];
    expect(ramas.length).toBe(2);
  });

  it("nace PÚBLICO: ningún álbum existente cambia de comportamiento", () => {
    expect(sql).toMatch(/album_privado boolean not null default false/i);
    expect(sql).toMatch(/coalesce\(\(select album_privado from events where codigo = p_codigo\), false\)/i);
  });

  it("no se confunde con `album_cerrado`, que es otra cosa", () => {
    // Cerrado = no admite fotos nuevas. Privado = no ves las de los demás.
    expect(sql).not.toMatch(/set album_cerrado/i);
  });
});

describe("El cliente", () => {
  const sync = leer("packages", "sync", "src", "index.ts");

  it("manda la huella en TODAS las lecturas", () => {
    // Va en `headersDe`, que es por donde pasan todas las peticiones: así no hay
    // que acordarse de añadirla en cada sitio.
    expect(sync).toMatch(/"x-autor-huella": huella/);
  });

  it("la cachea: el sondeo repite la consulta cada tres segundos", () => {
    expect(sync).toMatch(/const huellas = new Map<string, string>\(\)/);
  });

  it("cambiar público/privado exige el pase de anfitrión", () => {
    expect(sync).toMatch(/cambiarPrivado = async \(evento, privado\) => \{[\s\S]{0,160}obtenerPaseAnfitrion/);
  });

  it("el anfitrión tiene el interruptor, con las dos caras explicadas", () => {
    const panel = leer("apps", "album-fotos", "src", "components", "panel-anfitrion.tsx");
    expect(panel).toMatch(/Cada quien ve solo lo suyo/);
    expect(panel).toMatch(/Todos ven las fotos de todos/);
    expect(panel).toMatch(/if \(ok\) setPrivado\(!privado\)/);
  });

  it("el PANEL DEL SALON tiene los dos interruptores, y con que autenticarse", () => {
    // El salon gestiona varias bodas: no va a abrir el enlace privado de cada
    // una para cambiar un ajuste. Pero este panel entra con sesion de staff, no
    // con ese enlace, asi que sin prestarle la llave del evento al navegador los
    // dos botones no tendrian pase de anfitrion que presentar y fallarian.
    const panel = leer("apps", "catalogo", "src", "app", "eventos", "[codigo]", "album", "page.tsx");
    expect(panel).toMatch(/cambiarAlbumCerrado\(codigo, valor\)/);
    expect(panel).toMatch(/cambiarAlbumPrivado\(codigo, valor\)/);
    expect(panel).toMatch(/recordarClaveAnfitrion\(codigo, evento\.clave_anfitrion\)/);
    // Y la ficha del evento tiene que TRAER esa llave, o lo anterior es papel
    // mojado: `obtenerEvento` usa las columnas con `clave_anfitrion`.
    expect(leer("apps", "catalogo", "src", "lib", "eventos.ts")).toMatch(
      /COLUMNAS_FICHA = `\$\{COLUMNAS\},clave_anfitrion`/,
    );
  });

  it("el panel solo pinta el cambio si el servidor lo guardo", () => {
    // Enseñar un album "cerrado" que en realidad sigue abierto es peor que no
    // tener el interruptor.
    const panel = leer("apps", "catalogo", "src", "app", "eventos", "[codigo]", "album", "page.tsx");
    expect(panel).toMatch(/if \(!ok\) \{[\s\S]{0,160}return;/);
  });

  for (const [cual, ruta] of [
    ["app suelta", join("apps", "album-fotos", "src", "components", "album.tsx")],
    ["portal", join("apps", "portal", "src", "modulos", "album", "album-modulo.tsx")],
  ] as const) {
    it(`${cual}: al invitado se le EXPLICA por qué ve pocas fotos`, () => {
      // Sin este aviso vería su álbum casi vacío y pensaría que sus fotos no
      // subieron — y volvería a subirlas, gastando cupo.
      expect(leer(ruta)).toMatch(/privado && !anfitrion \?/);
      expect(leer(ruta)).toMatch(/cada quien ve solo sus propias fotos/i);
    });
  }
});
