import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { todosLosDocumentos, DOCUMENTOS, type DatosLegales } from "../../packages/legal/src/index";

/**
 * LO QUE SE PUBLICA NO PUEDE HABLAR EN IDIOMA DE PROGRAMADOR.
 * ---------------------------------------------------------------------------
 * Las páginas de /legal son PÚBLICAS y sin candado: las abre el invitado que
 * llega desde el enlace del muro, y el salón que está evaluando comprar.
 *
 * Durante un tiempo publicaron dos cosas que no debían:
 *
 *   · La marca interna «PENDIENTE» metida dentro de las frases, así que el
 *     documento decía «con domicilio en PENDIENTE» y «escribe a PENDIENTE».
 *     Un aviso de privacidad sin responsable identificado no cumple, y encima
 *     quedaba a medias delante de un cliente.
 *
 *   · Una ruta de archivos del proyecto: «Se editan en src/lib/legal.ts». Eso
 *     es una nota para quien mantiene el código, no para quien lee el aviso.
 *
 * Las dos ya están arregladas: los documentos esquivan el hueco con `falta()` y
 * el recuadro tiene dos textos, uno público y otro `interno` (ese solo se pinta
 * en el panel, que está detrás del acceso del personal).
 *
 * Estas pruebas son el candado para que no vuelvan. Corren sin Supabase y sin
 * navegador: una comprueba el texto generado, la otra lee el componente.
 */

const COMPONENTE = join(
  __dirname,
  "..",
  "..",
  "apps",
  "catalogo",
  "src",
  "app",
  "legal",
  "aviso-pendiente.tsx",
);

/** Los datos tal cual están hoy: con los dos huecos del salón sin rellenar. */
const SIN_RELLENAR: DatosLegales = {
  salon: "Hacienda Santa Renata",
  contacto: "PENDIENTE",
  domicilio: "PENDIENTE",
  proveedor: "Suite para Salones",
  sitio: "https://suite-salones.vercel.app/legal",
  actualizado: "20 de julio de 2026",
};

const textoDe = (doc: { secciones: { titulo: string; parrafos: string[] }[] }): string =>
  doc.secciones.map((s) => `${s.titulo}\n${s.parrafos.join("\n")}`).join("\n");

describe("Las páginas legales publicadas no filtran nada interno", () => {
  it("ningún documento imprime la palabra PENDIENTE, aunque falten los datos", () => {
    for (const doc of todosLosDocumentos(SIN_RELLENAR)) {
      expect(textoDe(doc), `"${doc.clave}" publica la marca interna`).not.toContain("PENDIENTE");
    }
  });

  it("y aun así siguen diciendo a quién acudir", () => {
    // Esquivar el hueco no puede convertirse en callarse: la persona tiene que
    // salir de ahí sabiendo qué hacer para ejercer sus derechos.
    for (const doc of todosLosDocumentos(SIN_RELLENAR)) {
      const texto = textoDe(doc).toLowerCase();
      expect(texto, `"${doc.clave}" no dice a quién acudir`).toMatch(
        /personal de|anfitriones|organiza/,
      );
    }
  });

  it("con los datos puestos sí aparecen el correo y el domicilio", () => {
    // El otro lado de lo mismo: cuando el salón los facilite, tienen que salir.
    const completos: DatosLegales = {
      ...SIN_RELLENAR,
      contacto: "privacidad@santarenata.mx",
      domicilio: "Calle Falsa 123, Culiacán",
    };
    const aviso = textoDe(todosLosDocumentos(completos)[0]!);
    expect(aviso).toContain("privacidad@santarenata.mx");
    expect(aviso).toContain("Calle Falsa 123, Culiacán");
  });

  it("el recuadro público no enseña rutas del proyecto ni jerga", () => {
    /*
     * Se lee el componente y se parte por su `interno ? … : …`: la rama de la
     * DERECHA es la que ve el público. La ruta `src/lib/legal.ts` puede seguir
     * estando en la rama interna (ahí es útil), pero no en la pública.
     */
    const fuente = readFileSync(COMPONENTE, "utf8");
    const cuerpo = fuente.slice(fuente.indexOf("return ("));
    const marca = "      ) : (";
    const corte = cuerpo.indexOf(marca);
    expect(corte, "el componente ya no tiene dos textos separados").toBeGreaterThan(-1);
    const publica = cuerpo.slice(corte);

    expect(publica, "la rama pública enseña una ruta del proyecto").not.toMatch(/src\/lib/);
    expect(publica, "la rama pública habla de rellenar campos").not.toMatch(/rellenar|campos\./);
    expect(publica).toMatch(/salón|evento/);
  });

  it("las tres rutas legales siguen existiendo", () => {
    // Si alguien renombra una clave, los enlaces del pie se quedan rotos y
    // nadie se entera hasta que un invitado pulsa.
    expect([...DOCUMENTOS].sort()).toEqual(["imagen", "privacidad", "terminos"]);
  });
});
