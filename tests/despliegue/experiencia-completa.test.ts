/**
 * LA MUESTRA ENSEÑA LAS 14 EXPERIENCIAS, DE PUNTA A PUNTA (Etapa 1, 26 ago).
 *
 * El portal pasó de 9 a 14 módulos: entraron "Mi pase" y los cuatro de
 * información (cronograma, lugar, vestimenta, preguntas). Para que un módulo
 * exista DE VERDAD tienen que coincidir cinco lugares — el directorio, las
 * claves de core, el plan demo del portal, la migración que da de alta la
 * función, y la pantalla que lo pinta. Esta prueba los ata: quien agregue un
 * módulo a medias (o quite uno sin limpiar el resto) pone el CI rojo.
 *
 * Lee los ARCHIVOS como texto (patrón de urls-unificadas: importar core
 * arrastraría zod a esta prueba); lo que es COMPORTAMIENTO (el molde de faq,
 * la receta del QR) se prueba en los tests de packages/core, junto al código.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULOS } from "@salones/directorio";

const RAIZ = resolve(__dirname, "..", "..");
const leer = (...ruta: string[]) => readFileSync(join(RAIZ, ...ruta), "utf8");

/** clave → nombre de la constante en FEATURES_CONOCIDAS ("pase" → "Pase"),
 *  leído del archivo de core como texto. */
const entitlements = leer("packages", "core", "src", "entitlements.ts");
const bloque = entitlements.match(/FEATURES_CONOCIDAS = \{([\s\S]*?)\} as const/)?.[1] ?? "";
const NOMBRE_CONSTANTE = new Map(
  [...bloque.matchAll(/(\w+):\s*"([a-z-]+)"/g)].map((m) => [m[2]!, m[1]!]),
);

const NUEVAS = ["pase", "cronograma", "lugar", "vestimenta", "faq"] as const;

describe("La migración 0028 da de alta las funciones nuevas", () => {
  const sql = leer("supabase", "migrations", "0028_experiencia_completa.sql");

  it("cada clave nueva está en `features`", () => {
    for (const clave of NUEVAS) {
      expect(sql, `falta '${clave}' en la 0028`).toContain(`('${clave}',`);
    }
  });

  it("las cinco se encienden para el evento demo (el override gana al plan)", () => {
    for (const clave of NUEVAS) {
      expect(sql).toMatch(
        new RegExp(`e0000000-0000-4000-8000-000000000001',\\s*'${clave}',\\s*true`),
      );
    }
    // `do update`, no `do nothing`: volver a correrla debe volver a encender.
    expect(sql).toMatch(/on conflict \(event_id, feature_clave\) do update/);
  });
});

describe("Cada módulo del directorio existe de punta a punta", () => {
  const configPortal = leer("apps", "portal", "src", "lib", "config-evento.ts");
  const panelMotor = leer("apps", "catalogo", "src", "lib", "funciones-evento.ts");

  for (const m of MODULOS) {
    const constante = NOMBRE_CONSTANTE.get(m.clave);

    it(`"${m.clave}" tiene constante en core, está en el plan demo y en el motor del panel`, () => {
      // Sin constante en core, la clave del directorio es un invento.
      expect(constante, `"${m.clave}" no está en FEATURES_CONOCIDAS`).toBeDefined();
      // El plan demo del portal es LA MUESTRA: un módulo fuera de él no se
      // enseña a los salones y la vitrina vuelve a quedarse corta.
      expect(configPortal, `"${m.clave}" falta en PLAN_DEMO del portal`).toContain(
        `F.${constante},`,
      );
      // El motor del panel (los interruptores de la Etapa 2) debe conocerlo ya.
      expect(panelMotor, `"${m.clave}" falta en EXPERIENCIAS del panel`).toContain(
        `FEATURES_CONOCIDAS.${constante}`,
      );
    });

    if (m.rutaInterna) {
      it(`"${m.clave}" tiene su pantalla en el portal (${m.rutaInterna})`, () => {
        const pagina = join(
          RAIZ,
          "apps",
          "portal",
          "src",
          "app",
          m.rutaInterna.slice(1),
          "page.tsx",
        );
        expect(existsSync(pagina), `no existe ${pagina}`).toBe(true);
      });
    }
  }
});

describe("El motor de experiencias ya tiene volante (Etapa 2)", () => {
  it("la pantalla del evento monta la tarjeta, y la tarjeta usa el motor y pinta lo RESUELTO", () => {
    // El hallazgo original del mapa: funciones-evento.ts era "motor sin
    // volante" — 221 líneas probadas que ninguna pantalla importaba. Este
    // candado impide volver a ese estado sin que el CI lo grite.
    const pagina = leer("apps", "catalogo", "src", "app", "eventos", "[codigo]", "page.tsx");
    const tarjeta = leer(
      "apps",
      "catalogo",
      "src",
      "app",
      "eventos",
      "[codigo]",
      "experiencias-evento.tsx",
    );
    expect(pagina).toContain("ExperienciasEvento");
    expect(tarjeta).toContain("funciones-evento");
    // Se pinta lo que VE el invitado (el motor de core), no lo que pedimos.
    expect(tarjeta).toContain("resolveEntitlements");
  });

  it("apagar una característica escribe `false` (borrarla NO la apaga: hereda del módulo)", () => {
    const motor = leer("apps", "catalogo", "src", "lib", "funciones-evento.ts");
    expect(motor).toContain("export async function apagarCaracteristica");
    expect(motor).toMatch(/habilitado:\s*false/);
  });
});

