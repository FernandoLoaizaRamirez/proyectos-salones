/**
 * VALIDACIÓN DE LO QUE ENTRA DE FUERA — compartido por las Edge Functions.
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTE ARCHIVO:
 *   Estas tres funciones son candados: deciden si una petición de fuera puede
 *   ver las fotos de un evento ajeno, o qué se guarda en la base. Vivían sueltas
 *   dentro de sus `index.ts`, y como esos archivos arrancan un servidor al
 *   cargarse (`Deno.serve(...)` de nivel superior, sin exportar nada), NO SE
 *   PODÍAN PROBAR: la única cobertura era contra el Supabase real, y esa suite
 *   se auto-salta mientras las funciones no estén desplegadas.
 *
 *   Aquí, separadas, son funciones puras y corrientes: se prueban en Node, sin
 *   Supabase y sin Deno. Ver `tests/seguridad/validar.test.ts`.
 *
 * La carpeta empieza por `_` a propósito: Supabase no la trata como una función
 * más, pero `supabase functions deploy` sí empaqueta lo que se importe de aquí.
 *
 * No hay nada de Deno ni de red en este archivo, y así debe seguir.
 */

/** Recorta y limpia. Todo lo que entra aqui viene de fuera y no es de fiar. */
export function texto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const limpio = v.trim().slice(0, max);
  return limpio || null;
}

/**
 * Quita la query de una direccion. Es la linea de defensa que impide que la
 * llave de anfitrion (`?a=…`) acabe guardada en la base.
 */
export function soloRuta(v: unknown): string | null {
  const bruto = texto(v, 300);
  if (!bruto) return null;
  const sinQuery = bruto.split("?")[0].split("#")[0];
  return sinQuery.slice(0, 200) || null;
}

/**
 * ¿Esta ruta pertenece de verdad a la carpeta de este evento?
 *
 * No basta con `startsWith`: `demo-otra/foto.jpg` empieza por `demo` sin ser del
 * evento `demo`. Y hay que rechazar cualquier `..` que intente salirse.
 */
export function esDelEvento(ruta: string, evento: string): boolean {
  if (typeof ruta !== "string" || !ruta || ruta.length > 300) return false;
  if (ruta.includes("..") || ruta.startsWith("/")) return false;
  const trozos = ruta.split("/");
  // Exactamente <evento>/<archivo>: ni más hondo, ni en otra carpeta.
  return trozos.length === 2 && trozos[0] === encodeURIComponent(evento) && trozos[1].length > 0;
}
