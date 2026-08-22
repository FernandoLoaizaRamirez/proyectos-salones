import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  paquetes,
  precioPaquete,
  precioPaqueteBruto,
  repartirPaquetes,
  totalPaquetes,
  paqueteCubiertoPor,
  modelosDePaquete,
  appsDelPaquete,
  type Paquete,
} from "../../apps/catalogo/src/lib/catalogo";
import { AppMode } from "../../packages/core/src/index";

/**
 * LA CAJA DEL CATÁLOGO (`apps/catalogo/src/lib/catalogo.ts`).
 * ---------------------------------------------------------------------------
 * Aquí es donde Fernando cobra, así que lo único que se vigila es que la suma
 * NO MIENTA. El fallo que originó estas pruebas, medido en producción el 22 de
 * agosto de 2026: agregar "Paquete Esencial" y luego "Todo Incluido" pedía
 * $78,150 por el mismo conjunto de 12 apps que la página anuncia en $49,800,
 * porque los paquetes se solapan (Todo Incluido trae al Esencial entero) y la
 * tienda los sumaba como si fueran cosas distintas.
 *
 * Todo es puro: números y reglas de negocio, sin navegador ni Supabase.
 */

const pk = (id: string): Paquete => {
  const p = paquetes.find((x) => x.id === id);
  if (!p) throw new Error(`No existe el paquete ${id} (¿le cambiaron el id?)`);
  return p;
};

const esencial = pk("esencial");
const invitados = pk("invitados");
const todo = pk("todo");

/** Los paquetes con sitio web solo se compran; ahí es donde tienen precio real. */
const COMPRA = AppMode.Owned;

describe("cobro doble entre paquetes", () => {
  it("Esencial + Todo Incluido cuesta lo mismo que Todo Incluido solo", () => {
    // El caso exacto que se iba: $14,700 + $49,800 = $64,500 por unas apps que
    // el propio catálogo anuncia en $49,800.
    expect(totalPaquetes([esencial, todo], COMPRA)).toBe(precioPaquete(todo, COMPRA));
  });

  it("los tres paquetes juntos siguen costando el precio anunciado de Todo Incluido", () => {
    // Sumarlos por separado —lo que hacía la tienda— da los $78,150 que se
    // midieron en producción. Se deja escrito para que se vea el tamaño de la
    // mentira: era 57% más caro que el precio anunciado.
    const comoAntes =
      precioPaquete(esencial, COMPRA) +
      precioPaquete(invitados, COMPRA) +
      precioPaquete(todo, COMPRA);
    expect(comoAntes).toBe(78150);
    expect(totalPaquetes([esencial, invitados, todo], COMPRA)).toBe(49800);
  });

  it("no depende del orden en que el cliente toque los botones", () => {
    const enUnOrden = totalPaquetes([esencial, invitados, todo], COMPRA);
    const alReves = totalPaquetes([todo, invitados, esencial], COMPRA);
    expect(alReves).toBe(enUnOrden);
  });

  it("dos paquetes que NO se solapan sí se suman enteros", () => {
    // Esencial (sitio + álbum) e Invitados (invitación, RSVP, pases) no
    // comparten ninguna app: aquí no hay nada que perdonar.
    expect(totalPaquetes([esencial, invitados], COMPRA)).toBe(
      precioPaquete(esencial, COMPRA) + precioPaquete(invitados, COMPRA),
    );
  });

  it("un paquete solo cuesta exactamente lo que dice su tarjeta", () => {
    for (const p of paquetes) {
      for (const modelo of modelosDePaquete(p)) {
        expect(totalPaquetes([p], modelo)).toBe(precioPaquete(p, modelo));
      }
    }
  });

  it("llevarse dos paquetes nunca cuesta más que la suma, ni menos que el más caro", () => {
    // La red de seguridad para los paquetes que Fernando invente mañana:
    // fundirlos no puede inflar la cuenta (cobro doble) ni regalar el catálogo.
    for (const a of paquetes) {
      for (const b of paquetes) {
        if (a.id === b.id) continue;
        const modelo = COMPRA;
        const juntos = totalPaquetes([a, b], modelo);
        expect(juntos).toBeLessThanOrEqual(precioPaquete(a, modelo) + precioPaquete(b, modelo));
        expect(juntos).toBeGreaterThanOrEqual(
          Math.max(precioPaquete(a, modelo), precioPaquete(b, modelo)),
        );
      }
    }
  });
});

