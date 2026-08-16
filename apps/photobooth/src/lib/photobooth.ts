/**
 * Datos y utilidades del PHOTOBOOTH DIGITAL.
 *
 * El invitado activa la cámara (o sube una foto), elige un MARCO del evento y
 * obtiene la foto ya compuesta con el marco para descargarla o compartirla.
 * La composición se hace en un canvas (foto + marco dibujado encima) y se
 * exporta como PNG. No hay servidor: la foto se procesa en el propio teléfono.
 *
 * Los TEXTOS de los marcos (nombre, fecha, hashtag) se INYECTAN con
 * `crearMarcos`: el dibujo de cada marco es siempre el mismo, lo único que
 * cambia por evento es qué se escribe encima (ver `src/lib/evento-real.ts`).
 */

/**
 * Los datos de la MUESTRA. Ya no son "el evento" a secas: son el respaldo con
 * el que se pinta el photobooth cuando el enlace no trae evento o cuando el
 * evento es la vitrina ("demo"). Un evento real trae sus textos de la
 * colección `invitacion` (ver `src/lib/evento-real.ts`).
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

export type TipoMarco =
  | "clasico"
  | "corazones"
  | "dorado"
  | "deco"
  | "polaroid"
  | "mariposas"
  | "arco"
  | "monograma"
  | "constelacion"
  | "botanico"
  | "corona"
  | "globos"
  | "brillos"
  | "neon"
  | "confeti"
  | "foquitos"
  | "editorial"
  | "galeria"
  | "cine"
  | "filigrana";

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
  /** Cintillo menudo de arriba (hoy solo lo usa el editorial). */
  kicker?: string;
};

/** Los textos que cada evento escribe sobre sus marcos. */
export type TextosMarcos = { nombre: string; fecha: string; hashtag: string };

/**
 * Los marcos disponibles, con los textos del evento puestos en su sitio.
 *
 * Es una función y no una lista fija porque los textos cambian por evento: el
 * DIBUJO de cada marco es exactamente el aprobado de siempre; lo único que
 * entra de fuera es qué nombre, qué fecha y qué hashtag se escriben encima
 * (el marco de corazones es el único que lleva el hashtag en vez de la fecha).
 */
export function crearMarcos(t: TextosMarcos): Marco[] {
  return [
    {
      id: "clasico",
      nombre: "Clásico",
      tipo: "clasico",
      acento: "#ffffff",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "corazones",
      nombre: "Corazones",
      tipo: "corazones",
      acento: "#ec4899",
      etiqueta: t.nombre,
      sub: `#${t.hashtag}`,
    },
    {
      id: "dorado",
      nombre: "Dorado clásico",
      tipo: "dorado",
      acento: "#e7c76b",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "deco",
      nombre: "Art déco",
      tipo: "deco",
      acento: "#f4e3a1",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "polaroid",
      nombre: "Instantánea",
      tipo: "polaroid",
      acento: "#111111",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "mariposas",
      nombre: "Mariposas",
      tipo: "mariposas",
      acento: "#e9a7b0",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "arco",
      nombre: "Arco floral",
      tipo: "arco",
      acento: "#d9b56a",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "monograma",
      nombre: "Monograma",
      tipo: "monograma",
      acento: "#e7c76b",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "constelacion",
      nombre: "Constelación",
      tipo: "constelacion",
      acento: "#e6cd92",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "botanico",
      nombre: "Botánico",
      tipo: "botanico",
      acento: "#d9b56a",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "corona",
      nombre: "Corona de XV",
      tipo: "corona",
      acento: "#f0cf8a",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "globos",
      nombre: "Globos",
      tipo: "globos",
      acento: "#f2a8c0",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "brillos",
      nombre: "Brillos",
      tipo: "brillos",
      acento: "#f7d9a0",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "neon",
      nombre: "Neón",
      tipo: "neon",
      acento: "#ff63c8",
      etiqueta: t.nombre,
      sub: `#${t.hashtag}`,
    },
    {
      id: "confeti",
      nombre: "Confeti",
      tipo: "confeti",
      acento: "#ff6b9d",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "foquitos",
      nombre: "Foquitos",
      tipo: "foquitos",
      acento: "#ffd79a",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "editorial",
      nombre: "Editorial",
      tipo: "editorial",
      acento: "#ffffff",
      etiqueta: t.nombre,
      sub: t.fecha,
      kicker: `#${t.hashtag}`,
    },
    {
      id: "galeria",
      nombre: "Galería",
      tipo: "galeria",
      acento: "#4a4238",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "cine",
      nombre: "Cine",
      tipo: "cine",
      acento: "#e8e4dc",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
    {
      id: "filigrana",
      nombre: "Filigrana",
      tipo: "filigrana",
      acento: "#dcc188",
      etiqueta: t.nombre,
      sub: t.fecha,
    },
  ];
}

/** Los marcos con los textos de la muestra: lo que siempre enseñó la demo. */
export const marcos: Marco[] = crearMarcos({
  nombre: evento.nombre,
  fecha: evento.fecha,
  hashtag: evento.hashtag,
});

/** Zona donde va la foto dentro del lienzo (el marco "Instantánea" la reduce). */
function areaFoto(marco: Marco): { x: number; y: number; w: number; h: number } {
  if (marco.tipo === "polaroid") {
    const m = Math.round(LADO * 0.055);
    const w = LADO - m * 2;
    return { x: m, y: m, w, h: w }; // foto cuadrada; abajo queda el margen para el texto
  }
  if (marco.tipo === "galeria") {
    // Ventana del passe-partout: la foto va DENTRO, con más margen abajo
    // (así se montan los cuadros: el pie siempre pesa más que la cabeza).
    const m = Math.round(LADO * 0.09);
    return { x: m, y: m, w: LADO - m * 2, h: Math.round(LADO * 0.66) };
  }
  return { x: 0, y: 0, w: LADO, h: LADO };
}

/** Color del lienzo por debajo de la foto (se ve donde la foto no llega). */
function fondoDelLienzo(marco: Marco): string {
  if (marco.tipo === "polaroid") return "#ffffff";
  if (marco.tipo === "galeria") return "#f4f0e8"; // cartón marfil del marco
  return "#000000";
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

type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string };

/** Lo que acepta `fillStyle`/`strokeStyle`: un color o un degradado. */
type Pintura = string | CanvasGradient;

/** Tipografías del lienzo. Solo fuentes del propio teléfono (no se descargan). */
const SERIF = 'Georgia, "Times New Roman", serif';
const CURSIVA = '"Segoe Script", "Snell Roundhand", "Brush Script MT", Georgia, cursive';

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

/**
 * Achica la letra hasta que el texto quepa en maxW. Deja `ctx.font` listo y
 * devuelve esa fuente (por si hay que volver a ponerla).
 */
function fuenteQueQuepa(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxW: number,
  pxIdeal: number,
  familia: string,
  estilo = "",
): string {
  const pre = estilo ? `${estilo} ` : "";
  let px = pxIdeal;
  ctx.font = `${pre}${px}px ${familia}`;
  while (px > 12 && ctx.measureText(texto).width > maxW) {
    px -= 1;
    ctx.font = `${pre}${px}px ${familia}`;
  }
  return ctx.font;
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
  const s = L * 0.1;
  const o = L * 0.028;
  ctx.strokeStyle = degradadoOro(ctx, cx, cy, cx + sx * s, cy + sy * s);
  ctx.lineCap = "butt";
  ctx.lineWidth = Math.max(2, Math.round(L * 0.008));
  ctx.beginPath();
  ctx.moveTo(cx, cy + sy * s);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + sx * s, cy);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, Math.round(L * 0.0038));
  ctx.beginPath();
  ctx.moveTo(cx + sx * o, cy + sy * (s * 0.62));
  ctx.lineTo(cx + sx * o, cy + sy * o);
  ctx.lineTo(cx + sx * (s * 0.62), cy + sy * o);
  ctx.stroke();
}

