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
 * Calidad de grabación. Se fija a propósito para que el video quede liviano y
 * PAREJO entre teléfonos: sin esto, un iPhone graba ~4× más pesado que un
 * Android con la misma duración.
 *
 * Las cuentas, que es lo que importa: 1.8 Mbps de video + 96 kbps de audio ≈
 * 1.9 Mbps, así que el brindis más largo posible ({@link MAX_SEGUNDOS} = 60 s)
 * pesa ~14 MB. El cajón central corta en 25 MB (ver `LIMITE_BYTES` en
 * `src/lib/nube.ts`), o sea que queda margen de sobra en vez de rozar el tope.
 *
 * Un brindis es una cara hablando —poco movimiento—, así que a 720×960 esta
 * tasa se ve bien; subirla solo engorda el archivo y hace esperar al invitado
 * con los datos de su teléfono.
 */
export const VIDEO_BPS = 1_800_000;
export const AUDIO_BPS = 96_000;

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
};

/** Marcos disponibles para el video (los que eligió el cliente). Editables. */
export const marcosBrindis: MarcoBrindis[] = [
  { id: "dorado", nombre: "Dorado clásico" },
  { id: "deco", nombre: "Art déco" },
];

type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string };

/** Degradado dorado reutilizable (claro en el centro, oscuro en los extremos). */
function degradadoOro(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#a9781f");
  g.addColorStop(0.5, "#f6e6a6");
  g.addColorStop(1, "#c99a3c");
  return g;
}

/** Ajusta el tamaño de fuente para que el texto quepa en maxW. Devuelve px. */
function fuenteQueQuepa(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxW: number,
  pxIdeal: number,
  familia: string,
): number {
  let px = pxIdeal;
  ctx.font = `${px}px ${familia}`;
  while (px > 10 && ctx.measureText(texto).width > maxW) {
    px -= 1;
    ctx.font = `${px}px ${familia}`;
  }
  return px;
}

/** Pequeño rombo (ornamento de esquina). */
function rombo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

/** Esquina geométrica estilo art déco. sx/sy = dirección hacia dentro (+1/-1). */
function esquinaDeco(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  L: number,
) {
  const s = L * 0.11;
  const o = L * 0.03;
  ctx.strokeStyle = degradadoOro(ctx, cx, cy, cx + sx * s, cy + sy * s);
  ctx.lineCap = "butt";
  ctx.lineWidth = Math.max(2, Math.round(L * 0.009));
  ctx.beginPath();
  ctx.moveTo(cx, cy + sy * s);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + sx * s, cy);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, Math.round(L * 0.004));
  ctx.beginPath();
  ctx.moveTo(cx + sx * o, cy + sy * (s * 0.62));
  ctx.lineTo(cx + sx * o, cy + sy * o);
  ctx.lineTo(cx + sx * (s * 0.62), cy + sy * o);
  ctx.stroke();
}

/** Año (4 dígitos) que aparezca en la fecha, o cadena vacía. */
function anioDe(fecha: string): string {
  return fecha.match(/\d{4}/)?.[0] ?? "";
}