describe("La marca por evento ya tiene editor (Etapa 2)", () => {
  it("la pantalla existe, escribe event_branding y previsualiza con el motor real", () => {
    // El otro hueco del mapa: event_branding con tabla, RLS y evento-config
    // listos, pero cuya única fila la puso la semilla de la demo (0026).
    const pagina = leer(
      "apps",
      "catalogo",
      "src",
      "app",
      "eventos",
      "[codigo]",
      "personalizacion",
      "page.tsx",
    );
    const lib = leer("apps", "catalogo", "src", "lib", "branding-evento.ts");
    // La vista previa usa el MISMO motor del portal, no una copia.
    expect(pagina).toContain("resolverTema");
    expect(pagina).toContain("branding-evento");
    expect(lib).toContain('from("event_branding")');
    // La portada de la vista previa sale del tema YA RESUELTO (el esUrlSegura
    // del motor), no de un regex propio más flojo que enseñe aquí una foto
    // que el portal después descarta.
    expect(pagina).toContain("tema.evento!.portadaUrl");
    // Y el puesto de mando enlaza al editor.
    const evento = leer("apps", "catalogo", "src", "app", "eventos", "[codigo]", "page.tsx");
    expect(evento).toContain("/personalizacion");
  });
});

describe("La cuenta de muestra (0029): las credenciales públicas, atadas", () => {
  const sql = leer("supabase", "migrations", "0029_cuenta_de_muestra.sql");
  const catalogo = leer("apps", "catalogo", "src", "app", "page.tsx");
  const entrar = leer("apps", "catalogo", "src", "app", "entrar", "page.tsx");

  it("la migración crea la caja de arena con dueño y claims", () => {
    expect(sql).toContain("'salon-de-muestra', gen_salt('bf')");
    expect(sql).toContain('"rol":"owner"');
    expect(sql).toContain("aa000000-0000-4000-8000-000000000001");
    expect(sql).toContain("'boda-de-muestra'");
  });

  it("el catálogo y la pantalla de entrar enseñan LAS MISMAS credenciales que la 0029", () => {
    // Si alguien rota la contraseña en la migración y olvida las pantallas,
    // las credenciales públicas quedan rotas EN SILENCIO delante de un salón.
    for (const credencial of ["muestra@suite-salones.app", "salon-de-muestra"]) {
      expect(sql, `${credencial} falta en la 0029`).toContain(credencial);
      expect(catalogo, `${credencial} falta en el catálogo`).toContain(credencial);
      expect(entrar, `${credencial} falta en /entrar`).toContain(credencial);
    }
  });
});

describe("El QR del portal es el de la puerta (un solo contrato)", () => {
  it("la receta vive en core y las dos pantallas la usan; nadie arma el texto a mano", () => {
    const core = leer("packages", "core", "src", "pase-enlace.ts");
    const puerta = leer("apps", "pases-qr", "src", "lib", "evento.ts");
    const boleto = leer("apps", "portal", "src", "modulos", "pase", "boleto-pase.tsx");
    // El prefijo es un CONTRATO con los QR ya impresos: vive en core y solo ahí.
    expect(core).toContain('QR_PASE_PREFIJO = "PASE-SR:"');
    expect(puerta).toContain("contenidoQRPase");
    expect(boleto).toContain("contenidoQRPase");
    expect(boleto).not.toContain('"PASE-SR:');
  });
});

describe("La muestra de la vitrina cuenta una sola boda", () => {
  it("los pases de muestra del portal son los mismos de la puerta", () => {
    const puerta = leer("apps", "pases-qr", "src", "lib", "evento.ts");
    const portal = leer("apps", "portal", "src", "modulos", "pase", "lib.ts");
    // Mismos ids: si la puerta cambia su lista de muestra, el portal debe
    // seguirla (o el visitante vería dos bodas distintas según la puerta).
    const IDS = ["SR-1042", "SR-1043", "SR-2087", "SR-2091", "SR-2104", "SR-2115", "SR-2151", "SR-2168"];
    for (const id of IDS) {
      expect(puerta, `${id} falta en la puerta`).toContain(`"${id}"`);
      expect(portal, `${id} falta en el portal`).toContain(`"${id}"`);
    }
  });

  it("la información de muestra del portal calca la invitación demo", () => {
    const invitacion = leer("apps", "invitaciones", "src", "lib", "invitacion.ts");
    const info = leer("apps", "portal", "src", "modulos", "info", "lib.ts");
    // Los datos que comparten tienen que coincidir texto a texto.
    for (const dato of [
      '"2027-03-20T18:00"',
      "Capilla Santa Renata",
      "Jardín de los Encinos",
      "Etiqueta rigurosa",
      "¿Hay estacionamiento?",
      "¡Que empiece la fiesta!",
    ]) {
      expect(invitacion, `${dato} falta en la invitación demo`).toContain(dato);
      expect(info, `${dato} falta en la muestra del portal`).toContain(dato);
    }
  });
});
