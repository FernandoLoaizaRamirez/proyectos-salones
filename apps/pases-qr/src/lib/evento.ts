/**
 * Datos del evento + utilidades de los PASES CON QR.
 *
 * La lista de invitados y el registro de la puerta viven en el "lugar central"
 * (@salones/sync), en dos colecciones por evento. Antes vivían en localStorage
 * sin saber de qué boda eran, con tres consecuencias que se veían en la fiesta:
 * dos bodas en la misma tablet se pisaban, si el teléfono de la puerta se
 * quedaba sin batería se perdía quién había entrado, y dos personas escaneando
 * en dos puertas veían listas distintas.
 */
import { codificarPaseEnlace, decodificarPaseEnlace, idPaseDeInvitado } from "@salones/core";

/**
 * Las dos colecciones del evento.
 *
 * ⚠️ VAN SEPARADAS Y CON PREFIJOS DISTINTOS A PROPÓSITO. En la tabla `items` el
 * `id` es llave primaria de TODA la tabla, no de la colección
 * (`0001_estado_actual.sql`): si la fila del pase y la de su acceso usaran el
 * mismo id, la segunda pisaría a la primera. Por eso el acceso de `SR-AB12` se
 * guarda como `ACC-SR-AB12`.
 */
export const COLECCION_PASES = "pases";
export const COLECCION_ACCESOS = "accesos";

/** El id de la fila de acceso de un invitado. Ver la nota de arriba. */
export const idDeAcceso = (idInvitado: string): string => `ACC-${idInvitado}`;

/**
 * Quién entró y cuándo.
 *
 * `entro: false` en vez de borrar la fila: desde el corte de la 0009, BORRAR
 * exige la llave de anfitrión, y la tablet de la puerta no tiene por qué
 * tenerla. Desmarcar a alguien es una corrección normal en la entrada, no una
 * moderación, así que no puede depender de una llave privada.
 */
export type Acceso = {
  id: string; // `ACC-<id del invitado>`
  invitadoId: string;
  entro: boolean;
  ts: number;
};

/**
 * Los textos de la MUESTRA, el respaldo de todo lo demás.
 *
 * Ya no son "el evento": desde que la app sabe de qué evento es (ver
 * ./evento-real), un evento real saca su nombre y su fecha de la colección
 * `invitacion` que captura el salón. Esto queda para la vitrina del catálogo
 * y para cualquier boda que todavía no capture su invitación.
 */
export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  fechaCorta: "20 mar 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

export type Tipo = "General" | "VIP";

export type Invitado = {
  id: string; // token único que va dentro del QR
  nombre: string;
  mesa: string;
  personas: number;
  tipo: Tipo;
};

/**
 * Lista de ejemplo.
 *
 * ⚠️ SOLO PARA LA DEMO LOCAL. Nunca debe sembrarse en el servidor: los ids son
 * fijos y la llave primaria de `items` es global, así que dos eventos que la
 * sembraran chocarían entre sí — y además cada boda real nacería con ocho
 * invitados de mentira y 18 personas falsas en el conteo de la puerta.
 */
export const invitadosIniciales: Invitado[] = [
  { id: "SR-1042", nombre: "Ana Herrera Medina", mesa: "1", personas: 2, tipo: "VIP" },
  { id: "SR-1043", nombre: "Rodrigo Salazar Ruiz", mesa: "1", personas: 2, tipo: "VIP" },
  { id: "SR-2087", nombre: "Familia Loaiza Ramírez", mesa: "4", personas: 4, tipo: "General" },
  { id: "SR-2091", nombre: "Valentina Montes", mesa: "6", personas: 1, tipo: "General" },
  { id: "SR-2104", nombre: "Grupo Alvarado", mesa: "8", personas: 3, tipo: "General" },
  { id: "SR-2115", nombre: "Carlos y Diana Pérez", mesa: "5", personas: 2, tipo: "General" },
  { id: "SR-2151", nombre: "Miguel Ángel Torres", mesa: "3", personas: 2, tipo: "VIP" },
  { id: "SR-2168", nombre: "Regina y José", mesa: "7", personas: 2, tipo: "General" },
];

/**
 * Texto que se guarda dentro del código QR del pase.
 *
 * El id pasa por `idPaseDeInvitado` (@salones/core): para los pases creados
 * aquí (`SR-…`) no cambia NADA — se respetan tal cual y los QR ya impresos
 * siguen valiendo. Para un pase armado desde el panel del salón, cuyo id es el
 * UUID del invitado, el QR lleva `PS-<uuid>`: el id de su FILA en la colección
 * "pases" (el UUID a pelo ya es su renglón en "respuestas", y la llave
 * primaria de `items` es global — ver la nota de las colecciones de arriba).
 */
export function contenidoQR(inv: Invitado): string {
  return `PASE-SR:${idPaseDeInvitado(inv.id)}`;
}

/** Extrae el id del pase a partir del texto leído por el escáner. */
export function idDesdeQR(texto: string): string | null {
  const m = texto.trim().match(/^PASE-SR:(.+)$/);
  return m ? (m[1] ?? null) : null;
}

/**
 * Genera el id de un pase. Es lo que va dentro del QR impreso, así que una vez
 * repartido no se puede cambiar.
 *
 * ⚠️ 8 caracteres, no 4, y con azar de verdad. Antes eran 4 de `Math.random()`
 * (1,6 millones de combinaciones) comprobados solo contra la lista que había EN
 * MEMORIA. Eso bastaba cuando cada tablet vivía en su mundo, pero ahora los
 * pases de todas las bodas comparten la misma tabla y el `id` es llave primaria
 * GLOBAL: dos eventos que sacaran el mismo id se pisarían el pase, y guardar es
 * un upsert, así que lo haría en silencio. Con 8 caracteres eso deja de ser una
 * posibilidad realista.
 */
export function nuevoId(existentes: Invitado[]): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin I/O/0/1: se dictan mal
  const usados = new Set(existentes.map((i) => i.id));
  let id = "";
  do {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    id = "SR-" + Array.from(bytes, (b) => abc[b % abc.length]).join("");
  } while (usados.has(id));
  return id;
}

/**
 * Empaqueta un invitado para compartir su pase por un enlace (sin servidor).
 *
 * Delega en el codec compartido de @salones/core para que el panel del salón
 * y esta app hablen EXACTAMENTE el mismo idioma sin copiarse el formato. Solo
 * cambia el vocabulario en el camino: las `personas` de la puerta son los
 * `cupos` del enlace personal (el codec emite los dos nombres, así el mismo
 * enlace sirve aquí, en el portal y en el photobooth).
 */
export function codificarPase(inv: Invitado): string {
  return codificarPaseEnlace({
    id: inv.id,
    nombre: inv.nombre,
    cupos: inv.personas,
    mesa: inv.mesa,
    tipo: inv.tipo,
  });
}

/**
 * Recupera el invitado desde el enlace del pase.
 *
 * Entiende tanto los enlaces nuevos (con `cupos`) como los VIEJOS ya
 * repartidos por WhatsApp (que solo traen `personas`): el codec de core acepta
 * los dos, y aquí nada más se traduce al vocabulario local — sin mesa vale por
 * "", sin tipo vale por "General", para que la puerta trate igual a todos.
 */
export function decodificarPase(datos: string): Invitado | null {
  const pase = decodificarPaseEnlace(datos);
  if (!pase) return null;
  return {
    id: pase.id,
    nombre: pase.nombre,
    mesa: pase.mesa ?? "",
    personas: pase.cupos,
    tipo: pase.tipo ?? "General",
  };
}
