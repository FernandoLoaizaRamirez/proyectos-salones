import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  mensajeDeSubida,
  pesaDemasiado,
  textoDeTamano,
  MB_POR_ARCHIVO,
  BYTES_POR_ARCHIVO,
} from "../../packages/sync/src/index";

/**
 * EL CUPO DE ALMACENAMIENTO TIENE QUE SEGUIR MIDIENDO LO REAL (0018).
 * ---------------------------------------------------------------------------
 * Hermana de `paquete-video.test.ts`. Lee los ARCHIVOS, corre sin Supabase y no
 * se salta nunca.
 *
 * LO QUE DE VERDAD PROTEGE:
 *   Desde la 0017 el video se cobra, pero cobrar sin medir deja el costo
 *   abierto: el almacenamiento se paga mientras el archivo exista. El cupo es lo
 *   que le pone techo.
 *
 *   Y hay una forma sutil de romperlo que esta prueba vigila: que alguien
 *   "simplifique" la cuenta fiandose del tamaño que declara el navegador. Eso lo
 *   elige quien manda la peticion, asi que bastaria declarar 1 byte para
 *   saltarse el cupo entero. La cuenta buena sale de `storage.objects`.
 *
 *   Vigila tambien que el tope por archivo siga siendo UNO SOLO. El portal
 *   avisaba a los 50 MB mientras el bucket cortaba a los 25: el invitado subia
 *   40 MB por la red de la boda para que el almacen los rechazara al final.
 */

const RAIZ = join(__dirname, "..", "..");
const MIGRACIONES = join(RAIZ, "supabase", "migrations");
const NOMBRE = "0018_cupo_almacenamiento.sql";

function sqlActivo(archivo: string): string {
  return readFileSync(join(MIGRACIONES, archivo), "utf8")
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");
}

const leer = (...ruta: string[]) => readFileSync(join(RAIZ, ...ruta), "utf8");

describe("La migración 0018 mide los bytes REALES, no los declarados", () => {
  it("la migración existe", () => {
    expect(readdirSync(MIGRACIONES)).toContain(NOMBRE);
  });

  it("el uso sale de `storage.objects`, que es lo que no se puede maquillar", () => {
    // Si esto se cambiara por una suma de tamaños declarados, el cupo dejaría de
    // valer: bastaría con declarar 1 byte por archivo.
    const sql = sqlActivo(NOMBRE);
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+uso_bytes_del_evento/i);
    expect(sql).toMatch(/from\s+storage\.objects/i);
    expect(sql).toMatch(/metadata->>'size'/);
    expect(sql).toMatch(/bucket_id\s*=\s*'media'/i);
  });

  it("cuenta por carpeta de evento, que es la que decide el servidor", () => {
    // La ruta la elige `media-subir` desde la 0010, nunca el cliente: por eso el
    // primer tramo del nombre se puede tomar como el evento sin fiarse de nadie.
    expect(sqlActivo(NOMBRE)).toMatch(/split_part\(name,\s*'\/',\s*1\)/i);
  });

  it("el cupo respeta el orden: a medida > con video > solo fotos", () => {
    const sql = sqlActivo(NOMBRE);
    const aMedida = sql.search(/evento_cupo/i);
    const video = sql.search(/evento_tiene_funcion\(p_codigo,\s*'video'\)/i);
    expect(aMedida).toBeGreaterThan(-1);
    expect(video).toBeGreaterThan(aMedida);
    // El de video tiene que ser MAYOR que el de solo fotos, o el paquete de pago
    // no daría nada a cambio del dinero.
    expect(sql).toMatch(/15\s*\*\s*1024\s*\*\s*1024\s*\*\s*1024/);
    expect(sql).toMatch(/3\s*\*\s*1024\s*\*\s*1024\s*\*\s*1024/);
  });

  it("ante la duda responde que NO cabe", () => {
    const sql = sqlActivo(NOMBRE);
    expect(sql).toMatch(/p_codigo\s+is\s+null[\s\S]{0,120}return\s+false/i);
    // Cupo cero o negativo no puede leerse como "espacio infinito".
    expect(sql).toMatch(/v_cupo\s*<=\s*0\s*then[\s\S]{0,40}return\s+false/i);
  });

  it("el contador se puede leer desde el navegador; el candado no", () => {
    const sql = sqlActivo(NOMBRE);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+espacio_del_evento\(text\)\s+to\s+anon/i);
    expect(sql).toMatch(
      /revoke\s+all\s+on\s+function\s+cabe_en_el_evento\(text,\s*bigint\)\s+from\s+anon/i,
    );
  });

  it("no cuelga un disparador de `storage.objects`", () => {
    // Sería más rápido, pero un fallo ahí dentro tumbaría TODAS las subidas del
    // proyecto, no solo la cuenta. Decisión deliberada: que no se cuele luego.
    expect(sqlActivo(NOMBRE)).not.toMatch(/create\s+trigger[\s\S]{0,80}storage\.objects/i);
  });
});

