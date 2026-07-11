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

/**
 * Elige un formato de grabación soportado por el navegador.
 * Se prioriza MP4 porque es el que WhatsApp reproduce como video (no como
 * "archivo/documento"); si el navegador no lo soporta, cae a WebM.
 */
export function elegirMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidatos = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
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
  // Agregarlo al documento hace que la descarga funcione también en navegadores
  // como Samsung Internet o Firefox, no solo en Chrome.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* Marco temático del brindis (se "quema" dentro del video)            */
/* ------------------------------------------------------------------ */

/** Tamaño del video de salida (vertical 3:4). */
export const VIDEO_ANCHO = 720;
export const VIDEO_ALTO = 960;

export type MarcoBrindis = {
  id: string;
  nombre: string;
  /** Color de acento del borde y del nombre del evento. */
  acento: string;
  /** Si el borde usa un degradado dorado en vez del color plano. */
  dorado?: boolean;
};

/** Marcos disponibles para el video. Edítalos libremente (white-label). */
export const marcosBrindis: MarcoBrindis[] = [
  { id: "dorado", nombre: "Dorado", acento: "#f4e3a1", dorado: true },
  { id: "rosa", nombre: "Rosa", acento: "#ec4899" },
  { id: "blanco", nombre: "Clásico", acento: "#ffffff" },
];

/**
 * Dibuja el marco del brindis (borde, copas y textos del evento) sobre el
 * cuadro de video ya pintado en el lienzo. No espeja: el texto se lee bien.
 */
export function dibujarMarcoBrindis(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  marco: MarcoBrindis,
) {
  ctx.save();
  ctx.textAlign = "center";

  // Borde
  const bw = Math.round(W * 0.028);
  if (marco.dorado) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#b8862b");
    g.addColorStop(0.5, "#f4e3a1");
    g.addColorStop(1, "#b8862b");
    ctx.strokeStyle = g;
  } else {
    ctx.strokeStyle = marco.acento;
  }
  ctx.lineWidth = bw;
  ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);

  // Copas de brindis (emoji) arriba
  ctx.font = `${Math.round(W * 0.1)}px system-ui, "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("🥂", W / 2, H * 0.135);

  // Degradado inferior para que el texto se lea sobre cualquier fondo
  const banda = H * 0.28;
  const grad = ctx.createLinearGradient(0, H - banda, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - banda, W, banda);

  // "Un brindis para"
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `500 ${Math.round(W * 0.036)}px system-ui, sans-serif`;
  ctx.fillText("Un brindis para", W / 2, H - H * 0.11);

  // Nombre del evento (acento)
  ctx.fillStyle = marco.dorado ? marco.acento : marco.id === "blanco" ? "#ffffff" : marco.acento;
  ctx.font = `700 ${Math.round(W * 0.058)}px system-ui, sans-serif`;
  ctx.fillText(evento.nombre, W / 2, H - H * 0.06);

  // Fecha
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `400 ${Math.round(W * 0.03)}px system-ui, sans-serif`;
  ctx.fillText(evento.fecha, W / 2, H - H * 0.025);

  ctx.restore();
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
