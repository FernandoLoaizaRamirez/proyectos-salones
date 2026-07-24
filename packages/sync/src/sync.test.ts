import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * PRUEBAS DE @salones/sync — el lado del NAVEGADOR de esta rama.
 * ---------------------------------------------------------------------------
 * Las pruebas de `tests/aislamiento/` comprueban los candados del SERVIDOR
 * (migraciones 0009/0010/0013 y las funciones de Supabase), pero se saltan
 * solas mientras eso no esté desplegado. Estas cubren la otra mitad, la que ya
 * está en el navegador de cada invitado y se puede probar hoy mismo:
 *
 *   - `claveAnfitrion`  → cómo se recibe, se valida y se recuerda la LLAVE DEL
 *     ANFITRIÓN (el `&a=` de su enlace privado). Quien la tenga puede borrar,
 *     así que importa que no se acepte cualquier cosa y que la llave de una boda
 *     no sirva para otra.
 *   - `esAnfitrion` / `sufijoAnfitrion` → qué botones se dibujan y cómo viaja la
 *     llave entre pantallas. **No son el candado** (el candado está en la base),
 *     pero si fallan, el anfitrión se queda sin poder moderar su propio evento.
 *   - `eventoActual` / `sufijoEvento` → la burbuja de cada evento.
 *   - `resolverMedios` → la promesa de la migración 0013: NUNCA estropear una
 *     dirección de foto que ya funcionaba.
 *
 * CÓMO SE MONTAN: el módulo guarda estado (el proveedor se construye una sola
 * vez y se cachea), así que cada caso lo recarga de cero con `vi.resetModules()`
 * y le pone delante un navegador de mentira con su enlace y su almacenamiento.
 * Sin las variables de Supabase el módulo cae en MODO LOCAL y no toca la red.
 */

const ENV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ENV_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Una llave con el formato que genera la migración 0009 (24 hex). */
const LLAVE = "9f3c2b1a4d5e6f708a9b0c1d";
const OTRA_LLAVE = "0011223344556677889900aa";

type Opciones = {
  /** El "?e=…&a=…" del enlace con el que se abrió la app. */
  busqueda?: string;
  /** Lo que este dispositivo ya tenía recordado. */
  almacen?: Record<string, string>;
  /** ¿Hay Supabase configurado? (false = modo local, un solo dispositivo) */
  servidor?: boolean;
  /** Simula un navegador sin almacenamiento (modo privado, cuota llena). */
  almacenRoto?: boolean;
  /** false = corriendo en el servidor, sin navegador. */
  navegador?: boolean;
};