describe("`media-subir` niega antes de que el archivo viaje", () => {
  const fuente = leer("supabase", "functions", "media-subir", "index.ts");

  it("pregunta a la base si cabe", () => {
    expect(fuente).toMatch(/rpc\/cabe_en_el_evento/);
    expect(fuente).toMatch(/p_bytes:\s*bytes/);
  });

  it("sin espacio responde 507, y con un archivo enorme 413", () => {
    expect(fuente).toMatch(/await\s+cabeEnElEvento\(evento,\s*bytes\)[\s\S]{0,300}507/);
    expect(fuente).toMatch(/bytes\s*>\s*TOPE_ARCHIVO[\s\S]{0,300}413/);
  });

  it("comprueba el espacio ANTES de gastar cupo de subidas", () => {
    const espacio = fuente.indexOf("await cabeEnElEvento(evento, bytes)");
    const cupo = fuente.indexOf("await cabeUnaSubidaMas(evento, usado)");
    expect(espacio).toBeGreaterThan(-1);
    expect(espacio).toBeLessThan(cupo);
  });

  it("un tamaño ausente o absurdo no rompe ni abre la puerta", () => {
    // Las apps que ya están en la calle no mandan `bytes`: si eso reventara, o
    // se leyera como "cabe cualquier cosa", el despliegue dejaría a una boda sin
    // subir fotos.
    expect(fuente).toMatch(/Number\.isFinite\(cuerpo\.bytes\)[\s\S]{0,80}:\s*0/);
  });
});

describe("El tope por archivo es UNO SOLO en todo el proyecto", () => {
  it("vale 25 MB, el mismo `file_size_limit` del bucket (0001)", () => {
    expect(MB_POR_ARCHIVO).toBe(25);
    expect(BYTES_POR_ARCHIVO).toBe(26214400);
    // El número del bucket, tal cual está escrito en la migración 0001.
    expect(sqlActivo("0001_estado_actual.sql")).toMatch(/file_size_limit\s*=\s*26214400/);
  });

  it("la Edge Function usa ese mismo número", () => {
    expect(leer("supabase", "functions", "media-subir", "index.ts")).toMatch(
      /TOPE_ARCHIVO\s*=\s*25\s*\*\s*1024\s*\*\s*1024/,
    );
  });

  it("el portal ya NO avisa a los 50 MB", () => {
    // Era el peor caso posible: la app daba por bueno un archivo que el almacén
    // iba a rechazar, después de subirlo entero.
    const lib = leer("apps", "portal", "src", "modulos", "album", "lib.ts");
    expect(lib).toMatch(/MAX_MB\s*=\s*MB_POR_ARCHIVO/);
    expect(lib).not.toMatch(/MAX_MB\s*=\s*50/);
  });

  it("la app suelta del álbum también frena por peso", () => {
    // Antes no tenía NINGÚN tope: subía lo que fuera hasta que el almacén decía
    // que no.
    expect(leer("apps", "album-fotos", "src", "components", "album.tsx")).toMatch(
      /pesaDemasiado\(a\)/,
    );
  });

  it("`pesaDemasiado` corta justo en el tope, ni antes ni después", () => {
    expect(pesaDemasiado({ size: BYTES_POR_ARCHIVO })).toBe(false);
    expect(pesaDemasiado({ size: BYTES_POR_ARCHIVO + 1 })).toBe(true);
    expect(pesaDemasiado({ size: 0 })).toBe(false);
  });
});

describe("Lo que se le dice a cada persona", () => {
  it("al invitado no se le pide que arregle algo que no puede", () => {
    const sinEspacio = mensajeDeSubida(new Error("evento-sin-espacio"));
    expect(sinEspacio).toMatch(/sin espacio/i);
    expect(sinEspacio).toMatch(/organiza/i); // a quién avisar
  });

  it("el mensaje de archivo grande dice el tope de verdad", () => {
    expect(mensajeDeSubida(new Error("archivo-muy-grande"))).toContain(`${MB_POR_ARCHIVO} MB`);
  });

  it("los cuatro cortes del servidor se distinguen entre sí y de un fallo de red", () => {
    const mensajes = [
      "tope-de-subidas",
      "video-no-incluido",
      "archivo-muy-grande",
      "evento-sin-espacio",
    ].map((m) => mensajeDeSubida(new Error(m)));
    expect(new Set(mensajes).size).toBe(4);
    for (const m of mensajes) expect(m).not.toMatch(/conexión/i);
    expect(mensajeDeSubida(new Error("vaya"))).toMatch(/conexión/i);
  });

  it("ninguno de los cortes se convierte en null (colaría por el camino viejo)", () => {
    const sync = leer("packages", "sync", "src", "index.ts");
    expect(sync).toMatch(/CORTES_DEL_SERVIDOR\s*=\s*new\s+Set\(\[/);
    for (const corte of [
      "tope-de-subidas",
      "video-no-incluido",
      "archivo-muy-grande",
      "evento-sin-espacio",
    ]) {
      expect(sync).toContain(`"${corte}"`);
    }
    expect(sync).toMatch(/CORTES_DEL_SERVIDOR\.has\(e\.message\)\)\s*throw\s+e/);
  });

  it("los tamaños se le enseñan a una persona en su idioma, no en bytes", () => {
    expect(textoDeTamano(191 * 1024)).toBe("191 kB"); // una foto comprimida
    expect(textoDeTamano(1288 * 1024)).toBe("1 MB"); // ya no se cuenta en kB
    expect(textoDeTamano(500 * 1024 * 1024)).toBe("500 MB");
    expect(textoDeTamano(15 * 1024 ** 3)).toBe("15.0 GB");
    expect(textoDeTamano(-1)).toBe("—");
  });
});
