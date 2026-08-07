/**
 * ÁLBUM DEL EVENTO — lo que necesita el anfitrión.
 *
 * Las fotos y videos viven en el "lugar central", en la colección "fotos": la
 * MISMA que escriben el portal del invitado y la app `album-fotos`. Subirlas es
 * cosa de los invitados; desde aquí se ven, se proyectan, se moderan y —lo más
 * importante para el salón— se DESCARGAN todas para entregárselas al cliente.
 */

/** Colección compartida (la misma que usan el portal y `apps/album-fotos`). */
export const COLECCION_FOTOS = "fotos";

/** Una foto o video del álbum. Misma forma en todas las apps. */
export type Foto = {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  fecha?: number;
};

export function esVideo(tipo: string): boolean {
  return tipo.startsWith("video/");
}

/** Ordena de más reciente a más antigua. */
export function porFecha(a: Foto, b: Foto): number {
  return (b.fecha ?? 0) - (a.fecha ?? 0);
}

/**
 * Enlace que se comparte (QR incluido) para que los invitados suban sus fotos.
 * Preferimos el PORTAL, donde ya vive el álbum del invitado; si aún no está
 * configurado, la app `album-fotos` de siempre, que entiende el mismo `?e=`.
 */
export function enlaceSubir(codigo: string, baseAlbum: string): string {
  const portal = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  const evento = `?e=${encodeURIComponent(codigo)}`;
  if (portal) return `${portal}/album${evento}`;
  return baseAlbum ? `${baseAlbum}/${evento}` : "";
}

/**
 * La descarga en bloque vive ahora en `@salones/sync`, junto a `subirArchivo` y
 * `resolverMedios`: es la misma capa de medios, y así la usan también las apps
 * del invitado en vez de reimplementarla (mal) cada una. Se sigue exportando
 * desde aquí con el nombre de siempre para no tocar a quien ya la usa.
 */
export { descargarMedios as descargarAlbum, type ResultadoDescarga } from "@salones/sync";
