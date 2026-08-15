/**
 * MÓDULO ÁLBUM (dentro del portal) — datos y utilidades.
 *
 * Tercer módulo migrado al portal. Habla con el "lugar central" por
 * `@salones/sync` usando la MISMA colección que la app `album-fotos` original
 * ("fotos"), así ambos ven el mismo álbum del evento durante la migración
 * (strangler-fig: el portal ya sirve la experiencia y la app vieja sigue viva).
 *
 * Nota: copia acotada de las utilidades de `apps/album-fotos` (solo lo del
 * invitado: subir y mirar). La pantalla del anfitrión —descargar el álbum
 * completo— sigue en su app hasta migrarla. Cuando el portal la absorba, el
 * módulo se puede extraer a `@salones/module-album`.
 */

import {
  MB_POR_ARCHIVO,
  comprimirImagen as comprimirImagenCompartida,
  pesaDemasiado as pesaDemasiadoSync,
} from "@salones/sync";

/** Colección compartida en el lugar central (la misma que usa `apps/album-fotos`). */
export const COLECCION_FOTOS = "fotos";

/** Una foto o video del álbum. Misma forma que en la app `album-fotos`. */
export type Foto = {
  id: string;
  nombre: string;
  /** URL para mostrarla (del almacenamiento central, o temporal en la demo). */
  url: string;
  /** Tipo MIME (`image/jpeg`, `video/mp4`…). */
  tipo: string;
  /** Marca de tiempo (ms). */
  fecha?: number;
  /**
   * Quién la subió, si el teléfono tenía perfil. Campos ADICIONALES que la app
   * `album-fotos` original ignora sola; hasta hoy el álbum era anónimo y el
   * anfitrión no podía saber de quién era cada recuerdo. Solo viajan en fotos
   * nuevas (las de antes no se reescriben — candado 0016).
   */
  autor?: string;
  /** Su renglón en la lista del anfitrión (si llegó con enlace personal). */
  invitadoId?: string;
  /**
   * Huella (sha-256) de la llave del teléfono que lo subió. Es lo ÚNICO que el
   * servidor acepta como prueba de "esto lo subí yo" para dejar quitarlo:
   * `autor` es solo un nombre, y un nombre lo puede escribir cualquiera.
   */
  autorHuella?: string;
};

/**
 * Tope por archivo. Las fotos se comprimen antes de subir, pero los videos
 * viajan tal cual: un video largo desde el teléfono tardaría una eternidad y el
 * almacenamiento lo rechazaría igual. Mejor avisar antes de empezar.
 *
 * ⚠️ ANTES ERA 50 Y ESTABA MAL (arreglado el 14 ago 2026). El bucket corta a los
 * 25 MB desde la migración 0001, así que este aviso dejaba pasar archivos que el
 * almacén iba a rechazar: el invitado elegía un video de 40 MB, la app lo daba
 * por bueno, se pasaba dos minutos subiéndolo por la red de la boda y recibía un
 * error al final. Ahora el número sale de `@salones/sync`, que es donde vive el
 * del bucket, para que las cinco pantallas que suben digan lo mismo.
 */
export const MAX_MB = MB_POR_ARCHIVO;

/** Genera un id corto para una foto nueva. */
export function nuevoIdFoto(): string {
  return "F-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

/** ¿Es un video (para pintar el botón de reproducir en vez de una imagen)? */
export function esVideo(tipo: string): boolean {
  return tipo.startsWith("video/");
}

/** Solo fotos y videos entran al álbum. */
export function esArchivoDeAlbum(tipo: string): boolean {
  return tipo.startsWith("image/") || esVideo(tipo);
}

/** ¿El archivo pasa del tope? (los videos no se comprimen). */
export function pesaDemasiado(file: File): boolean {
  return pesaDemasiadoSync(file);
}

/** Ordena de más reciente a más antigua. */
export function porFecha(a: Foto, b: Foto): number {
  return (b.fecha ?? 0) - (a.fecha ?? 0);
}

/**
 * Clave de las fotos subidas desde ESTE dispositivo, POR EVENTO. Sirve para que
 * cada invitado pueda borrar LO SUYO (y solo lo suyo) sin tocar los recuerdos de
 * los demás; guardarla por evento evita mezclar dos eventos en el mismo teléfono.
 */
export function claveMisFotos(evento: string): string {
  return `portal:album:mis-fotos:${evento}`;
}

/**
 * Comprime una imagen a JPEG (máx. ~1600 px) antes de subirla, para que pese
 * poco y el almacenamiento rinda: una boda entera cabe en el plan gratuito.
 *
 * ⚠️ ERA UNA COPIA y ya no lo es (14 ago 2026). El mismo canvas estaba escrito
 * tres veces —aquí, en el portal y en `@salones/sync`—, y por eso arreglar el
 * mensaje de "no pudimos leer esa foto" en un sitio no lo arreglaba en los
 * otros. Ahora solo se elige el tamaño: 1600 px en el álbum, porque aquí la
 * foto es el producto y el muro puede permitirse menos.
 */
export function comprimirImagen(file: File, maxLado = 1600, calidad = 0.82): Promise<Blob> {
  return comprimirImagenCompartida(file, maxLado, calidad);
}

/**
 * Fotos de muestra para que la galería del evento "demo" no se vea vacía en las
 * vitrinas. NO se guardan en ninguna colección: son archivos estáticos del
 * portal y desaparecen en cuanto hay una foto de verdad. Un evento real nunca
 * las ve.
 */
export function fotosEjemplo(): Foto[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
    const dosDigitos = String(n).padStart(2, "0");
    return {
      id: `ejemplo-${dosDigitos}`,
      nombre: `recuerdo-${n}.jpg`,
      url: `/img/a${dosDigitos}.jpg`,
      tipo: "image/jpeg",
    };
  });
}
