/**
 * Datos del álbum del evento. Editable aquí.
 * Las fotos de ejemplo simulan lo que subirían los invitados (para que la
 * galería no se vea vacía en la demostración).
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  organizador: "Suite para Salones",
};

/**
 * Evento compartido y colección de fotos para @salones/sync. Con el servicio
 * gestionado, cada foto sube al almacenamiento central y aparece en el álbum de
 * todos; sin él, la app funciona como demo local de un solo dispositivo.
 */
export const EVENTO_ID = "demo";
export const COLECCION_FOTOS = "fotos";

export type Archivo = { id: string; nombre: string; url: string; tipo: string };

/**
 * Comprime una imagen a JPEG (máx. ~1600 px) antes de subirla, para que pese
 * poco y el almacenamiento rinda: una boda entera cabe en el plan gratuito.
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

export const fotosEjemplo: Archivo[] = [
  { id: "s1", nombre: "recuerdo-1.jpg", url: "/img/a01.jpg", tipo: "image/jpeg" },
  { id: "s2", nombre: "recuerdo-2.jpg", url: "/img/a02.jpg", tipo: "image/jpeg" },
  { id: "s3", nombre: "recuerdo-3.jpg", url: "/img/a03.jpg", tipo: "image/jpeg" },
  { id: "s4", nombre: "recuerdo-4.jpg", url: "/img/a04.jpg", tipo: "image/jpeg" },
  { id: "s5", nombre: "recuerdo-5.jpg", url: "/img/a05.jpg", tipo: "image/jpeg" },
  { id: "s6", nombre: "recuerdo-6.jpg", url: "/img/a06.jpg", tipo: "image/jpeg" },
  { id: "s7", nombre: "recuerdo-7.jpg", url: "/img/a07.jpg", tipo: "image/jpeg" },
  { id: "s8", nombre: "recuerdo-8.jpg", url: "/img/a08.jpg", tipo: "image/jpeg" },
];
