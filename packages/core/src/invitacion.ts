/**
 * LA INVITACIÓN DIGITAL — el molde de datos que edita el salón y pinta la app.
 *
 * Hasta hoy la invitación era una DEMO: sus datos vivían escritos a mano en un
 * archivo de código (`apps/invitaciones/src/lib/invitacion.ts`), así que cambiar
 * el nombre de la novia obligaba a tocar el repositorio y volver a desplegar.
 * Con esto, los datos pasan a ser CONTENIDO del evento: el salón los captura en
 * el panel y la invitación los lee con el código del evento, igual que el muro
 * lee sus mensajes.
 *
 * DÓNDE SE GUARDA (y por qué así)
 *   Colección `invitacion` del "lugar central", UNA sola fila por evento, con un
 *   identificador fijo y derivado del código: `inv:<codigo>`.
 *
 *   · Fijo, para que guardar dos veces CORRIJA la invitación en vez de dejar dos
 *     invitaciones distintas (el `guardar` de @salones/sync es "mete o
 *     actualiza" por id).
 *   · Con el código dentro, porque `items.id` es único EN TODA la base (es la
 *     clave primaria de la tabla, ver migración 0001): un id "datos" a secas se
 *     lo quedaría el primer evento que guardara, y el segundo chocaría.
 *
 * QUIÉN PUEDE CAMBIARLA
 *   Nadie salvo quien organiza. `invitacion` NO está en la lista blanca de
 *   `items_reescribibles` (migración 0016), así que la base rechaza con un 403
 *   cualquier reescritura que no venga con el pase de ANFITRIÓN. El panel del
 *   salón sí lo tiene (sale de `events.clave_anfitrion`); un invitado con el
 *   enlace de la boda, no.
 *
 *   ⚠️ Lo que ese candado NO impide es DAR DE ALTA: cualquiera con el enlace
 *   puede insertar filas nuevas en cualquier colección (está dicho así en la
 *   0016). Por eso quien lee NO agarra "la fila más reciente" de la colección,
 *   sino EXACTAMENTE la del id canónico —`invitacionDe()` más abajo—: una fila
 *   colada con otro id no se pinta en ninguna parte.
 *
 * Todo aquí es código PURO (solo zod): corre igual en el panel y en la invitación.
 */
import { z } from "zod";

/** La colección del "lugar central" donde vive la invitación de cada evento. */
export const COLECCION_INVITACION = "invitacion";

/**
 * El identificador de la ÚNICA fila de invitación de un evento. Ver arriba por
 * qué lleva el código dentro.
 */
export function idInvitacion(codigo: string): string {
  return `inv:${codigo}`;
}

/* ------------------------------------------------------------------ */
/* El molde                                                           */
/* ------------------------------------------------------------------ */

/** El color de acento con el que nace una invitación (el magenta del diseño). */
export const COLOR_INVITACION = "#B33A6A";

/** Un lugar del evento (la misa, el salón): dónde, a qué hora y cómo llegar. */
export const SedeSchema = z.object({
  /** El rótulo de la tarjeta: "Ceremonia religiosa", "Recepción"… */
  titulo: z.string().default(""),
  hora: z.string().default(""),
  lugar: z.string().default(""),
  direccion: z.string().default(""),
  /** Enlace de Google Maps. Vacío = la tarjeta no enseña el botón "Cómo llegar". */
  mapa: z.string().default(""),
  /** Foto del lugar, arriba de la tarjeta. Sin ella, la tarjeta va sin foto. */
  foto: z.string().default(""),
});
export type Sede = z.infer<typeof SedeSchema>;

/** Un momento del itinerario. */
export const MomentoSchema = z.object({
  hora: z.string().default(""),
  titulo: z.string().default(""),
  detalle: z.string().default(""),
  /** La foto redonda del medallón, a la izquierda de la línea de tiempo. */
  foto: z.string().default(""),
});
export type Momento = z.infer<typeof MomentoSchema>;

/** Un padrino o madrina: qué papel tiene y quién es. */
export const PadrinoSchema = z.object({
  rol: z.string().default(""),
  nombres: z.string().default(""),
});
export type Padrino = z.infer<typeof PadrinoSchema>;

/** Una mesa de regalos de tienda. */
export const TiendaSchema = z.object({
  nombre: z.string().default(""),
  url: z.string().default(""),
});
export type Tienda = z.infer<typeof TiendaSchema>;

/**
 * LA INVITACIÓN ENTERA.
 *
 * Casi todo tiene `.default("")` a propósito: una invitación a medio capturar
 * tiene que PINTARSE igual (el salón la va llenando en varias sentadas, y la
 * mitad de las bodas no tienen padrinos ni mesa de regalos). Las secciones
 * vacías simplemente no se dibujan; no hay campos "obligatorios" que revienten
 * la pantalla del invitado.
 */
