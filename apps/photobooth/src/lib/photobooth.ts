/**
 * Datos y utilidades del PHOTOBOOTH DIGITAL.
 *
 * El invitado activa la cámara (o sube una foto), elige un MARCO del evento y
 * obtiene la foto ya compuesta con el marco para descargarla o compartirla.
 * La composición se hace en un canvas (foto + marco dibujado encima) y se
 * exporta como PNG. No hay servidor: la foto se procesa en el propio teléfono.
 *
 * TODO editable aquí (white-label): datos del evento y los marcos.
 */

export const evento = {
  nombre: "Ana & Rodrigo",
  fecha: "20 · 03 · 2027",
  lugar: "Hacienda Santa Renata",
  hashtag: "AnaYRodrigo2027",
  organizador: { nombre: "Suite para Salones", whatsapp: "526673349236" },
};

/** Lado del lienzo cuadrado de salida (px). */
export const LADO = 1080;

export type TipoMarco = "clasico" | "corazones" | "dorado" | "polaroid";

export type Marco = {
  id: string;
  nombre: string;
  tipo: TipoMarco;
  /** Color de acento del marco (borde, texto). */
  acento: string;
  /** Texto principal (por defecto, el nombre del evento). */
  etiqueta?: string;
  /** Texto secundario (fecha, lugar, hashtag). */
  sub?: string;
};

/** Marcos disponibles. Edítalos, agrégalos o quítalos libremente. */
export const marcos: Marco[] = [
  {
    id: "clasico",
    nombre: "Clásico",
    tipo: "clasico",
    acento: "#ffffff",
    etiqueta: evento.nombre,
    sub: evento.fecha,
  },
  {
    id: "corazones",
    nombre: "Corazones",
    tipo: "corazones",
    acento: "#ec4899",
    etiqueta: evento.nombre,
    sub: `#${evento.hashtag}`,
  },
  {
    id: "dorado",
    nombre: "Dorado",
    tipo: "dorado",
    acento: "#e7c76b",
    etiqueta: evento.nombre,
    sub: evento.fecha,
  },
  {
    id: "polaroid",
    nombre: "Instantánea",
    tipo: "polaroid",
    acento: "#111111",
    etiqueta: evento.nombre,
    sub: evento.fecha,
  },
];

/** Zona donde va la foto dentro del lienzo (el marco "Instantánea" la reduce). */
function areaFoto(marco: Marco): { x: number; y: number; w: number; h: number } {
  if (marco.tipo === "polaroid") {
    const m = Math.round(LADO * 0.055);
    const w = LADO - m * 2;
    return { x: m, y: m, w, h: w }; // foto cuadrada; abajo queda el margen para el texto
  }
  return { x: 0, y: 0, w: LADO, h: LADO };
}

