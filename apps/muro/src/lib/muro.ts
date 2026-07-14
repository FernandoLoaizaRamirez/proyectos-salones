/**
 * Datos y utilidades del MURO DE MENSAJES (libro de firmas digital).
 *
 * Los invitados escriben un mensaje, lo firman con su nombre y (opcional) suben
 * una foto. Todo se guarda en el dispositivo (localStorage). El anfitrión ve el
 * muro con todos los mensajes en tarjetas y puede proyectarlo en "modo pantalla"
 * durante la fiesta. La foto se guarda como dataURL (texto), comprimida.
 *
 * SIN SERVIDOR: para que un mensaje escrito en el teléfono de un invitado llegue
 * a la pantalla del anfitrión hace falta un sistema central (servicio
 * gestionado). En un mismo navegador, las pestañas se sincronizan en vivo; y al
 * firmar se ofrece enviar el mensaje también por WhatsApp al anfitrión.
 *
 * TODO editable aquí (white-label): datos del evento y la semilla de ejemplo.
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
  // Texto que aparece arriba del muro y en el modo pantalla.
  invitacion: "Déjales unas palabras a los novios",
};

export type Mensaje = {
  id: string;
  nombre: string;
  texto: string;
  foto?: string; // dataURL (o ruta a /img en la semilla)
  fecha: number; // marca de tiempo (ms)
};

/**
 * Identificador del evento compartido y nombre de la colección para el módulo
 * de sincronización (@salones/sync). En la Fase 1 hay un solo evento de
 * demostración; cuando exista la creación real de eventos, este id vendrá del
 * enlace/QR del evento concreto.
 */
export const EVENTO_ID = "demo";
export const COLECCION_MENSAJES = "mensajes";

/** Una hora en milisegundos, para armar fechas de ejemplo legibles. */
const HORA = 3600 * 1000;

/**
 * Semilla de ejemplo (para que el muro no se vea vacío). Las fechas se calculan
 * relativas a "ahora" para que siempre luzcan recientes en la demo.
 */
export function mensajesIniciales(): Mensaje[] {
  const ahora = Date.now();
  return [
    {
      id: "MS-001",
      nombre: "Valentina Montes",
      texto:
        "¡Qué felicidad verlos dar este paso! Les deseo una vida llena de amor, risas y aventuras juntos. 💍",
      foto: "/img/m1.jpg",
      fecha: ahora - 0.2 * HORA,
    },
    {
      id: "MS-002",
      nombre: "Familia Loaiza Ramírez",
      texto:
        "Gracias por dejarnos ser parte de este día tan especial. Que su amor crezca cada día más. ¡Los queremos!",
      fecha: ahora - 0.6 * HORA,
    },
    {
      id: "MS-003",
      nombre: "Carlos y Diana",
      texto:
        "Por muchos años de complicidad, viajes y cafés por la mañana. ¡Felicidades, tortolitos!",
      foto: "/img/m2.jpg",
      fecha: ahora - 1.4 * HORA,
    },
    {
      id: "MS-004",
      nombre: "Abuela Carmen",
      texto:
        "Mi niña, hoy mi corazón está lleno. Que Dios los bendiga y los acompañe siempre. Con todo mi cariño.",
      fecha: ahora - 2.1 * HORA,
    },
    {
      id: "MS-005",
      nombre: "Diego Salazar",
      texto: "¡Hasta que por fin! 😄 Los mejores deseos para mi hermano y su reina. Salud por ustedes.",
      fecha: ahora - 3 * HORA,
    },
    {
      id: "MS-006",
      nombre: "Grupo Alvarado",
      texto:
        "Un brindis por el comienzo de su historia. Que nunca les falte música para bailar juntos.",
      foto: "/img/m3.jpg",
      fecha: ahora - 4.5 * HORA,
    },
    {
      id: "MS-007",
      nombre: "Regina y José",
      texto: "Con cariño para los novios: que cada día se elijan una y otra vez. ¡Felicidades!",
      fecha: ahora - 6 * HORA,
    },
    {
      id: "MS-008",
      nombre: "Miguel Ángel Torres",
      texto: "¡Enhorabuena! Gracias por una noche inolvidable. Se ven felices y se nota que es de verdad.",
      fecha: ahora - 20 * HORA,
    },
  ];
}

/** Genera un id corto y único, no repetido con los existentes. */
export function nuevoId(existentes: Mensaje[]): string {
  const usados = new Set(existentes.map((m) => m.id));
  let id = "";
  do {
    id = "MS-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (usados.has(id));
  return id;
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
 * Comprime una imagen a un dataURL manejable (máx. ~1200 px, JPEG). Así las
 * fotos ocupan poco y caben varias en el almacenamiento del dispositivo.
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

/** Descarga todos los mensajes como un recuerdo en texto (para guardar o imprimir). */
export function exportarRecuerdo(mensajes: Mensaje[]): void {
  const lineas: string[] = [
    `Muro de mensajes — ${evento.nombre}`,
    evento.fecha,
    evento.lugar,
    "",
    `${mensajes.length} mensaje${mensajes.length === 1 ? "" : "s"} de tus invitados`,
    "========================================",
    "",
  ];
  for (const m of [...mensajes].sort((a, b) => a.fecha - b.fecha)) {
    lineas.push(`— ${m.nombre}`);
    lineas.push(m.texto);
    if (m.foto) lineas.push("[foto adjunta]");
    lineas.push("");
  }
  lineas.push("========================================");
  lineas.push(`Recuerdo generado con ${evento.organizador.nombre}.`);

  const blob = new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "muro-de-mensajes.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}