/** Carga @salones/sync de cero, con el navegador de mentira que se le indique. */
async function cargarSync(o: Opciones = {}) {
  vi.resetModules();
  vi.unstubAllGlobals();

  if (o.servidor) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://falso.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_de_mentira";
  } else {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  const guardado: Record<string, string> = { ...(o.almacen ?? {}) };
  const revienta = () => {
    throw new Error("almacenamiento bloqueado");
  };

  if (o.navegador !== false) {
    vi.stubGlobal("window", {
      location: { search: o.busqueda ?? "" },
      localStorage: o.almacenRoto
        ? { getItem: revienta, setItem: revienta, removeItem: revienta }
        : {
            getItem: (k: string) => (k in guardado ? guardado[k] : null),
            setItem: (k: string, v: string) => {
              guardado[k] = v;
            },
            removeItem: (k: string) => {
              delete guardado[k];
            },
          },
      addEventListener: () => {},
      removeEventListener: () => {},
      setInterval: () => 0,
      clearInterval: () => {},
    });
  }

  const sync = await import("./index");
  return { sync, guardado };
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (ENV_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ENV_URL;
  if (ENV_ANON === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ENV_ANON;
});

describe("claveAnfitrion — la llave privada de quien organiza", () => {
  it("en el servidor (sin navegador) no hay llave", async () => {
    const { sync } = await cargarSync({ navegador: false });
    expect(sync.claveAnfitrion("boda-ana")).toBeNull();
  });

  it("la llave llega en el enlace y queda recordada en este dispositivo", async () => {
    // Así el anfitrión no tiene que volver a pegar su enlace en cada pantalla.
    const { sync, guardado } = await cargarSync({ busqueda: `?e=boda-ana&a=${LLAVE}` });
    expect(sync.claveAnfitrion("boda-ana")).toBe(LLAVE);
    expect(guardado["salones:anfitrion:boda-ana"]).toBe(LLAVE);
  });

  it("sin llave en el enlace, se usa la que este dispositivo ya recordaba", async () => {
    const { sync } = await cargarSync({
      busqueda: "?e=boda-ana",
      almacen: { "salones:anfitrion:boda-ana": LLAVE },
    });
    expect(sync.claveAnfitrion("boda-ana")).toBe(LLAVE);
  });

  it("la llave del enlace pisa a la recordada", async () => {
    // Si el anfitrión abre un enlace nuevo, manda el nuevo.
    const { sync, guardado } = await cargarSync({
      busqueda: `?e=boda-ana&a=${OTRA_LLAVE}`,
      almacen: { "salones:anfitrion:boda-ana": LLAVE },
    });
    expect(sync.claveAnfitrion("boda-ana")).toBe(OTRA_LLAVE);
    expect(guardado["salones:anfitrion:boda-ana"]).toBe(OTRA_LLAVE);
  });

  it("la llave de UNA boda no abre otra", async () => {
    // Cada evento es su propia burbuja: es lo que impide que el anfitrión de un
    // evento pueda moderar (y borrar) el de otro.
    const { sync } = await cargarSync({
      almacen: { "salones:anfitrion:boda-ana": LLAVE },
    });
    expect(sync.claveAnfitrion("boda-ana")).toBe(LLAVE);
    expect(sync.claveAnfitrion("boda-beto")).toBeNull();
  });

  it("no se acepta cualquier cosa como llave", async () => {
    const malas = [
      "corta", // menos de 8 caracteres
      "a".repeat(129), // más de 128
      "abc!def@ghi#jkl", // caracteres que la 0009 nunca genera
      "clave con espacios",
      "<script>alert(1)</script>",
    ];
    for (const mala of malas) {
      const { sync, guardado } = await cargarSync({
        busqueda: `?e=boda-ana&a=${encodeURIComponent(mala)}`,
      });
      expect(sync.claveAnfitrion("boda-ana")).toBeNull();
      // Y tampoco se queda recordada una llave que no vale.
      expect(guardado["salones:anfitrion:boda-ana"]).toBeUndefined();
    }
  });

  it("una llave válida justo en el límite (8 caracteres) sí se acepta", async () => {
    const { sync } = await cargarSync({ busqueda: "?e=boda-ana&a=abcd1234" });
    expect(sync.claveAnfitrion("boda-ana")).toBe("abcd1234");
  });

  it("si el almacenamiento está bloqueado, la llave del enlace sigue sirviendo", async () => {
    // Navegador en modo privado o con la cuota llena: no se puede recordar, pero
    // el anfitrión no debe quedarse fuera de su propio evento.
    const { sync } = await cargarSync({
      busqueda: `?e=boda-ana&a=${LLAVE}`,
      almacenRoto: true,
    });
    expect(sync.claveAnfitrion("boda-ana")).toBe(LLAVE);
  });

  it("si el almacenamiento está bloqueado y no hay llave en el enlace, no revienta", async () => {
    const { sync } = await cargarSync({ busqueda: "?e=boda-ana", almacenRoto: true });
    expect(sync.claveAnfitrion("boda-ana")).toBeNull();
  });
});

describe("olvidarClaveAnfitrion — soltar la llave de una pantalla prestada", () => {
  it("olvida la de este evento y no toca la de otro", async () => {
    const { sync, guardado } = await cargarSync({
      almacen: {
        "salones:anfitrion:boda-ana": LLAVE,
        "salones:anfitrion:boda-beto": OTRA_LLAVE,
      },
    });
    sync.olvidarClaveAnfitrion("boda-ana");
    expect(guardado["salones:anfitrion:boda-ana"]).toBeUndefined();
    expect(guardado["salones:anfitrion:boda-beto"]).toBe(OTRA_LLAVE);
  });

  it("con el almacenamiento bloqueado no revienta", async () => {
    const { sync } = await cargarSync({ almacenRoto: true });
    expect(() => sync.olvidarClaveAnfitrion("boda-ana")).not.toThrow();
  });
});

describe("esAnfitrion — qué botones se dibujan (no es el candado)", () => {
  it("en modo local (un solo dispositivo) siempre es anfitrión", async () => {
    const { sync } = await cargarSync({ servidor: false });
    expect(sync.esAnfitrion("boda-ana")).toBe(true);
  });

  it("con servidor, la demo se puede moderar sin llave", async () => {
    const { sync } = await cargarSync({ servidor: true });
    expect(sync.esAnfitrion("demo")).toBe(true);
  });

  it("con servidor, un evento real SIN llave no es anfitrión", async () => {
    const { sync } = await cargarSync({ servidor: true, busqueda: "?e=boda-ana" });
    expect(sync.esAnfitrion("boda-ana")).toBe(false);
  });

  it("con servidor, un evento real CON llave sí lo es", async () => {
    const { sync } = await cargarSync({
      servidor: true,
      busqueda: `?e=boda-ana&a=${LLAVE}`,
    });
    expect(sync.esAnfitrion("boda-ana")).toBe(true);
  });

  it("con servidor, una llave inválida no convierte a nadie en anfitrión", async () => {
    const { sync } = await cargarSync({ servidor: true, busqueda: "?e=boda-ana&a=corta" });
    expect(sync.esAnfitrion("boda-ana")).toBe(false);
  });
});

describe("sufijoAnfitrion — cómo viaja la llave entre pantallas", () => {
  it("con llave, el sufijo lleva el evento y la llave", async () => {
    const { sync } = await cargarSync({
      servidor: true,
      busqueda: `?e=boda-ana&a=${LLAVE}`,
    });
    expect(sync.sufijoAnfitrion("boda-ana")).toBe(`?e=boda-ana&a=${LLAVE}`);
  });

  it("sin llave NO se inventa una: cae al sufijo normal", async () => {
    const { sync } = await cargarSync({ servidor: true, busqueda: "?e=boda-ana" });
    expect(sync.sufijoAnfitrion("boda-ana")).toBe("?e=boda-ana");
  });

  it("en la demo sin llave, el sufijo va vacío", async () => {
    const { sync } = await cargarSync({ servidor: true });
    expect(sync.sufijoAnfitrion("demo")).toBe("");
  });
});

describe("eventoActual — la burbuja de cada evento", () => {
  it("sin navegador cae en la demo", async () => {
    const { sync } = await cargarSync({ navegador: false });
    expect(sync.eventoActual()).toBe("demo");
    expect(sync.eventoActual("otro")).toBe("otro");
  });

  it("lee el código del enlace", async () => {
    const { sync } = await cargarSync({ busqueda: "?e=boda-garcia-x7k2" });
    expect(sync.eventoActual()).toBe("boda-garcia-x7k2");
  });

  it("un código con caracteres raros se ignora y cae en la demo", async () => {
    for (const malo of ["boda ana", "<script>", "boda/../otra", "a".repeat(61)]) {
      const { sync } = await cargarSync({ busqueda: `?e=${encodeURIComponent(malo)}` });
      expect(sync.eventoActual()).toBe("demo");
    }
  });

  it("un código de 60 caracteres (el límite) sí vale", async () => {
    const limite = "a".repeat(60);
    const { sync } = await cargarSync({ busqueda: `?e=${limite}` });
    expect(sync.eventoActual()).toBe(limite);
  });

  it("sufijoEvento va vacío en la demo y lleva el código en un evento real", async () => {
    const demo = await cargarSync({ busqueda: "" });
    expect(demo.sync.sufijoEvento()).toBe("");
    const boda = await cargarSync({ busqueda: "?e=boda-ana" });
    expect(boda.sync.sufijoEvento()).toBe("?e=boda-ana");
  });
});

describe("resolverMedios — la promesa de la 0013: nunca romper una foto", () => {
  it("sin servidor central, devuelve cada dirección tal cual", async () => {
    const { sync } = await cargarSync({ servidor: false });
    const direcciones = [
      "/img/ejemplo.jpg", // foto de ejemplo del propio sitio
      "data:image/png;base64,iVBORw0KGgo=", // firma del muro
      "blob:http://localhost/abc-123", // archivo del modo local
      "https://falso.supabase.co/storage/v1/object/public/media/boda-ana/1.jpg",
      "https://otro-sitio.mx/foto.jpg",
    ];

    const mapa = await sync.resolverMedios("boda-ana", direcciones);

    // Ninguna se pierde y ninguna se estropea.
    expect(Object.keys(mapa)).toHaveLength(direcciones.length);
    for (const d of direcciones) expect(mapa[d]).toBe(d);
  });

  it("una lista vacía no devuelve nada, y no falla", async () => {
    const { sync } = await cargarSync({ servidor: false });
    await expect(sync.resolverMedios("boda-ana", [])).resolves.toEqual({});
  });

  it("dos veces la misma dirección no se estorban", async () => {
    const { sync } = await cargarSync({ servidor: false });
    const d = "https://falso.supabase.co/storage/v1/object/public/media/boda-ana/1.jpg";
    const mapa = await sync.resolverMedios("boda-ana", [d, d]);
    expect(mapa[d]).toBe(d);
  });
});
