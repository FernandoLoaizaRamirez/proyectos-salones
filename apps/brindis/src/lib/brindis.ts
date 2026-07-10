/**
 * Datos y utilidades del BRINDIS EN VIDEO.
 *
 * El invitado graba un video corto con su teléfono (MediaRecorder), lo
 * previsualiza y lo envía: lo descarga y/o lo comparte por WhatsApp al
 * organizador. Sin servidor, el video NO se sube a ningún lado: se queda en el
 * teléfono del invitado (galería local con IndexedDB) hasta que lo comparte.
 *
 * UPSELL: juntar automáticamente los videos de muchos invitados en un solo lugar
 * requiere el "servicio gestionado" con almacenamiento central.
 *
 * TODO editable aquí (white-label).
 */

export const evento = {
  nombre: "Boda Ana & Rodrigo",
  fecha: "Sábado 20 de marzo de 2027",
  lugar: "Hacienda Santa Renata · Culiacán",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

/** Duración máxima sugerida del brindis (segundos). */
export const MAX_SEGUNDOS = 60;

/** Elige un formato de grabación soportado por el navegador. */
export function elegirMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidatos = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  for (const c of candidatos) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* noop */
    }
  }
  return "";
}

/** Extensión de archivo según el tipo MIME. */
export function extensionDe(mime: string): string {
  return mime.includes("mp4") ? "mp4" : "webm";
}

/** Formatea segundos como m:ss. */
export function formatoTiempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Descarga un blob de video como archivo. */
export function descargarVideo(blob: Blob, mime: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brindis-${evento.nombre.replace(/\s+/g, "-").toLowerCase()}.${extensionDe(mime)}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Comparte el video con la hoja nativa (Web Share API → WhatsApp).
 * Devuelve true si se pudo compartir; false si el navegador no lo soporta.
 */
export async function compartirVideo(blob: Blob, mime: string): Promise<boolean> {
  try {
    const file = new File([blob], `brindis.${extensionDe(mime)}`, { type: blob.type || mime });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: `Brindis · ${evento.nombre}`,
        text: `Un brindis para ${evento.nombre} 🥂`,
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Galería local (IndexedDB): guarda los videos grabados en este       */
/* dispositivo para que sigan ahí aunque se recargue la página.        */
/* ------------------------------------------------------------------ */

const DB_NOMBRE = "brindis-db";
const STORE = "videos";

export type VideoGuardado = { id: string; blob: Blob; mime: string; fecha: number };

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarVideoLocal(blob: Blob, mime: string): Promise<VideoGuardado> {
  const registro: VideoGuardado = {
    id: "V-" + Math.random().toString(36).slice(2, 10),
    blob,
    mime,
    fecha: Date.now(),
  };
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(registro);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return registro;
}

export async function listarVideosLocales(): Promise<VideoGuardado[]> {
  const db = await abrirDB();
  const videos = await new Promise<VideoGuardado[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as VideoGuardado[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return videos.sort((a, b) => b.fecha - a.fecha);
}

export async function borrarVideoLocal(id: string): Promise<void> {
  const db = await abrirDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
