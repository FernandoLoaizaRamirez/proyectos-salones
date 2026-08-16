/**
 * EL PASE PERSONAL DEL INVITADO — el enlace que abre su pase con QR.
 *
 * El panel arma el enlace y apps/pases-qr lo pinta. Igual que el enlace
 * personal de la suite (ver ./invitado-enlace), los datos viajan en el
 * FRAGMENTO (`#`) y nunca tocan el servidor. Este módulo existe para que el
 * panel y la app del pase hablen el mismo idioma sin copiarse el formato:
 * hoy `codificarPase`/`decodificarPase` viven dentro de apps/pases-qr y el
 * panel no puede importarlos sin acoplarse a una app entera.
 *
 * ⚠️ HAY DOS MUNDOS LEYENDO EL MISMO ENLACE:
 *   - El /pase viejo, YA DESPLEGADO, lee el campo `personas` (su tipo
 *     Invitado de siempre: {id, nombre, mesa, personas, tipo}).
 *   - El portal y el photobooth leen `cupos` (el vocabulario del enlace
 *     personal de ./invitado-enlace).
 * Por eso el codificador emite LOS DOS nombres con el mismo valor: un solo
 * enlace repartido por WhatsApp sirve en los dos mundos, sin esperar a que
 * todos los despliegues se pongan de acuerdo el mismo día.
 */

/** Los dos tipos de pase que la puerta distingue. */
export type TipoPase = "General" | "VIP";

/**
 * Lo que viaja en el enlace del pase.
 *
 * `id` es el id del INVITADO tal cual — para un invitado del panel es su UUID
 * de guests, el MISMO de su renglón en la colección "respuestas". La identidad
 * no se disfraza: quien quiera el id de la FILA del pase usa
 * `idPaseDeInvitado`, no este campo.
 */
export type PaseEnlace = {
  id: string;
  nombre: string;
  /** Cuántos lugares ampara el pase ("Familia Núñez" puede traer 4). */
  cupos: number;
  /** Nombre o número de mesa, si el acomodo ya se hizo. */
  mesa?: string;
  /** Solo si el evento distingue accesos; sin él la puerta trata a todos igual. */
  tipo?: TipoPase;
};

/**
 * Empaqueta el pase para su enlace personal. Misma receta que toda la suite:
 * `btoa(encodeURIComponent(JSON.stringify(...)))` — el `encodeURIComponent`
 * escapa acentos y eñes a ASCII antes del base64, sin él `btoa` reventaría
 * con cualquier "Núñez".
 *
 * `personas` va DUPLICADO con el valor de `cupos` a propósito: el /pase viejo
 * ya desplegado lee `personas`, y el portal/photobooth leen `cupos`. Ver la
 * nota de arriba del módulo. `mesa` y `tipo` solo se emiten si vienen, para
 * no ensuciar el enlace de un evento que no los usa.
 */
export function codificarPaseEnlace(p: PaseEnlace): string {
  const carga: Record<string, unknown> = {
    id: p.id,
    nombre: p.nombre,
    cupos: p.cupos,
    personas: p.cupos,
  };
  if (p.mesa !== undefined) carga.mesa = p.mesa;
  if (p.tipo !== undefined) carga.tipo = p.tipo;
  return btoa(encodeURIComponent(JSON.stringify(carga)));
}

/**
 * Lee los datos del pase que vienen en el enlace. NUNCA lanza: un enlace
 * recortado por WhatsApp devuelve `null` y la app enseña su pantalla de
 * "pide tu pase", no un error.
 *
 * Es compatible con el `codificarPase` viejo de apps/pases-qr, que emite
 * `personas` y no conoce `cupos`: si `cupos` no viene o viene raro, se toma
 * `personas`; si tampoco, vale por 1 — mejor dejar pasar a una persona que
 * dejar fuera al invitado por un dato mal capturado.
 */
export function decodificarPaseEnlace(datos: string): PaseEnlace | null {
  try {
    const obj = JSON.parse(decodeURIComponent(atob(datos))) as Record<string, unknown>;
    if (typeof obj?.id !== "string" || typeof obj?.nombre !== "string") return null;

    const numeroValido = (v: unknown): number | null =>
      typeof v === "number" && v > 0 ? Math.floor(v) : null;
    const cupos = numeroValido(obj.cupos) ?? numeroValido(obj.personas) ?? 1;

    const pase: PaseEnlace = { id: obj.id, nombre: obj.nombre, cupos };
    if (typeof obj.mesa === "string") pase.mesa = obj.mesa;
    // Un tipo desconocido se descarta, no se inventa: la puerta trata al
    // invitado como General por omisión y nadie se queda fuera por un typo.
    if (obj.tipo === "General" || obj.tipo === "VIP") pase.tipo = obj.tipo;
    return pase;
  } catch {
    return null;
  }
}

/**
 * El atajo para las apps: les llega `location.hash` tal cual (con el `#` de
 * adelante o sin él) y aquí se limpia una sola vez.
 */
export function leerPaseDeHash(hash: string): PaseEnlace | null {
  const datos = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!datos) return null;
  return decodificarPaseEnlace(datos);
}

/**
 * El id de la FILA del pase en la colección "pases", a partir del id del
 * invitado.
 *
 * ⚠️ POR QUÉ EL PREFIJO: en la tabla `items` el `id` es llave primaria de
 * TODA la tabla, no de la colección. El UUID del guest del panel YA es el id
 * de su renglón en la colección "respuestas"; si el pase del mismo invitado
 * usara el UUID a pelo, guardar el pase pisaría su respuesta (guardar es un
 * upsert, así que lo haría en silencio). Por eso el pase vive en su propia
 * fila `PS-<uuid>` — y el QR de la puerta usa ESTE id, no el UUID.
 *
 * Los ids que ya traen prefijo se respetan: `SR-` es el de los pases creados
 * a mano dentro de apps/pases-qr (ver su `nuevoId`), y un `PS-` ya prefijado
 * no se vuelve a prefijar (la función es segura de aplicar dos veces).
 */
export function idPaseDeInvitado(id: string): string {
  if (id.startsWith("SR-") || id.startsWith("PS-")) return id;
  return `PS-${id}`;
}
