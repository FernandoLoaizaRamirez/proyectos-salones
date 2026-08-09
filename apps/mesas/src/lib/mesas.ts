/**
 * Datos y utilidades de la app de ACOMODO DE MESAS.
 *
 * El organizador crea las mesas y arrastra a cada invitado a su lugar. Todo se
 * guarda en el dispositivo (localStorage) y se puede exportar/importar como un
 * archivo, o compartir por un enlace de SOLO LECTURA (los datos viajan dentro
 * del propio enlace, sin servidor).
 *
 * La estructura de datos (mesas + invitados) es la MISMA que usa la app
 * "¿En qué mesa me toca?": puedes importar el mismo archivo o abrir el mismo
 * enlace en las dos apps.
 *
 * TODO editable aquí (white-label): datos del evento y la semilla de ejemplo.
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

/**
 * Las dos colecciones del evento. Van separadas y con prefijos de id distintos
 * (M- y G-) porque en la tabla `items` el `id` es llave primaria de TODA la
 * tabla, no de la colección: una mesa y un invitado con el mismo id se pisarían.
 */
export const COLECCION_MESAS = "mesas";
export const COLECCION_ACOMODO = "acomodo";

/** Ordena por el campo `orden`; lo que no lo tenga, al final y por nombre. */
export function porOrden<T extends { orden?: number; nombre: string }>(a: T, b: T): number {
  const x = a.orden ?? Number.MAX_SAFE_INTEGER;
  const y = b.orden ?? Number.MAX_SAFE_INTEGER;
  return x === y ? a.nombre.localeCompare(b.nombre, "es", { numeric: true }) : x - y;
}

/** Una mesa del salón: un nombre y cuántas personas caben. */
export type Mesa = {
  id: string;
  nombre: string;
  capacidad: number;
  /**
   * Para pintarlas siempre en el mismo orden. Hace falta desde que el acomodo
   * vive en el evento: lo que llega del servidor viene de lo más nuevo a lo más
   * viejo, y sin esto las mesas se reordenarían solas cada tres segundos —
   * buscar "Mesa 5" sería imposible. Es la marca de tiempo de cuando se creó.
   */
  orden?: number;
};

/**
 * Un invitado (o familia). `asientos` es cuántos lugares ocupa: una persona
 * ocupa 1, "Familia Loaiza" puede ocupar 4. `mesaId` es la mesa donde está
 * sentado, o `null` si aún no tiene lugar.
 */
export type Invitado = {
  id: string;
  nombre: string;
  asientos: number;
  mesaId: string | null;
  /** Mismo motivo que en Mesa: que la lista no baile en cada refresco. */
  orden?: number;
};

/** El acomodo completo: lo que se exporta, se importa y se comparte por enlace. */
export type Acomodo = {
  v: 1;
  evento: { nombre: string; fecha: string; lugar: string };
  mesas: Mesa[];
  invitados: Invitado[];
};

/* ------------------------------------------------------------------ */
/* Semilla de ejemplo (para que la demo no se vea vacía).             */
/* Se puede borrar y armar el acomodo real desde la app.              */
/* ------------------------------------------------------------------ */

export const mesasIniciales: Mesa[] = [
  { id: "M-PRIN", nombre: "Mesa principal", capacidad: 10 },
  { id: "M-NOVIA", nombre: "Familia de la novia", capacidad: 10 },
  { id: "M-NOVIO", nombre: "Familia del novio", capacidad: 10 },
  { id: "M-AMIG", nombre: "Amigos", capacidad: 8 },
  { id: "M-TRAB", nombre: "Compañeros de trabajo", capacidad: 8 },
];

