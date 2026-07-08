/**
 * Datos del álbum del evento. Editable aquí.
 * Las fotos de ejemplo simulan lo que subirían los invitados (para que la
 * galería no se vea vacía en la demostración).
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  organizador: "Suite para Salones",
};

export type Archivo = { id: string; nombre: string; url: string; tipo: string };

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
