/**
 * EL ENLACE PERSONAL DEL INVITADO — la identidad compartida de toda la suite.
 *
 * El anfitrión reparte a cada invitado un enlace con sus datos (quién es y
 * cuántos cupos tiene) empaquetados en el FRAGMENTO (`#`), que nunca viaja al
 * servidor: la identidad se queda en el teléfono del invitado. Ese formato ya
 * vive repetido en dos lugares —el panel lo escribe (`codificarInvitado` de
 * apps/catalogo) y el portal lo lee (`decodificarInvitado` de su módulo RSVP)—
 * y ahora más apps van a necesitarlo (la invitación, el acomodo de mesas…).
 * Copiarlo una tercera vez es la receta para que un día dejen de entenderse.
 *
 * Por eso el vocabulario se muda AQUÍ, al paquete puro, y las apps lo importan.
 *
 * ⚠️ EL FORMATO ES UN CONTRATO: `btoa(encodeURIComponent(JSON.stringify(...)))`,
 * byte a byte igual que el del panel. Hay enlaces ya repartidos en manos de
 * invitados reales; cambiar un solo carácter del empaquetado los rompería todos.
 * Las pruebas fijan esa identidad a propósito.
 */

/** Lo que viaja en el enlace: quién es y cuántas personas cubre su invitación. */
export type InvitadoEnlace = {
  id: string;
  nombre: string;
  /** Cuántos lugares ampara el enlace ("Familia Núñez" puede traer 4). */
  cupos: number;
};

/*
 * `btoa`/`atob` existen en el navegador Y en el Node moderno (viven en
 * `globalThis`), así que este módulo sigue siendo puro: corre igual en el
 * panel, en el portal y en las pruebas. El `encodeURIComponent` de en medio
 * escapa los acentos y la eñe a ASCII antes del base64 — sin él, `btoa`
 * reventaría con cualquier "Núñez".
 */

/**
 * Empaqueta al invitado para su enlace personal. EXACTAMENTE el mismo resultado
 * que `codificarInvitado` del panel del salón: si esto divergiera, los enlaces
 * nuevos y los ya repartidos dejarían de hablar el mismo idioma.
 */
export function codificarInvitadoEnlace(inv: InvitadoEnlace): string {
  return btoa(encodeURIComponent(JSON.stringify({ id: inv.id, nombre: inv.nombre, cupos: inv.cupos })));
}

/**
 * Lee los datos del invitado que vienen en el enlace. NUNCA lanza: un enlace
 * recortado por WhatsApp o manoseado a mano devuelve `null` y la app cae a su
 * modo abierto, en vez de enseñarle un error al invitado.
 */
export function decodificarInvitadoEnlace(datos: string): InvitadoEnlace | null {
  try {
    const obj = JSON.parse(decodeURIComponent(atob(datos))) as Partial<InvitadoEnlace>;
    if (typeof obj?.id === "string" && typeof obj?.nombre === "string") {
      // Cupos raros (cero, negativos, texto) valen por 1: mejor dejar pasar a
      // una persona que dejar fuera al invitado por un dato mal capturado.
      const cupos = typeof obj.cupos === "number" && obj.cupos > 0 ? Math.floor(obj.cupos) : 1;
      return { id: obj.id, nombre: obj.nombre, cupos };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * El atajo para las apps: les llega `location.hash` tal cual (con el `#` de
 * adelante o sin él, según de dónde lo saquen) y aquí se limpia una sola vez.
 */
export function leerInvitadoDeHash(hash: string): InvitadoEnlace | null {
  const datos = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!datos) return null;
  return decodificarInvitadoEnlace(datos);
}
