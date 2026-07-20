/**
 * MÓDULO MURO (dentro del portal) — datos y utilidades.
 *
 * Primer módulo migrado al portal. Habla con el "lugar central" por
 * `@salones/sync` usando la MISMA colección que la app `muro` original
 * ("mensajes"), así que ambos ven el mismo contenido del evento mientras dure la
 * migración (estrategia strangler-fig: el portal ya sirve la experiencia y la app
 * vieja sigue viva hasta retirarla).
 *
 * Nota: estas utilidades son una copia acotada de las de `apps/muro`. Cuando el
 * portal absorba también la pantalla del anfitrión, el módulo se puede extraer a
 * un paquete `@salones/module-muro` sin cambiar el contrato.
 */

/** Un mensaje del libro de firmas. Misma forma que en la app `muro`. */
export type Mensaje = {
  id: string;
  nombre: string;
  texto: string;
  /** Foto opcional como dataURL (texto), ya comprimida. */
  foto?: string;
  /** Marca de tiempo (ms). */
  fecha: number;
};

/** Colección compartida en el lugar central (la misma que usa `apps/muro`). */
export const COLECCION_MENSAJES = "mensajes";

/** Genera un id corto para un mensaje nuevo. */
export function nuevoIdMensaje(): string {
  return "MS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Texto tipo "hace un momento / hace 2 h / ayer". */
export function tiempoRelativo(fecha: number, ahora = Date.now()): string {
  const seg = Math.max(0, Math.round((ahora - fecha) / 1000));
  if (seg < 60) return "hace un momento";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.round(hrs / 24);
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/**
 * Comprime una imagen a un dataURL manejable (máx. ~1200 px, JPEG), para que las
 * fotos ocupen poco. Solo corre en el navegador (usa canvas).
 */
export function comprimirImagen(file: File, maxLado = 1200, calidad = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.onerror = () => reject(new Error("Imagen no válida."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}