/* ------------------------------------------------------------------ *
 * Marcos nuevos (mariposas, arco, monograma, constelación, botánico).
 *
 * Regla de estos cinco: NO tiñen la foto. El diseño original venía con un
 * fondo oscuro encima de toda la imagen; aquí se quitó y solo queda la
 * decoración, más un velo muy suave en la franja de abajo para que los
 * nombres se lean sobre cualquier foto (clara u oscura).
 * ------------------------------------------------------------------ */

/** Degradado dorado claro (crema → oro → crema), el de los marcos nuevos. */
function oroClaro(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#f8ecc0");
  g.addColorStop(0.5, "#d8bd76");
  g.addColorStop(1, "#f8ecc0");
  return g;
}

/** Rectángulo de esquinas redondeadas (solo traza el camino; no pinta). */
function rectRedondo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Mariposa: dos alas grandes arriba, dos chicas abajo, cuerpo fino y antenas.
 * `s` es el ancho total; las alas van inclinadas para que no se vea un trébol.
 */
function mariposa(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  color: string,
  cuerpo: string,
  giro = 0,
  alfa = 1,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(giro);
  ctx.globalAlpha = alfa;
  ctx.fillStyle = color;
  for (const lado of [-1, 1]) {
    const X = (n: number) => lado * n * s;
    const Y = (n: number) => n * s;
    // Ala de arriba: sube desde el cuerpo, se abre y baja por fuera.
    ctx.beginPath();
    ctx.moveTo(X(0), Y(-0.06));
    ctx.bezierCurveTo(X(0.06), Y(-0.42), X(0.16), Y(-0.48), X(0.31), Y(-0.44));
    ctx.bezierCurveTo(X(0.45), Y(-0.4), X(0.5), Y(-0.28), X(0.45), Y(-0.15));
    ctx.bezierCurveTo(X(0.4), Y(-0.03), X(0.18), Y(0.04), X(0), Y(0.01));
    ctx.closePath();
    ctx.fill();
    // Ala de abajo: más chica y pegada al cuerpo.
    ctx.globalAlpha = alfa * 0.88;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0.01));
    ctx.bezierCurveTo(X(0.17), Y(0.05), X(0.32), Y(0.13), X(0.32), Y(0.25));
    ctx.bezierCurveTo(X(0.32), Y(0.35), X(0.22), Y(0.4), X(0.14), Y(0.35));
    ctx.bezierCurveTo(X(0.07), Y(0.3), X(0.03), Y(0.2), X(0), Y(0.06));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alfa;
  }
  ctx.fillStyle = cuerpo;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.04, s * 0.028, s * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = cuerpo;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, s * 0.024);
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.22);
  ctx.quadraticCurveTo(-s * 0.14, -s * 0.42, -s * 0.26, -s * 0.4);
  ctx.moveTo(0, -s * 0.22);
  ctx.quadraticCurveTo(s * 0.14, -s * 0.42, s * 0.26, -s * 0.4);
  ctx.stroke();
  ctx.restore();
}

/** Florecita de cinco pétalos con el centro claro. */
function flor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  centro = "#f6d9a0",
) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.cos(a) * r * 0.6,
      cy + Math.sin(a) * r * 0.6,
      r * 0.48,
      r * 0.4,
      a,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = centro;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Hoja simple (elipse inclinada). */
function hoja(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  largo: number,
  ancho: number,
  giro: number,
  color: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(giro);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(largo * 0.5, 0, largo * 0.5, ancho, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Destello de cuatro puntas (el mismo trazo del diseño original, a escala). */
function chispa(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const k = r / 22;
  const X = (n: number) => cx + n * k;
  const Y = (n: number) => cy + n * k;
  ctx.beginPath();
  ctx.moveTo(X(0), Y(-22));
  ctx.bezierCurveTo(X(2.6), Y(-5), X(5), Y(-2.6), X(22), Y(0));
  ctx.bezierCurveTo(X(5), Y(2.6), X(2.6), Y(5), X(0), Y(22));
  ctx.bezierCurveTo(X(-2.6), Y(5), X(-5), Y(2.6), X(-22), Y(0));
  ctx.bezierCurveTo(X(-5), Y(-2.6), X(-2.6), Y(-5), X(0), Y(-22));
  ctx.closePath();
  ctx.fill();
}

/** Luna en cuarto creciente (mirando a la izquierda). */
function luna(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const d = r * 0.42; // cuánto "muerde" la sombra
  const r2 = Math.hypot(d, r);
  const a = Math.atan2(r, -d);
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, true);
  ctx.arc(cx + d, cy, r2, a, -a, false);
  ctx.closePath();
  ctx.fill();
}

/** Rama de olivo: tallo curvo, hojas a los lados y algunas aceitunas. */
function ramaOlivo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largo: number,
  giro: number,
  verde: string,
  oliva: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  const cx = largo * 0.5;
  const cy = -largo * 0.16;
  const punto = (t: number) => ({
    x: 2 * (1 - t) * t * cx + t * t * largo,
    y: 2 * (1 - t) * t * cy,
  });
  ctx.strokeStyle = verde;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, largo * 0.011);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(cx, cy, largo, 0);
  ctx.stroke();
  const h = largo * 0.13;
  for (let i = 0; i < 6; i++) {
    const t = 0.14 + i * 0.15;
    const p = punto(t);
    const q = punto(Math.min(1, t + 0.02));
    const dir = Math.atan2(q.y - p.y, q.x - p.x);
    const esc = 1 - i * 0.07;
    hoja(ctx, p.x, p.y, h * esc, h * 0.3 * esc, dir - 0.95, verde);
    hoja(ctx, p.x, p.y, h * esc, h * 0.3 * esc, dir + 0.95, verde);
  }
  const fin = punto(1);
  hoja(ctx, fin.x, fin.y, h * 0.8, h * 0.26, 0, verde);
  ctx.fillStyle = oliva;
  for (const t of [0.3, 0.55, 0.78]) {
    const p = punto(t);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + h * 0.12, h * 0.16, h * 0.21, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ---- Elegantes ---- */

/**
 * Voluta: el rizo de la filigrana. Sale del punto, se abre en C y se enrosca
 * hacia dentro, con dos hojitas colgando. `esc` es su tamaño; `sx`/`sy` la
 * mandan hacia el lado que toque (para las cuatro esquinas).
 */
function voluta(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  esc: number,
  sx: number,
  sy: number,
  color: Pintura,
  grosor: number,
  /** Gira el rizo 90°: el mismo trazo, pero corriendo por el borde vertical. */
  vertical = false,
) {
  // (u, v): u avanza a lo largo del borde, v se mete hacia dentro del cuadro.
  const px = (u: number, v: number) => x + sx * (vertical ? v : u) * esc;
  const py = (u: number, v: number) => y + sy * (vertical ? u : v) * esc;
  const curva = (a: number[], b: number[], c: number[], d: number[]) => {
    ctx.moveTo(px(a[0]!, a[1]!), py(a[0]!, a[1]!));
    ctx.bezierCurveTo(
      px(b[0]!, b[1]!), py(b[0]!, b[1]!),
      px(c[0]!, c[1]!), py(c[0]!, c[1]!),
      px(d[0]!, d[1]!), py(d[0]!, d[1]!),
    );
  };
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = grosor;
  ctx.beginPath();
  // Curva grande, del borde hacia dentro.
  curva([0, 0], [0.52, 0.02], [0.86, 0.2], [0.9, 0.52]);
  ctx.stroke();
  ctx.beginPath();
  // El caracol en que termina.
  curva([0.9, 0.52], [0.93, 0.78], [0.72, 0.9], [0.6, 0.76]);
  curva([0.6, 0.76], [0.5, 0.64], [0.62, 0.5], [0.73, 0.56]);
  ctx.stroke();
  ctx.beginPath();
  // Hoja que se descuelga.
  curva([0.36, 0.06], [0.42, 0.3], [0.3, 0.42], [0.16, 0.34]);
  ctx.stroke();
}

/* ---- Fiesta: XV años, cumpleaños y noche ---- */

/** Corona de tres picos, con perlas en las puntas y gemas en la banda. */
function corona(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, oro: Pintura, gema: string) {
  const h = w * 0.62;
  ctx.fillStyle = oro;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, cy);
  ctx.lineTo(cx - w * 0.34, cy - h * 0.55);
  ctx.lineTo(cx - w * 0.17, cy - h * 0.14);
  ctx.lineTo(cx, cy - h * 0.9);
  ctx.lineTo(cx + w * 0.17, cy - h * 0.14);
  ctx.lineTo(cx + w * 0.34, cy - h * 0.55);
  ctx.lineTo(cx + w * 0.5, cy);
  ctx.closePath();
  ctx.fill();
  rectRedondo(ctx, cx - w * 0.54, cy, w * 1.08, h * 0.24, h * 0.12);
  ctx.fill();
  for (const [px, py] of [
    [-0.34, -0.55],
    [0, -0.9],
    [0.34, -0.55],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx + w * px, cy + h * py - h * 0.07, w * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const px of [-0.3, 0, 0.3]) rombo(ctx, cx + w * px, cy + h * 0.12, w * 0.032, gema);
}

/** Globo con su nudo y el cordel rizado. `r` es el radio horizontal. */
function globo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  giro = 0,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(giro);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 0.13, r * 1.14);
  ctx.lineTo(r * 0.13, r * 1.14);
  ctx.lineTo(0, r * 1.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.44, r * 0.18, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, r * 1.38);
  ctx.bezierCurveTo(r * 0.55, r * 1.9, -r * 0.5, r * 2.4, r * 0.25, r * 3);
  ctx.stroke();
  ctx.restore();
}

