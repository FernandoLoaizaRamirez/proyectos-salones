/**
 * Datos y utilidades de "¿EN QUÉ MESA ME TOCA?".
 *
 * El invitado escribe su nombre y descubre su mesa y quiénes lo acompañan.
 * Usa EXACTAMENTE la misma estructura de datos que la app "Acomodo de mesas":
 * se puede abrir el mismo enlace de solo lectura o importar el mismo archivo
 * JSON. El acomodo puede llegar por el enlace (datos dentro del hash) o cargarse
 * como archivo; si no hay nada, se usa la semilla de ejemplo.
 *
 * TODO editable aquí (white-label): datos del evento y la semilla.
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

export type Mesa = {
  id: string;
  nombre: string;
  capacidad: number;
};

export type Invitado = {
  id: string;
  nombre: string;
  asientos: number;
  mesaId: string | null;
};

export type Acomodo = {
  v: 1;
  evento: { nombre: string; fecha: string; lugar: string };
  mesas: Mesa[];
  invitados: Invitado[];
};

/* ------------------------------------------------------------------ */
/* Semilla de ejemplo (misma que "Acomodo de mesas").                 */
/* ------------------------------------------------------------------ */

export const mesasIniciales: Mesa[] = [
  { id: "M-PRIN", nombre: "Mesa principal", capacidad: 10 },
  { id: "M-NOVIA", nombre: "Familia de la novia", capacidad: 10 },
  { id: "M-NOVIO", nombre: "Familia del novio", capacidad: 10 },
  { id: "M-AMIG", nombre: "Amigos", capacidad: 8 },
  { id: "M-TRAB", nombre: "Compañeros de trabajo", capacidad: 8 },
];

export const invitadosIniciales: Invitado[] = [
  { id: "G-A001", nombre: "Ana Herrera", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A002", nombre: "Rodrigo Salazar", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A003", nombre: "Sofía Herrera (dama)", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A004", nombre: "Diego Salazar (padrino)", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-B001", nombre: "Familia Herrera Medina", asientos: 4, mesaId: "M-NOVIA" },
  { id: "G-B002", nombre: "Tía Lucía y Tío Marco", asientos: 2, mesaId: "M-NOVIA" },
  { id: "G-B003", nombre: "Abuela Carmen", asientos: 1, mesaId: "M-NOVIA" },
  { id: "G-C001", nombre: "Familia Salazar Ruiz", asientos: 4, mesaId: "M-NOVIO" },
  { id: "G-C002", nombre: "Regina y José", asientos: 2, mesaId: "M-NOVIO" },
  { id: "G-D001", nombre: "Valentina Montes", asientos: 1, mesaId: "M-AMIG" },
  { id: "G-D002", nombre: "Carlos y Diana Pérez", asientos: 2, mesaId: "M-AMIG" },
  { id: "G-D003", nombre: "Grupo Alvarado", asientos: 3, mesaId: "M-AMIG" },
  { id: "G-Z001", nombre: "Miguel Ángel Torres", asientos: 1, mesaId: "M-TRAB" },
  { id: "G-Z002", nombre: "Familia Loaiza Ramírez", asientos: 4, mesaId: "M-TRAB" },
  { id: "G-Z003", nombre: "Paola y Andrés", asientos: 2, mesaId: null },
  { id: "G-Z004", nombre: "Fernanda Ríos", asientos: 1, mesaId: null },
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Invitados sentados en una mesa. */
export function invitadosDeMesa(mesaId: string, invitados: Invitado[]): Invitado[] {
  return invitados.filter((i) => i.mesaId === mesaId);
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
function base64ATexto(b64: string): string {
  const binario = atob(b64);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Forma COMPACTA del enlace (idéntica a la de "Acomodo de mesas"):
 *   e = [nombreEvento, fecha, lugar]
 *   m = [[nombreMesa, capacidad], ...]
 *   g = [[nombreInvitado, asientos, indiceDeMesa], ...]   (-1 = sin mesa)
 */
type AcomodoCompacto = {
  e: [string, string, string];
  m: [string, number][];
  g: [string, number, number][];
};

/** Recupera el acomodo desde el enlace compartido (forma compacta). */
export function decodificarAcomodo(datos: string): Acomodo | null {
  try {
    const o = JSON.parse(base64ATexto(datos)) as Partial<AcomodoCompacto>;
    if (!Array.isArray(o.m) || !Array.isArray(o.g)) return null;

    const mesas: Mesa[] = o.m.map((par, i) => ({
      id: "M" + i,
      nombre: String(par?.[0] ?? `Mesa ${i + 1}`),
      capacidad: Math.max(1, Number(par?.[1]) || 1),
    }));

    const invitados: Invitado[] = o.g.map((tri, i) => {
      const idx = Number(tri?.[2]);
      const mesa = mesas[idx];
      return {
        id: "G" + i,
        nombre: String(tri?.[0] ?? "Invitado"),
        asientos: Math.max(1, Number(tri?.[1]) || 1),
        mesaId: mesa ? mesa.id : null,
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

/** Verifica que un objeto (de un archivo JSON exportado) tenga la forma correcta. */
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

/** Empaqueta el acomodo en un enlace compartible (misma forma compacta). */
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
  const texto = JSON.stringify(compacto);
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}
