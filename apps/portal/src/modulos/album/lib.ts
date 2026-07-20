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
};

/**
 * Tope por archivo. Las fotos se comprimen antes de subir, pero los videos
 * viajan tal cual: un video largo desde el teléfono tardaría una eternidad y el
 * almacenamiento lo rechazaría igual. Mejor avisar antes de empezar.
 */
export const MAX_MB = 50;

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
  return file.size > MAX_MB * 1024 * 1024;
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
 * Solo corre en el navegador (usa canvas).
 */
export function comprimirImagen(file: File, maxLado = 1600, calidad = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen."))),
        "image/jpeg",
        calidad,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagen no válida."));
    };
    img.src = url;
  });
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
