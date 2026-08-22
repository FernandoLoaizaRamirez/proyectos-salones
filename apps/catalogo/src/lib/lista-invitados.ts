/**
 * PEGAR LA LISTA DE INVITADOS, Y EL TELÉFONO DE CADA UNO.
 * ---------------------------------------------------------------------------
 * Hasta hoy la lista se capturaba de uno en uno, y el botón de WhatsApp abría
 * el mensaje SIN destinatario: el salón tenía que buscar el contacto a mano,
 * una vez por invitado. Con 120 invitados eso son 120 búsquedas, y es la razón
 * por la que un tablero así se abandona a la semana.
 *
 * Aquí vive la parte que se puede probar sin base ni navegador: entender lo que
 * alguien pegó desde su Excel, y dejar los teléfonos en el formato que WhatsApp
 * entiende. Lo que habla con la base está en `invitados.ts`.
 *
 * POR QUÉ ES TAN PERMISIVO AL LEER: quien pega esto no es programador, y su
 * lista viene de donde sea — Excel, Notas del teléfono, un WhatsApp reenviado.
 * Rechazar un renglón por una coma de más sería devolverle el problema. Así que
 * se acepta separado por tabuladores (lo que sale de Excel), por comas o por
 * punto y coma, y **cada campo se reconoce por lo que ES, no por su posición**:
 * lo que parece teléfono es el teléfono, y un número chiquito son los cupos.
 */
import { normalizarNombre } from "@salones/core";

/** El máximo de cupos que ofrece el panel; pegar más sería un error de dedo. */
export const CUPOS_MAX = 12;

/** México. Es el único país donde opera esto hoy (precios en pesos, CLABE…). */
const LADA_MX = "52";

/** Un renglón que sí se entendió. */
export type RenglonLista = { nombre: string; telefono: string; cupos: number };

/** El resultado de leer lo que pegaron, con todo lo que NO entró y por qué. */
export type ListaLeida = {
  /** Los que se van a dar de alta. */
  filas: RenglonLista[];
  /** Renglones sin nombre reconocible, tal cual venían (para poder enseñarlos). */
  rechazados: string[];
  /** Nombres que ya estaban en la lista del evento, o repetidos dentro del pegado. */
  repetidos: string[];
};

/**
 * Deja un teléfono como lo quiere WhatsApp: solo dígitos y con lada de país.
 * Devuelve "" si eso no parece un teléfono, y entonces el invitado se guarda
 * sin él (mejor sin teléfono que con uno inventado que le escriba a un extraño).
 *
 * Casos que se ven en la vida real, todos comprobados en las pruebas:
 *   "6671234567"        → 526671234567   (nacional: se le pone la lada)
 *   "+52 667 123 4567"  → 526671234567   (con símbolos y espacios)
 *   "044 667 123 4567"  → 526671234567   (el 044 viejo de celular)
 *   "+52 1 667 123 4567"→ 526671234567   (el "1" que Telcel metía en medio)
 *   "1 305 555 0123"    → 13055550123    (extranjero: se respeta tal cual)
 *   "12345"             → ""             (no es un teléfono)
 */
export function normalizarTelefono(crudo: string): string {
  let d = (crudo ?? "").replace(/\D+/g, "");
  if (!d) return "";
  // Prefijos viejos de marcación nacional a celular: 044 y 045.
  if (d.length === 13 && (d.startsWith("044") || d.startsWith("045"))) d = d.slice(3);
  // "+52 1 …": el 1 que se usaba para celular y que WhatsApp ya no quiere.
  if (d.length === 13 && d.startsWith(`${LADA_MX}1`)) d = LADA_MX + d.slice(3);
  // Nacional de 10 dígitos: se le pone la lada del país.
  if (d.length === 10) return LADA_MX + d;
  // Cualquier otro largo razonable se respeta: puede ser de otro país.
  return d.length >= 11 && d.length <= 15 ? d : "";
}

/** El teléfono como se lee en pantalla: "+52 667 123 4567". */
export function telefonoBonito(normalizado: string): string {
  if (!normalizado) return "";
  if (normalizado.startsWith(LADA_MX) && normalizado.length === 12) {
    const n = normalizado.slice(2);
    return `+52 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  return `+${normalizado}`;
}

/** El enlace de WhatsApp: al chat del invitado si hay teléfono, o al selector. */
export function enlaceWhatsApp(telefono: string, mensaje: string): string {
  const texto = encodeURIComponent(mensaje);
  return telefono ? `https://wa.me/${telefono}?text=${texto}` : `https://wa.me/?text=${texto}`;
}

/** ¿Este pedazo de texto son unos cupos y no otra cosa? */
function pareceCupos(campo: string): boolean {
  return /^\d{1,2}$/.test(campo) && Number(campo) >= 1 && Number(campo) <= CUPOS_MAX;
}

/**
 * Lee lo que pegaron. `yaEstan` son los nombres que el evento ya tiene, para no
 * dar de alta dos veces a la misma familia cuando alguien pega la lista
 * completa por segunda vez — que pasa siempre.
 */
export function leerLista(
  texto: string,
  cuposPorDefecto: number,
  yaEstan: string[] = [],
): ListaLeida {
  const salida: ListaLeida = { filas: [], rechazados: [], repetidos: [] };
  // Se compara por nombre normalizado (sin acentos, sin mayúsculas, sin dobles
  // espacios): "José Pérez" y "jose perez" son la misma persona.
  const vistos = new Set(yaEstan.map((n) => normalizarNombre(n)).filter(Boolean));

  for (const renglon of (texto ?? "").split(/\r?\n/)) {
    if (!renglon.trim()) continue;

    const campos = renglon
      .split(/[\t;,]/)
      .map((c) => c.trim())
      .filter(Boolean);
    const nombre = campos.shift() ?? "";

    // Sin nombre no hay invitado. Y un "nombre" que es puro número casi siempre
    // es una lista numerada mal pegada, no una persona.
    if (!nombre || /^\d+$/.test(nombre)) {
      salida.rechazados.push(renglon.trim());
      continue;
    }

    // Los demás campos se reparten por lo que parecen, en el orden que vengan.
    let telefono = "";
    let cupos = 0;
    for (const campo of campos) {
      const tel = normalizarTelefono(campo);
      if (!telefono && tel) {
        telefono = tel;
        continue;
      }
      if (!cupos && pareceCupos(campo)) cupos = Number(campo);
    }

    const clave = normalizarNombre(nombre);
    if (vistos.has(clave)) {
      salida.repetidos.push(nombre);
      continue;
    }
    vistos.add(clave);
    salida.filas.push({ nombre: nombre.slice(0, 60), telefono, cupos: cupos || cuposPorDefecto });
  }

  return salida;
}

/** El resumen que se le enseña al salón después de pegar. */
export function resumenLista(l: ListaLeida): string {
  const partes = [
    `${l.filas.length} ${l.filas.length === 1 ? "invitado" : "invitados"} por agregar`,
  ];
  const conTel = l.filas.filter((f) => f.telefono).length;
  if (l.filas.length) partes.push(`${conTel} con teléfono`);
  if (l.repetidos.length) partes.push(`${l.repetidos.length} ya estaban`);
  if (l.rechazados.length) partes.push(`${l.rechazados.length} sin nombre`);
  return partes.join(" · ");
}