export const InvitacionSchema = z.object({
  /** "boda" (dos nombres) o "xv" (una festejada). Cambia títulos y textos. */
  tipo: z.enum(["boda", "xv"]).default("boda"),
  novia: z.string().default(""),
  novio: z.string().default(""),
  festejada: z.string().default(""),

  /** La cita con la que abre la invitación. */
  frase: z.string().default(""),
  /** Quién la firma, debajo de la cita. Vacío = se firma con los nombres. */
  autorFrase: z.string().default(""),
  /** El saludo a los invitados, en su tarjeta. */
  saludo: z.string().default(""),
  /** El pie de la cuenta regresiva: "para una noche entre flores y luces". */
  conteoNota: z.string().default(""),

  /**
   * Fecha Y HORA de inicio, en hora local y sin zona: "2027-03-20T18:00".
   * Es lo que alimenta la cuenta regresiva. El texto largo ("sábado 20 de marzo
   * de 2027") NO se captura: se calcula con `fechaLarga()`, para que no puedan
   * contradecirse entre sí.
   */
  fechaISO: z.string().default(""),
  ciudad: z.string().default(""),
  hashtag: z.string().default(""),

  /** Color de acento de ESTA invitación (#rrggbb). Da el toque a medida. */
  color: z.string().default(COLOR_INVITACION),
  /** Foto grande de la portada (enlace). Vacío = portada solo tipográfica. */
  fotoPortada: z.string().default(""),
  /** Foto del cierre, la de "gracias por ser parte". Vacío = cierre sin foto. */
  fotoCierre: z.string().default(""),
  /** Música de fondo (enlace a un mp3). Vacío = sin botón de música. */
  musica: z.string().default(""),

  padres: z
    .object({
      titulo: z.string().default("Con la bendición de nuestros padres"),
      /** Los de la novia (o los de la festejada, en unos XV). */
      novia: z.array(z.string()).default([]),
      novio: z.array(z.string()).default([]),
    })
    .default({ titulo: "Con la bendición de nuestros padres", novia: [], novio: [] }),

  padrinos: z.array(PadrinoSchema).default([]),

  ceremonia: SedeSchema.default({
    titulo: "Ceremonia",
    hora: "",
    lugar: "",
    direccion: "",
    mapa: "",
    foto: "",
  }),
  recepcion: SedeSchema.default({
    titulo: "Recepción",
    hora: "",
    lugar: "",
    direccion: "",
    mapa: "",
    foto: "",
  }),

  vestimenta: z.string().default(""),
  vestimentaNota: z.string().default(""),
  /** La paleta de colores sugerida, en círculos (#rrggbb). */
  vestimentaColores: z.array(z.string()).default([]),

  itinerario: z.array(MomentoSchema).default([]),

  /**
   * FOTOS DE REPUESTO del anfitrión. No son el álbum de los invitados (eso es
   * otro producto): son las que rellenan los medallones del itinerario que no
   * tengan foto propia, para que la línea de tiempo no salga con huecos aunque
   * el salón no busque una foto para cada momento.
   */
  fotos: z.array(z.string()).default([]),

  regalos: z
    .object({
      texto: z.string().default(""),
      tiendas: z.array(TiendaSchema).default([]),
      /** "Lluvia de sobres": banco y CLABE para transferir. */
      banco: z.string().default(""),
      titular: z.string().default(""),
      clabe: z.string().default(""),
    })
    .default({ texto: "", tiendas: [], banco: "", titular: "", clabe: "" }),

  nota: z
    .object({
      titulo: z.string().default(""),
      texto: z.string().default(""),
    })
    .default({ titulo: "", texto: "" }),

  rsvp: z
    .object({
      /** WhatsApp que recibe las confirmaciones, con lada (52…). */
      whatsapp: z.string().default(""),
      fechaLimite: z.string().default(""),
    })
    .default({ whatsapp: "", fechaLimite: "" }),
});
export type Invitacion = z.infer<typeof InvitacionSchema>;

/** Una invitación en blanco, con los valores por omisión del molde. */
export function invitacionVacia(): Invitacion {
  return InvitacionSchema.parse({});
}

/**
 * Convierte lo que venga de la base en una invitación que se pueda pintar.
 *
 * NUNCA lanza: si el dato está a medias, es de una versión vieja del molde o
 * viene con basura, se rellena con los valores por omisión. Una invitación es
 * lo que ve el invitado el día que la abre; que se caiga entera por un campo
 * raro sería el peor final posible.
 */
export function normalizarInvitacion(dato: unknown): Invitacion {
  const r = InvitacionSchema.safeParse(dato ?? {});
  return r.success ? r.data : invitacionVacia();
}

/**
 * La fila de invitación de un evento dentro de una colección ya leída.
 *
 * Se busca POR ID —no "la primera" ni "la más reciente"— porque dar de alta
 * sigue estando abierto a cualquiera con el enlace (ver la cabecera): así, una
 * fila colada por un invitado se queda donde está, sin pintarse.
 */
export function invitacionDe(
  codigo: string,
  items: { id: string; [k: string]: unknown }[],
): Invitacion | null {
  const fila = items.find((i) => i.id === idInvitacion(codigo));
  if (!fila) return null;
  const { id: _id, ...dato } = fila;
  return normalizarInvitacion(dato);
}

