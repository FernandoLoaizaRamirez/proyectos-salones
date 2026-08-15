/**
 * EL ACOMODO DE MESAS — el molde de LECTURA compartido.
 *
 * Quien ESCRIBE las colecciones `mesas` y `acomodo` del "lugar central" es la
 * app del organizador (apps/mesas): ahí se crean las mesas y se arrastra a cada
 * invitado a su lugar. Este módulo NO es dueño de esos datos; es el molde para
 * que el resto de la suite pueda LEERLOS sin copiarse los tipos — la invitación
 * quiere decirle al invitado en qué mesa va, y el portal quiere enseñarle a sus
 * compañeros de mesa.
 *
 * Por eso todo aquí es tolerante: lo que llega de la colección lo escribió otra
 * app (o un invitado con el enlace, que puede dar de alta filas en cualquier
 * colección — ver migración 0016), así que las filas se filtran y coaccionan en
 * vez de confiar en ellas. Nada lanza: una fila colada o rota se descarta y las
 * demás se pintan.
 *
 * Los tipos calcan a `Mesa`/`Invitado` de apps/mesas (con nombre propio para no
 * chocar con los `Mesa`/`Invitado` genéricos del dominio en index.ts). Si un
 * día cambia la forma allá, tiene que cambiar aquí — las pruebas la fijan.
 */

/**
 * Las dos colecciones del evento, las mismas que escribe apps/mesas. Van
 * separadas porque en la tabla `items` el `id` es llave primaria de TODA la
 * tabla: una mesa y un invitado con el mismo id se pisarían.
 */
export const COLECCION_MESAS = "mesas";
export const COLECCION_ACOMODO = "acomodo";

/** Una mesa del salón: un nombre y cuántas personas caben. */
export type MesaEvento = {
  id: string;
  nombre: string;
  capacidad: number;
  /**
   * Para pintarlas siempre en el mismo orden: lo que llega del servidor viene
   * de lo más nuevo a lo más viejo, y sin esto las mesas bailarían en cada
   * refresco (es la marca de tiempo de cuando se creó, igual que en apps/mesas).
   */
  orden?: number;
};

/**
 * Un invitado (o familia) del acomodo. `asientos` es cuántos lugares ocupa
 * ("Familia Loaiza" puede ocupar 4); `mesaId` es su mesa, o `null` si el
 * organizador aún no lo sienta.
 */
export type InvitadoMesa = {
  id: string;
  nombre: string;
  asientos: number;
  mesaId: string | null;
  /** Mismo motivo que en MesaEvento: que la lista no baile en cada refresco. */
  orden?: number;
};

/* ------------------------------------------------------------------ */
/* Orden y búsqueda                                                    */
/* ------------------------------------------------------------------ */

/**
 * Normaliza texto para buscar sin importar mayúsculas ni acentos (el invitado
 * teclea "nunez" y tiene que encontrar a "Núñez"). Mismo criterio que la app
 * de mesas, para que buscar aquí y allá dé lo mismo.
 */
export function normalizarNombre(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Ordena por el campo `orden`; lo que no lo tenga, al final y por nombre.
 * Mismo criterio que apps/mesas: el acomodo se pinta igual en todas las apps.
 */
export function porOrdenAcomodo<T extends { orden?: number; nombre: string }>(a: T, b: T): number {
  const x = a.orden ?? Number.MAX_SAFE_INTEGER;
  const y = b.orden ?? Number.MAX_SAFE_INTEGER;
  return x === y ? a.nombre.localeCompare(b.nombre, "es", { numeric: true }) : x - y;
}

/* ------------------------------------------------------------------ */
/* Filas crudas → filas confiables                                     */
/* ------------------------------------------------------------------ */

/** ¿Es un objeto plano con `id` y `nombre` de texto? Lo mínimo para pintarse. */
function filaConIdYNombre(x: unknown): x is { id: string; nombre: string } & Record<string, unknown> {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.nombre === "string";
}

/**
 * Filas crudas de la colección `mesas` → mesas confiables. Descarta lo
 * malformado sin lanzar: una fila colada no puede tumbar la pantalla de nadie.
 */
export function normalizarMesasCrudas(items: unknown[]): MesaEvento[] {
  const mesas: MesaEvento[] = [];
  for (const item of items) {
    if (!filaConIdYNombre(item)) continue;
    mesas.push({
      id: item.id,
      nombre: item.nombre,
      // Capacidad rara (cero, negativa, texto) vale por 1, igual que en mesas.
      capacidad: Math.max(1, Number(item.capacidad) || 1),
      // Se conserva solo si es número: sin él, la mesa se va al final por nombre.
      ...(typeof item.orden === "number" ? { orden: item.orden } : {}),
    });
  }
  return mesas;
}

/** Filas crudas de la colección `acomodo` → invitados confiables. */
export function normalizarAcomodoCrudo(items: unknown[]): InvitadoMesa[] {
  const invitados: InvitadoMesa[] = [];
  for (const item of items) {
    if (!filaConIdYNombre(item)) continue;
    invitados.push({
      id: item.id,
      nombre: item.nombre,
      asientos: Math.max(1, Number(item.asientos) || 1),
      // `mesaId` que no sea texto (falta, null, basura) = aún sin sentar.
      mesaId: typeof item.mesaId === "string" ? item.mesaId : null,
      ...(typeof item.orden === "number" ? { orden: item.orden } : {}),
    });
  }
  return invitados;
}

/* ------------------------------------------------------------------ */
/* Consultas del invitado ("¿en qué mesa me toca?")                    */
/* ------------------------------------------------------------------ */

/**
 * Busca al invitado por su nombre, como en la app "¿En qué mesa me toca?":
 * coincidencia por subcadena sin acentos ni mayúsculas, consulta vacía no
 * enseña nada, y a lo más 8 resultados (más que eso ya no es encontrarse,
 * es leerse la lista entera).
 */
export function buscarEnAcomodo(nombre: string, invitados: InvitadoMesa[]): InvitadoMesa[] {
  const q = normalizarNombre(nombre);
  if (q.length < 1) return [];
  return invitados.filter((i) => normalizarNombre(i.nombre).includes(q)).slice(0, 8);
}

/** La mesa donde está sentado el invitado, o `null` si aún no tiene lugar. */
export function mesaDe(invitado: InvitadoMesa, mesas: MesaEvento[]): MesaEvento | null {
  if (invitado.mesaId === null) return null;
  return mesas.find((m) => m.id === invitado.mesaId) ?? null;
}

/**
 * Con quién comparte mesa (sin contarse a sí mismo), en el orden del acomodo.
 * Sin mesa asignada no hay compañeros que enseñar.
 */
export function companerosDe(invitado: InvitadoMesa, invitados: InvitadoMesa[]): InvitadoMesa[] {
  if (invitado.mesaId === null) return [];
  return invitados
    .filter((i) => i.mesaId === invitado.mesaId && i.id !== invitado.id)
    .sort(porOrdenAcomodo);
}

/**
 * Suma de asientos ocupados en una mesa (igual que `asientosUsados` de la app
 * de mesas: un invitado con asientos raros cuenta al menos como 1).
 */
export function asientosOcupados(mesaId: string, invitados: InvitadoMesa[]): number {
  return invitados
    .filter((i) => i.mesaId === mesaId)
    .reduce((s, i) => s + Math.max(1, i.asientos), 0);
}