/** Marco 1 — Dorado clásico: doble filete, rombos y tipografía serif. */
function marcoDoradoClasico(ctx: Ctx2D, W: number, H: number) {
  const m = Math.round(W * 0.05);
  const m2 = m + Math.round(W * 0.022);
  ctx.strokeStyle = degradadoOro(ctx, 0, 0, W, H);
  ctx.lineWidth = Math.max(3, Math.round(W * 0.012));
  ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
  ctx.lineWidth = Math.max(1, Math.round(W * 0.0035));
  ctx.strokeRect(m2, m2, W - 2 * m2, H - 2 * m2);
  const r = W * 0.016;
  rombo(ctx, m2, m2, r, "#f6e6a6");
  rombo(ctx, W - m2, m2, r, "#f6e6a6");
  rombo(ctx, m2, H - m2, r, "#f6e6a6");
  rombo(ctx, W - m2, H - m2, r, "#f6e6a6");

  const bh = H * 0.22;
  const by = H - m2 - bh;
  const grad = ctx.createLinearGradient(0, by, 0, by + bh);
  grad.addColorStop(0, "rgba(8,5,2,0)");
  grad.addColorStop(0.4, "rgba(8,5,2,0.55)");
  grad.addColorStop(1, "rgba(8,5,2,0.8)");
  ctx.fillStyle = grad;
  ctx.fillRect(m2 + 1, by, W - 2 * (m2 + 1), bh);

  const cx = W / 2;
  const maxW = W - 2 * m2 - W * 0.06;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#efd79c";
  ctx.font = `italic ${Math.round(W * 0.042)}px Georgia, "Times New Roman", serif`;
  ctx.fillText("Un brindis para", cx, by + bh * 0.3);
  ctx.fillStyle = "#faefce";
  const pxNom = fuenteQueQuepa(ctx, evento.nombre, maxW, Math.round(W * 0.062), 'Georgia, "Times New Roman", serif');
  ctx.font = `${pxNom}px Georgia, "Times New Roman", serif`;
  ctx.fillText(evento.nombre, cx, by + bh * 0.58);
  ctx.fillStyle = "#cfa869";
  const pxFec = fuenteQueQuepa(ctx, evento.fecha, maxW, Math.round(W * 0.032), 'Georgia, "Times New Roman", serif');
  ctx.font = `${pxFec}px Georgia, "Times New Roman", serif`;
  ctx.fillText(evento.fecha, cx, by + bh * 0.83);
}

/** Marco 3 — Art déco: marco fino, esquinas geométricas y tipografía espaciada. */
function marcoDeco(ctx: Ctx2D, W: number, H: number) {
  const m = Math.round(W * 0.05);
  ctx.strokeStyle = degradadoOro(ctx, 0, 0, W, H);
  ctx.lineWidth = Math.max(2, Math.round(W * 0.006));
  ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
  esquinaDeco(ctx, m, m, 1, 1, W);
  esquinaDeco(ctx, W - m, m, -1, 1, W);
  esquinaDeco(ctx, m, H - m, 1, -1, W);
  esquinaDeco(ctx, W - m, H - m, -1, -1, W);

  const bh = H * 0.2;
  const by = H - m - bh;
  const grad = ctx.createLinearGradient(0, by, 0, by + bh);
  grad.addColorStop(0, "rgba(8,5,2,0)");
  grad.addColorStop(1, "rgba(8,5,2,0.72)");
  ctx.fillStyle = grad;
  ctx.fillRect(m + 1, by, W - 2 * (m + 1), bh);

  const cx = W / 2;
  const maxW = W - 2 * m - W * 0.1;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${Math.round(W * 0.006)}px`;
  ctx.fillStyle = "#faefce";
  const pxNom = fuenteQueQuepa(ctx, evento.nombre, maxW, Math.round(W * 0.05), 'Georgia, "Times New Roman", serif');
  ctx.font = `${pxNom}px Georgia, "Times New Roman", serif`;
  ctx.fillText(evento.nombre, cx, by + bh * 0.42);
  ctx.letterSpacing = "0px";

  const anchoLinea = Math.min(maxW * 0.5, W * 0.22);
  ctx.strokeStyle = degradadoOro(ctx, cx - anchoLinea, 0, cx + anchoLinea, 0);
  ctx.lineWidth = Math.max(1, Math.round(W * 0.0025));
  ctx.beginPath();
  ctx.moveTo(cx - anchoLinea, by + bh * 0.62);
  ctx.lineTo(cx + anchoLinea, by + bh * 0.62);
  ctx.stroke();

  const anio = anioDe(evento.fecha);
  ctx.letterSpacing = `${Math.round(W * 0.008)}px`;
  ctx.fillStyle = "#e6c88f";
  ctx.font = `${Math.round(W * 0.028)}px system-ui, sans-serif`;
  ctx.fillText(`UN BRINDIS${anio ? ` · ${anio}` : ""}`, cx, by + bh * 0.8);
  ctx.letterSpacing = "0px";
}

/**
 * Dibuja el marco elegido sobre el cuadro de video ya pintado en el lienzo.
 * No espeja: el texto se lee bien.
 */
export function dibujarMarcoBrindis(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  marco: MarcoBrindis,
) {
  const c = ctx as Ctx2D;
  c.save();
  c.textAlign = "center";
  c.lineJoin = "miter";
  if (marco.id === "deco") marcoDeco(c, W, H);
  else marcoDoradoClasico(c, W, H);
  c.letterSpacing = "0px";
  c.restore();
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
