/**
 * LA VITRINA DEL VISITANTE, PUESTA EN EL ENLACE DE LA PUERTA DEL INVITADO.
 * ---------------------------------------------------------------------------
 * EL PROBLEMA QUE RESUELVE, medido en producción el 22 ago 2026:
 *
 * Hay DOS demos y no se parecen en nada.
 *   - `?e=demo` (la compartida): el portal la enseña VACÍA. El muro dice "Aún no
 *     hay mensajes, sé el primero en firmar" y la playlist enseña dos restos de
 *     pruebas —"Perfect" y "Besame Mucho", un voto cada una—. Está así A
 *     PROPÓSITO: los ejemplos NO se siembran en el demo compartido porque sus
 *     identificadores son globales y chocarían entre visitantes.
 *   - `?e=demo-xxxxxx` (la vitrina propia de cada visitante): se siembra sola.
 *     Ahí el muro sale lleno y la playlist tiene su ranking.
 *
 * El catálogo ya reparte el código bueno en sus enlaces y en el QR. La puerta
 * del invitado NO: mandaba a `?e=demo`, o sea al camino muerto. Un salón que
 * pulsaba "Mira cómo se ve por dentro" veía la mitad de las pantallas vacías.
 *
 * POR QUÉ SE COPIA LA CONSTANTE EN VEZ DE IMPORTARLA: `PREFIJO_VITRINA` vive en
 * @salones/sync, y ese paquete arrastra el cliente de la base de datos entero.
 * Este sitio es una web de marketing estática; meterle eso para leer una cadena
 * de seis letras sería pagar muy caro. La prueba `tests/paneles/vitrina-sitio.test.ts`
 * ata las dos constantes: si alguien cambia la de sync, el CI se pone rojo.
 */

/** Debe coincidir con `PREFIJO_VITRINA` de @salones/sync (y con `es_vitrina` en SQL). */
export const PREFIJO_VITRINA = "demo-";

/** La misma llave que usa @salones/sync, para no inventar dos nombres. */
const LLAVE = "salones:vitrina";

/**
 * El código de este visitante. Se inventa una vez y se recuerda.
 *
 * Devuelve `null` si el navegador no deja guardar (modo privado). En ese caso
 * el enlace se queda como estaba: se pierde la mejora, no la demo.
 */
export function leerOInventarVitrina(): string | null {
  try {
    const guardada = window.localStorage.getItem(LLAVE);
    if (guardada && /^[a-z0-9-]{1,60}$/i.test(guardada)) return guardada;
    const nueva = PREFIJO_VITRINA + Math.random().toString(36).slice(2, 8);
    window.localStorage.setItem(LLAVE, nueva);
    return nueva;
  } catch {
    return null;
  }
}

/** La misma dirección con el código pegado. Sin código, la deja intacta. */
export function conVitrina(url: string, vitrina: string | null): string {
  if (!vitrina) return url;
  return `${url}${url.includes("?") ? "&" : "?"}e=${vitrina}`;
}