/* ------------------------------------------------------------------ */
/* Ayudas de presentación                                             */
/* ------------------------------------------------------------------ */

/** El título del evento: "Ana & Rodrigo" o "Mis XV · Valentina". */
export function tituloInvitacion(inv: Invitacion): string {
  if (inv.tipo === "xv") {
    return inv.festejada ? `Mis XV · ${inv.festejada}` : "Mis XV años";
  }
  const dos = [inv.novia, inv.novio].filter(Boolean);
  return dos.length === 2 ? `${dos[0]} & ${dos[1]}` : dos[0] || "Nuestra boda";
}

/** Solo los nombres, sin adornos: "Ana & Rodrigo" · "Valentina". */
export function nombresInvitacion(inv: Invitacion): string {
  if (inv.tipo === "xv") return inv.festejada;
  return [inv.novia, inv.novio].filter(Boolean).join(" & ");
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * "sábado 20 de marzo de 2027" a partir de "2027-03-20T18:00".
 *
 * Se arma a mano, partiendo el texto, en vez de con `new Date(...)`: una fecha
 * suelta como "2027-03-20" la interpreta el navegador en UTC, y en México eso
 * la corre un día hacia atrás. Una invitación que anuncia el día equivocado no
 * es un detalle cosmético.
 */
export function fechaLarga(fechaISO: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO);
  if (!m) return "";
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const nombreMes = MESES[mes - 1];
  if (!nombreMes) return "";
  const nombreDia = DIAS[new Date(anio, mes - 1, dia).getDay()];
  return `${nombreDia} ${dia} de ${nombreMes} de ${anio}`;
}

/** "17 · 10 · 2026" — la fecha de la tarjeta de apertura. */
export function fechaPuntos(fechaISO: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO);
  return m ? `${m[3]} · ${m[2]} · ${m[1]}` : "";
}

/** "20 de marzo de 2027" — la del pie, sin el día de la semana. */
export function fechaCorta(fechaISO: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO);
  if (!m) return "";
  const mes = MESES[Number(m[2]) - 1];
  return mes ? `${Number(m[3])} de ${mes} de ${m[1]}` : "";
}

/**
 * Lee una hora escrita a mano ("5:00 p.m.", "17:00", "8 pm") y la devuelve en
 * 24 h. El salón la teclea como quiera —y así se enseña, tal cual la escribió—;
 * esto solo hace falta para armar el enlace del calendario.
 */
function leerHora(texto: string): { h: number; m: number } | null {
  const m = /(\d{1,2})[:.]?(\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/i.exec(texto.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const sufijo = (m[3] ?? "").toLowerCase().replace(/[.\s]/g, "");
  if (sufijo === "pm" && h < 12) h += 12;
  if (sufijo === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

/** Dos dígitos, para armar fechas de calendario. */
const dd = (n: number) => String(n).padStart(2, "0");

/**
 * El enlace de "Agregar a mi calendario" (Google Calendar).
 *
 * La hora sale de la sede si la escribieron ahí, y si no de la del evento; sin
 * ninguna de las dos se da por hecho que empieza a las 7 de la tarde, que es la
 * hora de casi todas las recepciones y es mejor que no ofrecer el botón.
 *
 * Se manda en hora LOCAL (sin la Z del final) a propósito: si se convirtiera a
 * UTC, el invitado de otro estado se guardaría la boda a otra hora.
 */
export function enlaceCalendario(opciones: {
  titulo: string;
  fechaISO: string;
  hora?: string;
  lugar?: string;
  direccion?: string;
  detalles?: string;
}): string {
  const f = /^(\d{4})-(\d{2})-(\d{2})/.exec(opciones.fechaISO);
  if (!f) return "";
  const t = leerHora(opciones.hora ?? "") ?? leerHora(opciones.fechaISO.slice(11)) ?? { h: 19, m: 0 };
  const inicio = `${f[1]}${f[2]}${f[3]}T${dd(t.h)}${dd(t.m)}00`;
  // Tres horas es lo que dura una recepción de verdad; el invitado lo ajusta.
  const fin = `${f[1]}${f[2]}${f[3]}T${dd((t.h + 3) % 24)}${dd(t.m)}00`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: opciones.titulo,
    dates: `${inicio}/${fin}`,
    location: [opciones.lugar, opciones.direccion].filter(Boolean).join(" — "),
    details: opciones.detalles ?? "",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** "6:00 pm" a partir de "2027-03-20T18:00" (vacío si no trae hora). */
export function horaCorta(fechaISO: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(fechaISO);
  if (!m) return "";
  const h = Number(m[1]);
  const min = m[2];
  const sufijo = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${sufijo}`;
}

/**
 * ¿Hay algo que pintar? Una invitación recién creada (todo en blanco) no debe
 * enseñarse al invitado: para eso está la demo.
 */
export function invitacionTieneContenido(inv: Invitacion): boolean {
  return Boolean(nombresInvitacion(inv).trim() || inv.fechaISO.trim());
}