export const invitadosIniciales: Invitado[] = [
  // Mesa principal (novios y más cercanos)
  { id: "G-A001", nombre: "Ana Herrera", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A002", nombre: "Rodrigo Salazar", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A003", nombre: "Sofía Herrera (dama)", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A004", nombre: "Diego Salazar (padrino)", asientos: 1, mesaId: "M-PRIN" },

  // Familia de la novia
  { id: "G-B001", nombre: "Familia Herrera Medina", asientos: 4, mesaId: "M-NOVIA" },
  { id: "G-B002", nombre: "Tía Lucía y Tío Marco", asientos: 2, mesaId: "M-NOVIA" },
  { id: "G-B003", nombre: "Abuela Carmen", asientos: 1, mesaId: "M-NOVIA" },

  // Familia del novio
  { id: "G-C001", nombre: "Familia Salazar Ruiz", asientos: 4, mesaId: "M-NOVIO" },
  { id: "G-C002", nombre: "Regina y José", asientos: 2, mesaId: "M-NOVIO" },

  // Amigos
  { id: "G-D001", nombre: "Valentina Montes", asientos: 1, mesaId: "M-AMIG" },
  { id: "G-D002", nombre: "Carlos y Diana Pérez", asientos: 2, mesaId: "M-AMIG" },
  { id: "G-D003", nombre: "Grupo Alvarado", asientos: 3, mesaId: "M-AMIG" },

  // Aún sin lugar (para probar el arrastre)
  { id: "G-Z001", nombre: "Miguel Ángel Torres", asientos: 1, mesaId: null },
  { id: "G-Z002", nombre: "Familia Loaiza Ramírez", asientos: 4, mesaId: null },
  { id: "G-Z003", nombre: "Paola y Andrés", asientos: 2, mesaId: null },
  { id: "G-Z004", nombre: "Fernanda Ríos", asientos: 1, mesaId: null },
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Suma de asientos ocupados en una mesa. */
export function asientosUsados(mesaId: string, invitados: Invitado[]): number {
  return invitados
    .filter((i) => i.mesaId === mesaId)
    .reduce((s, i) => s + Math.max(1, i.asientos), 0);
}

/** Invitados sentados en una mesa. */
export function invitadosDeMesa(mesaId: string, invitados: Invitado[]): Invitado[] {
  return invitados.filter((i) => i.mesaId === mesaId);
}

/** Invitados que aún no tienen mesa. */
export function sinAsignar(invitados: Invitado[]): Invitado[] {
  return invitados.filter((i) => i.mesaId === null);
}

/**
 * Ids de 8 caracteres con azar criptográfico.
 *
 * ⚠️ Antes eran 4 de `Math.random()` comprobados solo contra lo que había EN
 * MEMORIA. Bastaba cuando cada tablet vivía en su mundo; ahora los acomodos de
 * todas las bodas comparten la misma tabla y el `id` es llave primaria GLOBAL,
 * así que dos eventos que sacaran el mismo id se pisarían la mesa — y guardar es
 * un upsert, o sea que lo harían en silencio.
 */
const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin I/O/0/1

function azar(prefijo: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return prefijo + Array.from(bytes, (b) => ABC[b % ABC.length]).join("");
}

export function nuevoIdMesa(existentes: Mesa[]): string {
  const usados = new Set(existentes.map((m) => m.id));
  let id = "";
  do {
    id = azar("M-");
  } while (usados.has(id));
  return id;
}

export function nuevoIdInvitado(existentes: Invitado[]): string {
  const usados = new Set(existentes.map((i) => i.id));
  let id = "";
  do {
    id = azar("G-");
  } while (usados.has(id));
  return id;
}

/** Normaliza texto para buscar sin importar mayúsculas ni acentos. */
export function normaliza(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/* --- Base64 de textos con acentos (UTF-8), sin inflar el resultado. --- */
function textoABase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}
function base64ATexto(b64: string): string {
  const binario = atob(b64);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Forma COMPACTA para el enlace: en vez de repetir las claves ("nombre",
 * "asientos"…) por cada invitado, guardamos arreglos posicionales. Así el
 * enlace queda mucho más corto y el QR (cuando cabe) se puede escanear.
 *
 *   e = [nombreEvento, fecha, lugar]
 *   m = [[nombreMesa, capacidad], ...]
 *   g = [[nombreInvitado, asientos, indiceDeMesa], ...]   (indiceDeMesa = -1 si no tiene)
 */
type AcomodoCompacto = {
  e: [string, string, string];
  m: [string, number][];
  g: [string, number, number][];
};

/** Empaqueta el acomodo dentro de un enlace (sin servidor). */
export function codificarAcomodo(data: Acomodo): string {
  const indiceMesa = new Map(data.mesas.map((m, i) => [m.id, i]));
  const compacto: AcomodoCompacto = {
    e: [data.evento.nombre, data.evento.fecha, data.evento.lugar],
    m: data.mesas.map((m) => [m.nombre, m.capacidad]),
    g: data.invitados.map((i) => [
      i.nombre,
      i.asientos,
      i.mesaId !== null && indiceMesa.has(i.mesaId) ? indiceMesa.get(i.mesaId)! : -1,
    ]),
  };
  return textoABase64(JSON.stringify(compacto));
}

/** Recupera el acomodo desde el enlace (forma compacta). */
export function decodificarAcomodo(datos: string): Acomodo | null {
  try {
    const o = JSON.parse(base64ATexto(datos)) as Partial<AcomodoCompacto>;
    if (!Array.isArray(o.m) || !Array.isArray(o.g)) return null;

    // `orden: i` — en el enlace el orden va en la POSICIÓN (así el QR cabe).
    // Si no se devolviera aquí al campo, al ordenar la lista saldría alfabética
    // y el acomodo llegaría distinto del que armó el salón.
    const mesas: Mesa[] = o.m.map((par, i) => ({
      id: "M" + i,
      nombre: String(par?.[0] ?? `Mesa ${i + 1}`),
      capacidad: Math.max(1, Number(par?.[1]) || 1),
      orden: i,
    }));

    const invitados: Invitado[] = o.g.map((tri, i) => {
      const idx = Number(tri?.[2]);
      const mesa = mesas[idx];
      return {
        id: "G" + i,
        nombre: String(tri?.[0] ?? "Invitado"),
        asientos: Math.max(1, Number(tri?.[1]) || 1),
        mesaId: mesa ? mesa.id : null,
        orden: i,
      };
    });

    const e = o.e ?? [evento.nombre, evento.fecha, evento.lugar];
    return {
      v: 1,
      evento: {
        nombre: String(e[0] ?? evento.nombre),
        fecha: String(e[1] ?? evento.fecha),
        lugar: String(e[2] ?? evento.lugar),
      },
      mesas,
      invitados,
    };
  } catch {
    return null;
  }
}

/** Verifica que un objeto (de enlace o de archivo JSON) tenga la forma correcta. */
export function validarAcomodo(obj: unknown): Acomodo | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.mesas) || !Array.isArray(o.invitados)) return null;

  const mesas: Mesa[] = [];
  for (const m of o.mesas as unknown[]) {
    if (!m || typeof m !== "object") return null;
    const mm = m as Record<string, unknown>;
    if (typeof mm.id !== "string" || typeof mm.nombre !== "string") return null;
    mesas.push({
      id: mm.id,
      nombre: mm.nombre,
      capacidad: Math.max(1, Number(mm.capacidad) || 1),
      // Se conserva: si se perdiera, un acomodo importado saldría desordenado.
      ...(typeof mm.orden === "number" ? { orden: mm.orden } : {}),
    });
  }

  const invitados: Invitado[] = [];
  for (const i of o.invitados as unknown[]) {
    if (!i || typeof i !== "object") return null;
    const ii = i as Record<string, unknown>;
    if (typeof ii.id !== "string" || typeof ii.nombre !== "string") return null;
    invitados.push({
      id: ii.id,
      nombre: ii.nombre,
      asientos: Math.max(1, Number(ii.asientos) || 1),
      mesaId: typeof ii.mesaId === "string" ? ii.mesaId : null,
      ...(typeof ii.orden === "number" ? { orden: ii.orden } : {}),
    });
  }

  const ev = (o.evento ?? {}) as Record<string, unknown>;
  return {
    v: 1,
    evento: {
      nombre: typeof ev.nombre === "string" ? ev.nombre : evento.nombre,
      fecha: typeof ev.fecha === "string" ? ev.fecha : evento.fecha,
      lugar: typeof ev.lugar === "string" ? ev.lugar : evento.lugar,
    },
    mesas,
    invitados,
  };
}