/** Guirnalda de foquitos: el cable cuelga en curva y los focos van colgados. */
function guirnalda(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  caida: number,
  cuantos: number,
  r: number,
) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + caida;
  ctx.strokeStyle = "rgba(40,34,28,0.75)";
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.stroke();
  for (let i = 1; i <= cuantos; i++) {
    const t = i / (cuantos + 1);
    const u = 1 - t;
    const px = u * u * x0 + 2 * u * t * mx + t * t * x1;
    const py = u * u * y0 + 2 * u * t * my + t * t * y1;
    ctx.fillStyle = "rgba(40,34,28,0.8)";
    ctx.fillRect(px - r * 0.3, py, r * 0.6, r * 0.4);
    ctx.save();
    ctx.shadowColor = "rgba(255,196,110,0.95)";
    ctx.shadowBlur = r * 2.6;
    ctx.fillStyle = "#ffd79a";
    ctx.beginPath();
    ctx.ellipse(px, py + r * 1.15, r * 0.68, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Traza con resplandor de NEÓN: un halo ancho, uno medio y el núcleo claro
 * encima, que es lo que hace que parezca un tubo encendido y no una raya.
 */
function neon(ctx: CanvasRenderingContext2D, trazar: () => void, color: string, ancho: number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  for (const [w, halo, alfa] of [
    [ancho * 2.4, ancho * 3.4, 0.3],
    [ancho * 1.4, ancho * 1.8, 0.65],
  ] as const) {
    ctx.lineWidth = w;
    ctx.shadowBlur = halo;
    ctx.globalAlpha = alfa;
    trazar();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#fff8fd";
  ctx.lineWidth = ancho * 0.45;
  ctx.shadowBlur = ancho * 1.2;
  trazar();
  ctx.stroke();
  ctx.restore();
}

/** Papelito de confeti (rectángulo inclinado) o serpentina (cinta ondulada). */
function papelito(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  giro: number,
  color: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(giro);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

/** Serpentina: una cinta que ondula hacia abajo. */
function serpentina(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largo: number,
  onda: number,
  grosor: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  const paso = largo / 4;
  for (let i = 0; i < 4; i++) {
    const lado = i % 2 ? -onda : onda;
    ctx.quadraticCurveTo(x + lado, y + paso * (i + 0.5), x, y + paso * (i + 1));
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Texto en VERSALITAS: la inicial de cada palabra grande y el resto en
 * mayúsculas más chicas. Se dibuja letra por letra porque `fontVariantCaps`
 * no lo aplica en el lienzo de todos los teléfonos.
 */
function textoVersalitas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  cx: number,
  cy: number,
  maxW: number,
  pxIdeal: number,
  familia: string,
) {
  const piezas = texto
    .split(/(\s+)/)
    .filter(Boolean)
    .flatMap((p) =>
      /^\s+$/.test(p)
        ? [{ t: p, grande: true }]
        : [
            { t: p.charAt(0).toUpperCase(), grande: true },
            ...(p.length > 1 ? [{ t: p.slice(1).toUpperCase(), grande: false }] : []),
          ],
    );
  const fuente = (px: number, grande: boolean) =>
    `${grande ? px : Math.round(px * 0.76)}px ${familia}`;
  const ancho = (px: number) =>
    piezas.reduce((w, p) => {
      ctx.font = fuente(px, p.grande);
      return w + ctx.measureText(p.t).width;
    }, 0);
  let px = pxIdeal;
  while (px > 12 && ancho(px) > maxW) px -= 2;
  const alineado = ctx.textAlign;
  ctx.textAlign = "left";
  let x = cx - ancho(px) / 2;
  for (const p of piezas) {
    ctx.font = fuente(px, p.grande);
    ctx.fillText(p.t, x, cy);
    x += ctx.measureText(p.t).width;
  }
  ctx.textAlign = alineado;
}

/** Iniciales del evento: "Ana & Rodrigo" → ["A", "R"]. */
function iniciales(nombre: string): string[] {
  return nombre
    .split(/\s+(?:&|y|Y|\+)\s+/)
    .map((p) => p.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2);
}

/**
 * Pie de los marcos nuevos: velo suave abajo, nombres, separador con adorno y
 * fecha espaciada. Todo con las mismas alturas, para que los cinco marcos se
 * vean de la misma familia.
 */
function pieDeMarco(
  ctx: CanvasRenderingContext2D,
  marco: Marco,
  o: {
    margen: number;
    familia: string;
    estilo?: string;
    tamNombre: number;
    colorNombre: Pintura;
    versalitas?: boolean;
    /** Separación entre letras del nombre (fracción del lado). */
    espacioNombre?: number;
    tamFecha: number;
    colorFecha: Pintura;
    familiaFecha?: string;
    linea?: Pintura;
    adorno?: (cx: number, cy: number) => void;
    velo?: number;
    /** Halo de color detrás de las letras (el neón). */
    resplandor?: string;
  },
) {
  const c = ctx as Ctx2D;
  const L = LADO;
  const alto = Math.round(L * 0.34);
  const opacidad = (o.velo ?? 0.6) * 0.72;
  const g = ctx.createLinearGradient(0, L - alto, 0, L);
  g.addColorStop(0, "rgba(6,10,20,0)");
  g.addColorStop(0.55, `rgba(6,10,20,${opacidad * 0.4})`);
  g.addColorStop(1, `rgba(6,10,20,${opacidad})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, L - alto, L, alto);

  const maxW = L - 2 * o.margen - L * 0.07;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (o.resplandor) {
    ctx.shadowColor = o.resplandor;
    ctx.shadowBlur = L * 0.03;
  } else {
    // Halo oscuro pegado a las letras. Es lo que las hace legibles sobre una
    // foto clara, y permite que el velo de abajo sea flojo: si la legibilidad
    // dependiera del velo, habría que oscurecer media foto.
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = L * 0.015;
  }

  if (marco.etiqueta) {
    ctx.fillStyle = o.colorNombre;
    if (o.versalitas) {
      c.letterSpacing = `${Math.round(L * 0.005)}px`;
      textoVersalitas(
        ctx,
        marco.etiqueta,
        L / 2,
        L * 0.775,
        maxW,
        Math.round(L * o.tamNombre),
        o.familia,
      );
      c.letterSpacing = "0px";
    } else {
      if (o.espacioNombre) c.letterSpacing = `${Math.round(L * o.espacioNombre)}px`;
      fuenteQueQuepa(ctx, marco.etiqueta, maxW, Math.round(L * o.tamNombre), o.familia, o.estilo);
      ctx.fillText(marco.etiqueta, L / 2, L * 0.775);
      c.letterSpacing = "0px";
    }
  }
  if (o.linea) {
    const y = L * 0.848;
    const semi = Math.min(maxW * 0.34, L * 0.135);
    const hueco = L * 0.03;
    ctx.strokeStyle = o.linea;
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0015));
    ctx.beginPath();
    ctx.moveTo(L / 2 - semi, y);
    ctx.lineTo(L / 2 - hueco, y);
    ctx.moveTo(L / 2 + hueco, y);
    ctx.lineTo(L / 2 + semi, y);
    ctx.stroke();
    o.adorno?.(L / 2, y);
  }
  if (marco.sub) {
    c.letterSpacing = `${Math.round(L * 0.011)}px`;
    ctx.fillStyle = o.colorFecha;
    fuenteQueQuepa(ctx, marco.sub, maxW, Math.round(L * o.tamFecha), o.familiaFecha ?? o.familia);
    ctx.fillText(marco.sub, L / 2, L * 0.897);
    c.letterSpacing = "0px";
  }
  ctx.shadowBlur = 0;
  ctx.textBaseline = "alphabetic";
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
    // Dorado clásico: doble filete dorado, rombos y tipografía serif.
    const m = Math.round(L * 0.045);
    const m2 = m + Math.round(L * 0.02);
    ctx.strokeStyle = degradadoOro(ctx, 0, 0, L, L);
    ctx.lineWidth = Math.max(3, Math.round(L * 0.012));
    ctx.strokeRect(m, m, L - 2 * m, L - 2 * m);
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0035));
    ctx.strokeRect(m2, m2, L - 2 * m2, L - 2 * m2);
    const r = L * 0.015;
    rombo(ctx, m2, m2, r, "#f6e6a6");
    rombo(ctx, L - m2, m2, r, "#f6e6a6");
    rombo(ctx, m2, L - m2, r, "#f6e6a6");
    rombo(ctx, L - m2, L - m2, r, "#f6e6a6");
    const bh = L * 0.2;
    const by = L - m2 - bh;
    const grad = ctx.createLinearGradient(0, by, 0, by + bh);
    grad.addColorStop(0, "rgba(8,5,2,0)");
    grad.addColorStop(0.4, "rgba(8,5,2,0.55)");
    grad.addColorStop(1, "rgba(8,5,2,0.8)");
    ctx.fillStyle = grad;
    ctx.fillRect(m2 + 1, by, L - 2 * (m2 + 1), bh);
    const maxW = L - 2 * m2 - L * 0.06;
    ctx.textBaseline = "middle";
    if (marco.etiqueta) {
      ctx.fillStyle = "#faefce";
      fuenteQueQuepa(ctx, marco.etiqueta, maxW, Math.round(L * 0.06), SERIF);
      ctx.fillText(marco.etiqueta, L / 2, by + bh * 0.42);
    }
    if (marco.sub) {
      ctx.fillStyle = "#cfa869";
      fuenteQueQuepa(ctx, marco.sub, maxW, Math.round(L * 0.034), SERIF);
      ctx.fillText(marco.sub, L / 2, by + bh * 0.74);
    }
    ctx.textBaseline = "alphabetic";
  } else if (marco.tipo === "deco") {
    // Art déco: marco fino, esquinas geométricas y tipografía espaciada.
    const c = ctx as Ctx2D;
    const m = Math.round(L * 0.045);
    ctx.strokeStyle = degradadoOro(ctx, 0, 0, L, L);
    ctx.lineWidth = Math.max(2, Math.round(L * 0.006));
    ctx.strokeRect(m, m, L - 2 * m, L - 2 * m);
    esquinaDeco(ctx, m, m, 1, 1, L);
    esquinaDeco(ctx, L - m, m, -1, 1, L);
    esquinaDeco(ctx, m, L - m, 1, -1, L);
    esquinaDeco(ctx, L - m, L - m, -1, -1, L);
    const bh = L * 0.19;
    const by = L - m - bh;
    const grad = ctx.createLinearGradient(0, by, 0, by + bh);
    grad.addColorStop(0, "rgba(8,5,2,0)");
    grad.addColorStop(1, "rgba(8,5,2,0.72)");
    ctx.fillStyle = grad;
    ctx.fillRect(m + 1, by, L - 2 * (m + 1), bh);
    const maxW = L - 2 * m - L * 0.1;
    ctx.textBaseline = "middle";
    if (marco.etiqueta) {
      c.letterSpacing = `${Math.round(L * 0.006)}px`;
      ctx.fillStyle = "#faefce";
      fuenteQueQuepa(ctx, marco.etiqueta, maxW, Math.round(L * 0.05), SERIF);
      ctx.fillText(marco.etiqueta, L / 2, by + bh * 0.4);
      c.letterSpacing = "0px";
    }
    const anchoLinea = Math.min(maxW * 0.5, L * 0.2);
    ctx.strokeStyle = degradadoOro(ctx, L / 2 - anchoLinea, 0, L / 2 + anchoLinea, 0);
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0025));
    ctx.beginPath();
    ctx.moveTo(L / 2 - anchoLinea, by + bh * 0.6);
    ctx.lineTo(L / 2 + anchoLinea, by + bh * 0.6);
    ctx.stroke();
    if (marco.sub) {
      c.letterSpacing = `${Math.round(L * 0.006)}px`;
      ctx.fillStyle = "#e6c88f";
      fuenteQueQuepa(ctx, marco.sub, maxW, Math.round(L * 0.03), "system-ui, sans-serif");
      ctx.fillText(marco.sub, L / 2, by + bh * 0.82);
      c.letterSpacing = "0px";
    }
    ctx.textBaseline = "alphabetic";
  } else if (marco.tipo === "mariposas") {
    // Doble filete oro rosa de esquinas suaves y un vuelo de mariposas.
    const m = Math.round(L * 0.045);
    const m2 = m + Math.round(L * 0.015);
    const rosa = ctx.createLinearGradient(0, 0, L, L);
    rosa.addColorStop(0, "#f7dcd6");
    rosa.addColorStop(0.5, "#e2a3ad");
    rosa.addColorStop(1, "#f7dcd6");
    ctx.strokeStyle = rosa;
    ctx.lineWidth = Math.max(2, Math.round(L * 0.0035));
    rectRedondo(ctx, m, m, L - 2 * m, L - 2 * m, L * 0.035);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0018));
    rectRedondo(ctx, m2, m2, L - 2 * m2, L - 2 * m2, L * 0.028);
    ctx.stroke();
    // [x, y, tamaño, giro, opacidad]: bajan por la derecha y rozan la esquina izquierda.
    const vuelo: [number, number, number, number, number][] = [
      [0.895, 0.125, 0.105, -0.28, 0.95],
      [0.815, 0.2, 0.075, 0.18, 0.85],
      [0.915, 0.295, 0.055, -0.32, 0.7],
      [0.86, 0.375, 0.04, 0.22, 0.55],
      [0.735, 0.105, 0.042, -0.16, 0.5],
      [0.075, 0.795, 0.075, 0.26, 0.7],
      [0.165, 0.9, 0.05, -0.22, 0.5],
      [0.06, 0.7, 0.032, 0.12, 0.4],
    ];
    vuelo.forEach(([px, py, ps, giro, alfa], i) => {
      mariposa(ctx, L * px, L * py, L * ps, i % 2 ? "#f6cfd4" : "#eaa8b2", "#c98a95", giro, alfa);
    });
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: CURSIVA,
      estilo: "italic",
      tamNombre: 0.095,
      colorNombre: "#fdf3ef",
      tamFecha: 0.026,
      colorFecha: "#f6e2df",
      familiaFecha: SERIF,
      linea: "#eab9c0",
      adorno: (cx, cy) => mariposa(ctx, cx, cy, L * 0.038, "#eab9c0", "#d3949e", 0, 0.95),
      velo: 0.55,
    });
  } else if (marco.tipo === "arco") {
    // Arco de novia: dos filetes dorados con flores en la cima y en las bases.
    const m = Math.round(L * 0.075);
    const yBase = L - Math.round(L * 0.065);
    const trazarArco = (off: number) => {
      const x0 = m + off;
      const x1 = L - m - off;
      const rr = (x1 - x0) / 2;
      const yc = m + off + rr;
      ctx.beginPath();
      ctx.moveTo(x0, yBase - off);
      ctx.lineTo(x0, yc);
      ctx.arc(x0 + rr, yc, rr, Math.PI, 0, false);
      ctx.lineTo(x1, yBase - off);
      ctx.closePath();
    };
    ctx.strokeStyle = oroClaro(ctx, 0, 0, L, 0);
    ctx.lineWidth = Math.max(2, Math.round(L * 0.003));
    trazarArco(0);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0015));
    trazarArco(Math.round(L * 0.014));
    ctx.stroke();
    const coral = "#df6d55";
    const salvia = "#93a97e";
    /** Flores + hojas; `espejo` (+1/-1) manda el ramillete hacia dentro. */
    const ramillete = (cx: number, cy: number, esc: number, espejo: number) => {
      hoja(ctx, cx, cy, L * 0.07 * esc, L * 0.018 * esc, espejo > 0 ? -0.45 : Math.PI + 0.45, salvia);
      hoja(ctx, cx, cy, L * 0.055 * esc, L * 0.015 * esc, espejo > 0 ? 0.6 : Math.PI - 0.6, salvia);
      flor(ctx, cx, cy, L * 0.022 * esc, coral);
      flor(ctx, cx + espejo * L * 0.032 * esc, cy - L * 0.012 * esc, L * 0.016 * esc, coral);
      flor(ctx, cx + espejo * L * 0.016 * esc, cy + L * 0.028 * esc, L * 0.013 * esc, coral);
    };
    ramillete(L / 2 - L * 0.052, m + L * 0.006, 0.7, -1);
    ramillete(L / 2 + L * 0.052, m + L * 0.006, 0.7, 1);
    flor(ctx, L / 2, m, L * 0.019, coral);
    // En las bases, hacia dentro: si van justo en la esquina, se cortan.
    ramillete(m + L * 0.028, yBase - L * 0.022, 1, 1);
    ramillete(L - m - L * 0.028, yBase - L * 0.022, 1, -1);
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: SERIF,
      tamNombre: 0.082,
      colorNombre: "#fdf6ee",
      tamFecha: 0.026,
      colorFecha: "#f2e5cc",
      linea: "#d9b56a",
      adorno: (cx, cy) => rombo(ctx, cx, cy, L * 0.009, "#d9b56a"),
      velo: 0.58,
    });
  } else if (marco.tipo === "monograma") {
    // Escuadras en las esquinas y un medallón con las iniciales.
    const i = Math.round(L * 0.075);
    const brazo = Math.round(L * 0.055);
    ctx.strokeStyle = oroClaro(ctx, 0, 0, L, L);
    ctx.lineCap = "butt";
    ctx.lineWidth = Math.max(2, Math.round(L * 0.0035));
    for (const [sx, sy] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ] as const) {
      const x = sx > 0 ? i : L - i;
      const y = sy > 0 ? i : L - i;
      ctx.beginPath();
      ctx.moveTo(x, y + sy * brazo);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * brazo, y);
      ctx.stroke();
    }
    const cy = L * 0.625;
    const r = L * 0.072;
    ctx.lineWidth = Math.max(2, Math.round(L * 0.003));
    ctx.beginPath();
    ctx.arc(L / 2, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0015));
    ctx.beginPath();
    ctx.arc(L / 2, cy, r * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    const ini = iniciales(marco.etiqueta ?? "");
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fdf6e6";
    ctx.font = `${Math.round(L * 0.055)}px ${SERIF}`;
    if (ini.length > 1) {
      ctx.fillText(ini[0]!, L / 2 - r * 0.42, cy);
      ctx.fillText(ini[1]!, L / 2 + r * 0.42, cy);
      rombo(ctx, L / 2, cy, L * 0.011, "#e7c76b");
    } else if (ini.length === 1) {
      ctx.fillText(ini[0]!, L / 2, cy);
    }
    ctx.textBaseline = "alphabetic";
    pieDeMarco(ctx, marco, {
      margen: i,
      familia: SERIF,
      tamNombre: 0.078,
      colorNombre: "#fdf6ea",
      versalitas: true,
      tamFecha: 0.025,
      colorFecha: "#e7c76b",
      velo: 0.6,
    });
  } else if (marco.tipo === "constelacion") {
    // Estrellas, constelaciones y luna. Del diseño original se quitó el fondo
    // oscuro que cubría toda la foto: aquí solo va la decoración.
    const s = (n: number) => (n * L) / 1000;
    const oro = oroClaro(ctx, 0, 0, L, 0);
    const estrellas: [number, number, number, number][] = [
      [120, 130, 2.6, 0.9], [196, 92, 1.7, 0.7], [268, 168, 2.2, 0.85], [92, 236, 1.5, 0.6],
      [340, 108, 1.9, 0.7], [412, 190, 1.4, 0.55], [176, 320, 2.1, 0.7], [96, 420, 1.5, 0.5],
      [880, 420, 2, 0.7], [812, 330, 1.5, 0.55], [930, 560, 1.7, 0.6], [860, 660, 2.3, 0.7],
      [760, 528, 1.4, 0.5], [124, 620, 1.9, 0.6], [64, 760, 1.5, 0.45], [216, 700, 1.4, 0.45],
      [936, 240, 1.6, 0.55], [700, 132, 1.5, 0.5], [612, 196, 1.3, 0.45], [508, 120, 1.8, 0.6],
    ];
    ctx.fillStyle = "#f6e7b4";
    for (const [x, y, radio, op] of estrellas) {
      ctx.globalAlpha = op;
      ctx.beginPath();
      ctx.arc(s(x), s(y), Math.max(1.4, s(radio) * 1.35), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = oro;
    ctx.lineWidth = Math.max(1, s(1));
    for (const puntos of [
      [120, 130, 196, 92, 268, 168, 340, 108, 412, 190],
      [268, 168, 176, 320],
      [880, 420, 812, 330],
      [880, 420, 930, 560, 860, 660],
    ]) {
      ctx.beginPath();
      ctx.moveTo(s(puntos[0]!), s(puntos[1]!));
      for (let p = 2; p < puntos.length; p += 2) ctx.lineTo(s(puntos[p]!), s(puntos[p + 1]!));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = oro;
    for (const [x, y, esc, op] of [
      [208, 214, 1, 0.95], [846, 236, 0.72, 0.8], [132, 540, 0.55, 0.7],
      [902, 726, 0.6, 0.7], [340, 88, 0.42, 0.6], [672, 268, 0.38, 0.55],
    ] as const) {
      ctx.globalAlpha = op;
      chispa(ctx, s(x), s(y), s(22 * esc));
    }
    ctx.globalAlpha = 0.95;
    luna(ctx, s(842), s(148), s(46));
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = oro;
    ctx.lineWidth = Math.max(1.5, s(1.6));
    ctx.strokeRect(s(52), s(52), s(896), s(896));
    ctx.globalAlpha = 1;
    for (const [x, y] of [
      [52, 52],
      [948, 52],
      [948, 948],
      [52, 948],
    ] as const) {
      chispa(ctx, s(x), s(y), s(11));
    }
    pieDeMarco(ctx, marco, {
      margen: s(52),
      familia: SERIF,
      tamNombre: 0.082,
      colorNombre: oro,
      tamFecha: 0.026,
      colorFecha: "#eadfba",
      linea: "#e6cd92",
      adorno: (cx, cy) => {
        ctx.fillStyle = oro;
        chispa(ctx, cx, cy, s(11));
      },
      velo: 0.62,
    });
  } else if (marco.tipo === "botanico") {
    // Filete dorado fino con dos ramas de olivo en esquinas opuestas.
    const m = Math.round(L * 0.055);
    const m2 = m + Math.round(L * 0.012);
    const verde = "#a9bd97";
    const oliva = "#c9a86a";
    ctx.strokeStyle = oroClaro(ctx, 0, 0, L, L);
    ctx.lineWidth = Math.max(2, Math.round(L * 0.0028));
    ctx.strokeRect(m, m, L - 2 * m, L - 2 * m);
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0013));
    ctx.strokeRect(m2, m2, L - 2 * m2, L - 2 * m2);
    ctx.fillStyle = "#e8cf94";
    for (const [x, y] of [
      [m, m],
      [L - m, L - m],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, L * 0.0035), 0, Math.PI * 2);
      ctx.fill();
    }
    ramaOlivo(ctx, L * 0.095, L * 0.115, L * 0.29, 0.85, verde, oliva);
    ramaOlivo(ctx, L * 0.885, L * 0.6, L * 0.29, 1.85, verde, oliva);
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: SERIF,
      tamNombre: 0.08,
      colorNombre: "#fdf6ea",
      tamFecha: 0.025,
      colorFecha: "#f0e4c8",
      linea: "#d9c08a",
      adorno: (cx, cy) => {
        hoja(ctx, cx - L * 0.003, cy, L * 0.02, L * 0.0055, Math.PI + 0.4, verde);
        hoja(ctx, cx + L * 0.003, cy, L * 0.02, L * 0.0055, -0.4, verde);
      },
      velo: 0.58,
    });
  } else if (marco.tipo === "editorial") {
    // Portada de revista: nada de adornos, solo tipografía y aire.
    const c = ctx as Ctx2D;
    const m = Math.round(L * 0.062);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0015));
    ctx.strokeRect(m, m, L - 2 * m, L - 2 * m);
    // Cintillo de arriba: un filete con el lugar en versalitas menudas.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = L * 0.012;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const alto = L * 0.115;
    const cintillo = (marco.kicker ?? "PHOTOBOOTH").toUpperCase();
    c.letterSpacing = `${Math.round(L * 0.014)}px`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    fuenteQueQuepa(ctx, cintillo, L * 0.5, Math.round(L * 0.019), SERIF);
    ctx.fillText(cintillo, L / 2, alto);
    // Los filetes arrancan JUSTO donde acaba el texto: si fueran fijos, un
    // hashtag largo se les montaría encima.
    const mitad = ctx.measureText(cintillo).width / 2 + L * 0.025;
    c.letterSpacing = "0px";
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0012));
    for (const lado of [-1, 1]) {
      const desde = L / 2 + lado * mitad;
      const hasta = L / 2 + lado * (L / 2 - m - L * 0.03);
      if (Math.abs(hasta - desde) > L * 0.02) {
        ctx.beginPath();
        ctx.moveTo(desde, alto);
        ctx.lineTo(hasta, alto);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.textBaseline = "alphabetic";
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: SERIF,
      tamNombre: 0.088,
      colorNombre: "#ffffff",
      espacioNombre: 0.004,
      tamFecha: 0.022,
      colorFecha: "rgba(255,255,255,0.9)",
      linea: "rgba(255,255,255,0.75)",
      velo: 0.5,
    });
  } else if (marco.tipo === "galeria") {
    // Passe-partout: la foto va en una ventana y el cartón marfil la enmarca.
    // Aquí el texto NO va sobre la foto sino sobre el cartón, así que se
    // dibuja a mano (en oscuro) en vez de con el pie de siempre.
    const c = ctx as Ctx2D;
    const a = areaFoto(marco);
    // Bisel: una línea que hunde la ventana y otra que la levanta.
    ctx.strokeStyle = "rgba(90,80,66,0.45)";
    ctx.lineWidth = Math.max(1.5, Math.round(L * 0.0022));
    ctx.strokeRect(a.x - 1, a.y - 1, a.w + 2, a.h + 2);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0014));
    ctx.strokeRect(a.x - Math.round(L * 0.005), a.y - Math.round(L * 0.005), a.w + Math.round(L * 0.01), a.h + Math.round(L * 0.01));
    // Filete fino por dentro del borde del cartón.
    ctx.strokeStyle = "rgba(120,105,84,0.35)";
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0012));
    const mm = Math.round(L * 0.038);
    ctx.strokeRect(mm, mm, L - 2 * mm, L - 2 * mm);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const base = a.y + a.h;
    if (marco.etiqueta) {
      ctx.fillStyle = "#4a4238";
      c.letterSpacing = `${Math.round(L * 0.005)}px`;
      textoVersalitas(ctx, marco.etiqueta, L / 2, base + L * 0.115, L * 0.78, Math.round(L * 0.062), SERIF);
      c.letterSpacing = "0px";
    }
    if (marco.sub) {
      ctx.fillStyle = "#8b8071";
      c.letterSpacing = `${Math.round(L * 0.012)}px`;
      fuenteQueQuepa(ctx, marco.sub, L * 0.78, Math.round(L * 0.022), SERIF);
      ctx.fillText(marco.sub, L / 2, base + L * 0.185);
      c.letterSpacing = "0px";
    }
    ctx.textBaseline = "alphabetic";
  } else if (marco.tipo === "cine") {
    // Letterbox: dos barras negras y el nombre en la de abajo.
    const c = ctx as Ctx2D;
    const barra = Math.round(L * 0.135);
    ctx.fillStyle = "#07070a";
    ctx.fillRect(0, 0, L, barra);
    ctx.fillRect(0, L - barra, L, barra);
    ctx.strokeStyle = "rgba(232,228,220,0.5)";
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0012));
    ctx.beginPath();
    ctx.moveTo(0, barra);
    ctx.lineTo(L, barra);
    ctx.moveTo(0, L - barra);
    ctx.lineTo(L, L - barra);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (marco.etiqueta) {
      ctx.fillStyle = "#f2efe8";
      c.letterSpacing = `${Math.round(L * 0.012)}px`;
      fuenteQueQuepa(
        ctx,
        marco.etiqueta.toUpperCase(),
        L * 0.84,
        Math.round(L * 0.042),
        "ui-sans-serif, system-ui, sans-serif",
        "300",
      );
      ctx.fillText(marco.etiqueta.toUpperCase(), L / 2, L - barra * 0.56);
      c.letterSpacing = "0px";
    }
    if (marco.sub) {
      ctx.fillStyle = "rgba(232,228,220,0.62)";
      c.letterSpacing = `${Math.round(L * 0.01)}px`;
      fuenteQueQuepa(ctx, marco.sub, L * 0.84, Math.round(L * 0.018), "ui-sans-serif, system-ui, sans-serif");
      ctx.fillText(marco.sub, L / 2, barra * 0.5);
      c.letterSpacing = "0px";
    }
    ctx.textBaseline = "alphabetic";
  } else if (marco.tipo === "filigrana") {
    // Filigrana: doble filete con rizos en las cuatro esquinas.
    const m = Math.round(L * 0.052);
    const m2 = m + Math.round(L * 0.016);
    const oro = oroClaro(ctx, 0, 0, L, L);
    ctx.strokeStyle = oro;
    ctx.lineWidth = Math.max(2, Math.round(L * 0.0032));
    ctx.strokeRect(m, m, L - 2 * m, L - 2 * m);
    ctx.lineWidth = Math.max(1, Math.round(L * 0.0013));
    ctx.strokeRect(m2, m2, L - 2 * m2, L - 2 * m2);
    const esc = L * 0.12;
    const grosor = Math.max(1.5, Math.round(L * 0.0022));
    const d = L * 0.085;
    for (const [sx, sy] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ] as const) {
      const x = sx > 0 ? d : L - d;
      const y = sy > 0 ? d : L - d;
      // Dos rizos por esquina: uno corre por el borde de arriba y otro por el
      // de al lado, espejados en la diagonal.
      voluta(ctx, x, y, esc, sx, sy, oro, grosor);
      voluta(ctx, x, y, esc * 0.78, sx, sy, oro, grosor * 0.8, true);
      rombo(ctx, x, y, L * 0.007, "#f2e2b4");
    }
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: SERIF,
      tamNombre: 0.082,
      colorNombre: "#fdf4dd",
      espacioNombre: 0.003,
      tamFecha: 0.024,
      colorFecha: "#e6cd92",
      linea: "#dcc188",
      adorno: (cx, cy) => rombo(ctx, cx, cy, L * 0.009, "#e6cd92"),
      velo: 0.58,
    });
  } else if (marco.tipo === "corona") {
    // XV años: doble filete oro rosa, corona arriba y brillos alrededor.
    const m = Math.round(L * 0.05);
    const m2 = m + Math.round(L * 0.016);
    const oro = ctx.createLinearGradient(0, 0, L, 0);
    oro.addColorStop(0, "#f6dcb0");
    oro.addColorStop(0.5, "#e0b56a");
    oro.addColorStop(1, "#f6dcb0");
    ctx.strokeStyle = oro;
    ctx.lineWidth = Math.max(2, Math.round(L * 0.004));
    rectRedondo(ctx, m, m, L - 2 * m, L - 2 * m, L * 0.04);
    ctx.stroke();
    ctx.strokeStyle = "#f2b6c9";
    ctx.lineWidth = Math.max(1, Math.round(L * 0.002));
    rectRedondo(ctx, m2, m2, L - 2 * m2, L - 2 * m2, L * 0.032);
    ctx.stroke();
    // La base va a 0.21: más arriba, las puntas se salen del filete.
    corona(ctx, L / 2, L * 0.21, L * 0.19, oro, "#ffd9e5");
    ctx.fillStyle = "#f8e2c0";
    for (const [x, y, r, op] of [
      [0.3, 0.1, 0.02, 0.9], [0.7, 0.1, 0.016, 0.8], [0.24, 0.19, 0.012, 0.6],
      [0.77, 0.2, 0.014, 0.7], [0.13, 0.35, 0.013, 0.5], [0.88, 0.33, 0.011, 0.5],
      [0.35, 0.06, 0.01, 0.5], [0.64, 0.055, 0.012, 0.55],
    ] as const) {
      ctx.globalAlpha = op;
      chispa(ctx, L * x, L * y, L * r);
    }
    ctx.globalAlpha = 1;
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: CURSIVA,
      estilo: "italic",
      tamNombre: 0.095,
      colorNombre: "#fff3f6",
      tamFecha: 0.026,
      colorFecha: "#f6d9b6",
      familiaFecha: SERIF,
      linea: "#f0c9a0",
      adorno: (cx, cy) => {
        ctx.fillStyle = "#f6dcb0";
        chispa(ctx, cx, cy, L * 0.014);
      },
      velo: 0.58,
    });
  } else if (marco.tipo === "globos") {
    // Cumpleaños: racimos de globos en las dos esquinas de arriba.
    const m = Math.round(L * 0.045);
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(2, Math.round(L * 0.0035));
    rectRedondo(ctx, m, m, L - 2 * m, L - 2 * m, L * 0.038);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const colores = ["#f19ab8", "#f7d08a", "#fdf3f6", "#f4a98a", "#e87fa6"];
    // [x, y, radio, giro, color]
    const racimo: [number, number, number, number, number][] = [
      [0.115, 0.115, 0.055, -0.18, 0], [0.225, 0.09, 0.045, 0.15, 1],
      [0.185, 0.205, 0.038, -0.1, 2], [0.085, 0.235, 0.032, 0.2, 3],
      [0.295, 0.175, 0.028, -0.22, 4],
      [0.885, 0.115, 0.055, 0.18, 1], [0.775, 0.09, 0.045, -0.15, 0],
      [0.815, 0.205, 0.038, 0.1, 4], [0.915, 0.235, 0.032, -0.2, 2],
      [0.705, 0.175, 0.028, 0.22, 3],
    ];
    for (const [x, y, r, giro, ci] of racimo) {
      globo(ctx, L * x, L * y, L * r, colores[ci]!, giro);
    }
    for (const [x, y, w, h, giro, ci] of [
      [0.42, 0.12, 0.016, 0.008, 0.6, 0], [0.55, 0.2, 0.014, 0.007, -0.4, 1],
      [0.48, 0.31, 0.012, 0.006, 1.1, 3], [0.62, 0.35, 0.015, 0.007, 0.3, 4],
      [0.38, 0.26, 0.013, 0.006, -0.9, 2], [0.58, 0.07, 0.012, 0.006, 0.5, 3],
    ] as const) {
      papelito(ctx, L * x, L * y, L * w, L * h, giro, colores[ci]!);
    }
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: CURSIVA,
      estilo: "italic",
      tamNombre: 0.095,
      colorNombre: "#ffffff",
      tamFecha: 0.026,
      colorFecha: "#ffe3ec",
      familiaFecha: SERIF,
      linea: "#f7bdd0",
      adorno: (cx, cy) => globo(ctx, cx, cy - L * 0.012, L * 0.013, "#f19ab8", 0),
      velo: 0.6,
    });
  } else if (marco.tipo === "brillos") {
    // Polvo de brillos dorado y rosa, denso en las esquinas.
    const m = Math.round(L * 0.05);
    const oro = ctx.createLinearGradient(0, 0, L, L);
    oro.addColorStop(0, "#f7d9a0");
    oro.addColorStop(0.5, "#f3b6cd");
    oro.addColorStop(1, "#f7d9a0");
    ctx.strokeStyle = oro;
    ctx.lineWidth = Math.max(2, Math.round(L * 0.0032));
    ctx.strokeRect(m, m, L - 2 * m, L - 2 * m);
    // [x, y, radio, opacidad, rosa?]
    const polvo: [number, number, number, number, number][] = [
      [0.11, 0.1, 0.026, 0.95, 0], [0.2, 0.16, 0.015, 0.75, 1], [0.09, 0.21, 0.012, 0.6, 0],
      [0.27, 0.09, 0.013, 0.65, 1], [0.16, 0.27, 0.01, 0.5, 0], [0.33, 0.17, 0.009, 0.45, 1],
      [0.89, 0.1, 0.026, 0.95, 1], [0.8, 0.16, 0.015, 0.75, 0], [0.91, 0.21, 0.012, 0.6, 1],
      [0.73, 0.09, 0.013, 0.65, 0], [0.84, 0.27, 0.01, 0.5, 1], [0.67, 0.17, 0.009, 0.45, 0],
      [0.1, 0.62, 0.014, 0.55, 1], [0.9, 0.62, 0.014, 0.55, 0],
      [0.14, 0.75, 0.011, 0.45, 0], [0.86, 0.75, 0.011, 0.45, 1],
      [0.5, 0.07, 0.011, 0.5, 0], [0.42, 0.13, 0.008, 0.35, 1],
    ];
    for (const [x, y, r, op, rosa] of polvo) {
      ctx.globalAlpha = op;
      ctx.fillStyle = rosa ? "#f6c3d6" : "#f8e0ac";
      chispa(ctx, L * x, L * y, L * r);
    }
    ctx.globalAlpha = 1;
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: SERIF,
      tamNombre: 0.082,
      colorNombre: "#fff6ea",
      tamFecha: 0.026,
      colorFecha: "#f6d9b6",
      linea: "#f0cba2",
      adorno: (cx, cy) => {
        ctx.fillStyle = "#f8e0ac";
        chispa(ctx, cx, cy, L * 0.014);
      },
      velo: 0.6,
    });
  } else if (marco.tipo === "neon") {
    // Noche: marco de tubo encendido, rosa por fuera y cian por dentro.
    const m = Math.round(L * 0.055);
    const m2 = m + Math.round(L * 0.022);
    const grueso = Math.max(4, Math.round(L * 0.009));
    neon(ctx, () => rectRedondo(ctx, m, m, L - 2 * m, L - 2 * m, L * 0.05), "#ff63c8", grueso);
    neon(
      ctx,
      () => rectRedondo(ctx, m2, m2, L - 2 * m2, L - 2 * m2, L * 0.04),
      "#5ce1ff",
      grueso * 0.55,
    );
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: CURSIVA,
      estilo: "italic",
      tamNombre: 0.095,
      colorNombre: "#ffffff",
      tamFecha: 0.026,
      colorFecha: "#9fefff",
      familiaFecha: SERIF,
      resplandor: "#ff63c8",
      velo: 0.66,
    });
  } else if (marco.tipo === "confeti") {
    // Fiesta: papelitos y serpentinas cayendo desde arriba.
    const m = Math.round(L * 0.042);
    const colores = ["#ff6b9d", "#ffd166", "#6bcbff", "#b28dff", "#7ee787", "#ffffff"];
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = Math.max(2, Math.round(L * 0.0032));
    rectRedondo(ctx, m, m, L - 2 * m, L - 2 * m, L * 0.03);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const [x, largo, onda, ci] of [
      [0.14, 0.3, 0.035, 0], [0.29, 0.24, 0.03, 2], [0.72, 0.27, 0.032, 3],
      [0.87, 0.22, 0.028, 1], [0.5, 0.16, 0.026, 4],
    ] as const) {
      serpentina(ctx, L * x, L * 0.05, L * largo, L * onda, Math.max(2, L * 0.005), colores[ci]!);
    }
    // [x, y, ancho, alto, giro, color]
    const papeles: [number, number, number, number, number, number][] = [
      [0.09, 0.12, 0.018, 0.009, 0.5, 0], [0.19, 0.22, 0.016, 0.008, -0.7, 1],
      [0.33, 0.09, 0.02, 0.009, 1.2, 2], [0.41, 0.2, 0.014, 0.007, 0.3, 3],
      [0.56, 0.11, 0.018, 0.008, -1.1, 4], [0.64, 0.24, 0.015, 0.007, 0.8, 5],
      [0.78, 0.13, 0.019, 0.009, -0.4, 0], [0.9, 0.26, 0.016, 0.008, 1.4, 2],
      [0.25, 0.35, 0.013, 0.006, -0.9, 1], [0.7, 0.38, 0.014, 0.007, 0.6, 3],
      [0.12, 0.46, 0.012, 0.006, 1.0, 4], [0.88, 0.48, 0.013, 0.006, -0.5, 0],
      [0.46, 0.32, 0.012, 0.006, 0.2, 5], [0.6, 0.05, 0.015, 0.007, -1.3, 1],
      [0.08, 0.62, 0.011, 0.005, 0.7, 2], [0.93, 0.66, 0.012, 0.006, -0.8, 4],
    ];
    for (const [x, y, w, h, giro, ci] of papeles) {
      papelito(ctx, L * x, L * y, L * w, L * h, giro, colores[ci]!);
    }
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: "ui-sans-serif, system-ui, sans-serif",
      estilo: "700",
      tamNombre: 0.078,
      colorNombre: "#ffffff",
      tamFecha: 0.025,
      colorFecha: "#ffe08a",
      familiaFecha: "ui-sans-serif, system-ui, sans-serif",
      linea: "#ffffff",
      adorno: (cx, cy) => papelito(ctx, cx, cy, L * 0.016, L * 0.008, 0.6, "#ff6b9d"),
      velo: 0.62,
    });
  } else if (marco.tipo === "foquitos") {
    // Terraza de noche: dos guirnaldas colgadas arriba.
    const m = Math.round(L * 0.045);
    const r = L * 0.017;
    ctx.strokeStyle = "rgba(255,225,180,0.55)";
    ctx.lineWidth = Math.max(1, Math.round(L * 0.002));
    ctx.strokeRect(m, m, L - 2 * m, L - 2 * m);
    // Las dos de arriba COMPARTEN el punto del centro; si se solapan, se cruzan en X.
    guirnalda(ctx, -L * 0.02, L * 0.07, L * 0.5, L * 0.045, L * 0.08, 5, r);
    guirnalda(ctx, L * 0.5, L * 0.045, L * 1.02, L * 0.085, L * 0.085, 5, r);
    guirnalda(ctx, L * 0.05, L * 0.185, L * 0.95, L * 0.175, L * 0.06, 7, r * 0.78);
    pieDeMarco(ctx, marco, {
      margen: m,
      familia: SERIF,
      tamNombre: 0.082,
      colorNombre: "#fff4e0",
      tamFecha: 0.026,
      colorFecha: "#ffd79a",
      linea: "#e8b877",
      adorno: (cx, cy) => {
        ctx.save();
        ctx.shadowColor = "rgba(255,196,110,0.9)";
        ctx.shadowBlur = L * 0.02;
        ctx.fillStyle = "#ffd79a";
        ctx.beginPath();
        ctx.arc(cx, cy, L * 0.008, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      },
      velo: 0.6,
    });
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
      ctx.fillStyle = fondoDelLienzo(marco);
      ctx.fillRect(0, 0, LADO, LADO);
      const area = areaFoto(marco);
      // RECORTE a la ventana: `dibujarCover` agranda la foto hasta cubrirla, y
      // lo que sobra se saldría por los lados. Sin esto, la galería pinta la
      // foto encima de su propio cartón — y la instantánea, encima de su borde
      // blanco en cuanto la foto no es cuadrada (subida desde el carrete).
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.w, area.h);
      ctx.clip();
      dibujarCover(ctx, img, img.naturalWidth, img.naturalHeight, area.x, area.y, area.w, area.h);
      ctx.restore();
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

/**
 * Nombre de archivo ÚNICO para cada descarga: incluye el marco y la hora, así
 * el invitado puede guardar la misma foto con varios marcos sin que el teléfono
 * pida "reemplazar" la anterior.
 */
export function nombreDescarga(marcoId: string, hashtag = evento.hashtag): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const sello = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `photobooth-${hashtag}-${marcoId}-${sello}`;
}

/** Descarga un dataURL como archivo PNG. */
export function descargar(dataUrl: string, nombre = "photobooth") {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${nombre}.png`;
  // Agregarlo al documento hace que la descarga funcione también en navegadores
  // como Samsung Internet o Firefox, no solo en Chrome.
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Comparte la imagen con la hoja nativa (Web Share API, ideal para WhatsApp).
 * Devuelve true si se pudo compartir; false si el navegador no lo soporta
 * (en ese caso conviene ofrecer la descarga).
 */
export async function compartir(
  dataUrl: string,
  textos: Pick<TextosMarcos, "nombre" | "hashtag"> = evento,
): Promise<boolean> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "photobooth.png", { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: textos.nombre, text: `#${textos.hashtag}` });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Convierte la foto compuesta (dataURL en PNG) en un JPEG para el álbum.
 *
 * El PNG de `componer` va perfecto para descargar, pero pesa varias veces lo
 * que pesan las demás fotos del álbum (que suben comprimidas en JPEG). Antes
 * de mandarla al álbum del evento se vuelve a exportar como JPEG, para que la
 * foto del photobooth pese como una foto más y no se coma el cupo del evento.
 */
export function aBlobJpeg(dataUrl: string, calidad = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || LADO;
      canvas.height = img.naturalHeight || LADO;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear el lienzo."));
        return;
      }
      // El JPEG no tiene transparencia: se pinta un fondo por si acaso, aunque
      // la foto compuesta ya viene opaca (componer pinta su propio fondo).
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo preparar la foto."))),
        "image/jpeg",
        calidad,
      );
    };
    img.onerror = () => reject(new Error("No se pudo cargar la foto."));
    img.src = dataUrl;
  });
}
