/**
 * Datos del álbum del evento. Editable aquí.
 * Las fotos de ejemplo simulan lo que subirían los invitados (para que la
 * galería no se vea vacía en la demostración).
 */
import { comprimirImagen as comprimirImagenCompartida } from "@salones/sync";

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

export type Archivo = {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  /**
   * Huella del teléfono que lo subió (sha-256 de su llave de autor). Es lo que
   * permite que quien sube una foto pueda quitarla, y solo la suya. Opcional: los
   * recuerdos de antes del 14 ago 2026 no la llevan, y esos solo los quita el
   * anfitrión.
   */
  autorHuella?: string;
};

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
