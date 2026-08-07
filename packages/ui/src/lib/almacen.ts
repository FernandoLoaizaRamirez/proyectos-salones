/**
 * Guardar en el navegador SIN tumbar la pantalla si no se puede.
 *
 * POR QUÉ EXISTE (encontrado el 6 ago 2026, probándolo en el navegador):
 *   Nueve sitios de siete apps hacían `localStorage.setItem(...)` a pelo dentro
 *   de un efecto de React. Cuando el navegador no deja escribir —y eso pasa más
 *   de lo que parece: **modo privado de Safari**, almacenamiento lleno, cookies
 *   bloqueadas—, ese `setItem` lanza, el error sube por el efecto y React
 *   desmonta la pantalla entera. El invitado se queda mirando el mensaje de
 *   rescate de Next, en inglés y sin la marca del salón, a media fiesta.
 *
 *   Se comprobó en la playlist: con el almacenamiento bloqueado, la página
 *   entera moría con "This page couldn't load". No es un caso raro de
 *   laboratorio: es un iPhone en modo privado.
 *
 * QUÉ HACE: intenta guardar y, si no puede, se calla y devuelve `false`. Perder
 * la preferencia de un invitado es un incordio; perderle la pantalla, no.
 * Quien necesite saberlo, mira lo que devuelve.
 */
export function guardarLocal(clave: string, valor: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(clave, valor);
    return true;
  } catch {
    return false;
  }
}

/** El par del anterior: leer sin que un almacenamiento bloqueado tumbe nada. */
export function leerLocal(clave: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}