/** Dibuja una imagen recortada para CUBRIR el área destino (sin deformar). */
function dibujarCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  iw: number,
  ih: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const escala = Math.max(dw / iw, dh / ih);
  const w = iw * escala;
  const h = ih * escala;
  const x = dx + (dw - w) / 2;
  const y = dy + (dh - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

function corazon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.bezierCurveTo(cx, cy, cx - s / 2, cy, cx - s / 2, cy + s * 0.3);
  ctx.bezierCurveTo(cx - s / 2, cy + s * 0.6, cx, cy + s * 0.8, cx, cy + s);
  ctx.bezierCurveTo(cx, cy + s * 0.8, cx + s / 2, cy + s * 0.6, cx + s / 2, cy + s * 0.3);
  ctx.bezierCurveTo(cx + s / 2, cy, cx, cy, cx, cy + s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Dibuja el marco (decoración + textos) sobre la foto ya pintada. */
function dibujarMarco(ctx: CanvasRenderingContext2D, marco: Marco) {
  const L = LADO;
  ctx.save();
  ctx.textAlign = "center";

  if (marco.tipo === "clasico") {
    ctx.strokeStyle = marco.acento;
    ctx.lineWidth = 6;
    ctx.strokeRect(34, 34, L - 68, L - 68);
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, L - 96, L - 96);
    // Barra inferior con degradado para el texto.
    const g = ctx.createLinearGradient(0, L - 220, 0, L);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = g;
    ctx.fillRect(0, L - 260, L, 260);
    if (marco.etiqueta) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 60px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(marco.etiqueta, L / 2, L - 120);
    }
    if (marco.sub) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "400 34px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(marco.sub, L / 2, L - 70);
    }
  } else if (marco.tipo === "corazones") {
    ctx.strokeStyle = marco.acento;
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, L - 22, L - 22);
    const s = 70;
    corazon(ctx, 70, 60, s, marco.acento);
    corazon(ctx, L - 70, 60, s, marco.acento);
    corazon(ctx, 70, L - 130, s, marco.acento);
    corazon(ctx, L - 70, L - 130, s, marco.acento);
    // Etiqueta en una banda superior translúcida.
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, L, 150);
    if (marco.etiqueta) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 56px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(marco.etiqueta, L / 2, 80);
    }
    if (marco.sub) {
      ctx.fillStyle = marco.acento;
      ctx.font = "500 34px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(marco.sub, L / 2, 126);
    }
  } else if (marco.tipo === "dorado") {
    const g = ctx.createLinearGradient(0, 0, L, L);
    g.addColorStop(0, "#b8862b");
    g.addColorStop(0.5, "#f4e3a1");
    g.addColorStop(1, "#b8862b");
    ctx.strokeStyle = g;
    ctx.lineWidth = 38;
    ctx.strokeRect(19, 19, L - 38, L - 38);
    // Barra inferior.
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(38, L - 200, L - 76, 162);
    if (marco.etiqueta) {
      ctx.fillStyle = "#f4e3a1";
      ctx.font = "600 58px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(marco.etiqueta, L / 2, L - 116);
    }
    if (marco.sub) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "400 34px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(marco.sub, L / 2, L - 66);
    }
  } else if (marco.tipo === "polaroid") {
    const area = areaFoto(marco);
    // Marco blanco tipo instantánea (la foto ya se dibujó dentro del área).
    ctx.strokeStyle = "#ffffff";
    // Sombra sutil alrededor de la foto.
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(area.x, area.y, area.w, area.h);
    if (marco.etiqueta) {
      ctx.fillStyle = "#1b1b1b";
      ctx.font = "600 52px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(marco.etiqueta, L / 2, area.y + area.h + 78);
    }
    if (marco.sub) {
      ctx.fillStyle = "#8a8a8a";
      ctx.font = "400 32px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(marco.sub, L / 2, area.y + area.h + 122);
    }
  }
  ctx.restore();
}

/**
 * Compone la foto con el marco y devuelve un PNG (dataURL).
 * `fotoBase` es un dataURL de la foto (de la cámara o subida).
 */
export function componer(fotoBase: string, marco: Marco): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = LADO;
      canvas.height = LADO;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear el lienzo."));
        return;
      }
      // Fondo (blanco para la instantánea, negro para el resto).
      ctx.fillStyle = marco.tipo === "polaroid" ? "#ffffff" : "#000000";
      ctx.fillRect(0, 0, LADO, LADO);
      const area = areaFoto(marco);
      dibujarCover(ctx, img, img.naturalWidth, img.naturalHeight, area.x, area.y, area.w, area.h);
      dibujarMarco(ctx, marco);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("No se pudo cargar la foto."));
    img.src = fotoBase;
  });
}

/**
 * Toma el fotograma actual de un <video> y devuelve un dataURL cuadrado
 * (recortado para cubrir), reflejado como en el espejo de la cámara frontal.
 */
export function capturarDeVideo(video: HTMLVideoElement, espejo = true): string {
  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  if (espejo) {
    ctx.translate(LADO, 0);
    ctx.scale(-1, 1);
  }
  const iw = video.videoWidth || LADO;
  const ih = video.videoHeight || LADO;
  dibujarCover(ctx, video, iw, ih, 0, 0, LADO, LADO);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Descarga un dataURL como archivo PNG. */
export function descargar(dataUrl: string, nombre = "photobooth") {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${nombre}.png`;
  a.click();
}

/**
 * Comparte la imagen con la hoja nativa (Web Share API, ideal para WhatsApp).
 * Devuelve true si se pudo compartir; false si el navegador no lo soporta
 * (en ese caso conviene ofrecer la descarga).
 */
export async function compartir(dataUrl: string): Promise<boolean> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "photobooth.png", { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: evento.nombre, text: `#${evento.hashtag}` });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