describe("lo que se le enseña al cliente cuando un paquete se absorbe", () => {
  it("el absorbido cuesta $0 y dice quién lo trae (no desaparece en silencio)", () => {
    const lineas = repartirPaquetes([esencial, todo], COMPRA);
    const linea = lineas.find((l) => l.pkg.id === "esencial")!;
    expect(linea.precio).toBe(0);
    expect(linea.absorbidoPor?.id).toBe("todo");
    expect(linea.cobra).toHaveLength(0);
    // Y el grande cobra sus 12 apps completas, no once.
    const grande = lineas.find((l) => l.pkg.id === "todo")!;
    expect(grande.cobra).toHaveLength(appsDelPaquete(todo).length);
  });

  it("los renglones suman exactamente el total (la cuenta cuadra a la vista)", () => {
    const lineas = repartirPaquetes([esencial, invitados, todo], COMPRA);
    const suma = lineas.reduce((s, l) => s + l.precio, 0);
    expect(suma).toBe(totalPaquetes([esencial, invitados, todo], COMPRA));
  });

  it("el botón de un paquete ya incluido en otro se apaga antes de sumarlo", () => {
    expect(paqueteCubiertoPor(esencial, [todo])?.id).toBe("todo");
    expect(paqueteCubiertoPor(invitados, [todo])?.id).toBe("todo");
    // Al revés no: el grande no viene dentro del chico.
    expect(paqueteCubiertoPor(todo, [esencial, invitados])).toBeUndefined();
    // Y sin nada elegido, todos se pueden agregar.
    expect(paqueteCubiertoPor(esencial, [])).toBeUndefined();
  });
});

describe("reglas de negocio de las que depende la caja", () => {
  it("la escalera se respeta: un paquete que contiene a otro nunca descuenta menos", () => {
    // Si se rompiera, apagar el botón del paquete chico le saldría MÁS CARO al
    // cliente, y `paqueteCubiertoPor` dejaría de ser inofensivo.
    for (const chico of paquetes) {
      for (const grande of paquetes) {
        if (chico.id === grande.id) continue;
        const contenido = chico.incluye.every((id) => grande.incluye.includes(id));
        if (contenido) expect(grande.descuento).toBeGreaterThanOrEqual(chico.descuento);
      }
    }
  });

  it("el paquete estrella tiene un número que enseñar aunque la pestaña no lo venda", () => {
    // La tarjeta destacada se veía muda en "Servicio gestionado" porque incluye
    // el sitio web, que solo se vende. El número existe: es el de su modalidad.
    const suModelo = modelosDePaquete(todo)[0]!;
    expect(suModelo).toBe(COMPRA);
    expect(precioPaquete(todo, suModelo)).toBe(49800);
    expect(precioPaqueteBruto(todo, suModelo)).toBeGreaterThan(precioPaquete(todo, suModelo));
  });

  it("la tienda suma con el reparto, no volviendo a sumar paquete por paquete", () => {
    /*
     * La cuenta buena vive en `repartirPaquetes`, pero quien la enseña es la
     * tienda. Se lee el archivo (no se importa: es un componente de React con
     * JSX) para que nadie vuelva a poner la suma ingenua sin enterarse.
     */
    const ruta = fileURLToPath(
      new URL("../../apps/catalogo/src/components/catalogo-cliente.tsx", import.meta.url),
    );
    const fuente = readFileSync(ruta, "utf8");
    expect(fuente).toContain("repartirPaquetes(paqSel, modelo)");
    // La suma vieja, la del cobro doble: `paqSel.reduce((s, pk) => s +
    // precioPaquete(pk, modelo), 0)`. Se comprobó a mano que este patrón SÍ la
    // caza (el primer intento, con [^)]*, se paraba en el paréntesis de la
    // función y pasaba en verde sin vigilar nada).
    expect(fuente).not.toMatch(/paqSel\.reduce\([\s\S]{0,60}precioPaquete/);
  });
});
