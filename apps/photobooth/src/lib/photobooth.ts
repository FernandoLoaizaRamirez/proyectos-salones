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
  | "botanico";

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
    nombre: "Dorado clásico",
    tipo: "dorado",
    acento: "#e7c76b",
    etiqueta: evento.nombre,
    sub: evento.fecha,
  },
  {
    id: "deco",
    nombre: "Art déco",
    tipo: "deco",
    acento: "#f4e3a1",
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
  {
    id: "mariposas",
    nombre: "Mariposas",
    tipo: "mariposas",
    acento: "#e9a7b0",
    etiqueta: evento.nombre,
    sub: evento.fecha,
  },
  {
    id: "arco",
    nombre: "Arco floral",
    tipo: "arco",
    acento: "#d9b56a",
    etiqueta: evento.nombre,
    sub: evento.fecha,
  },
  {
    id: "monograma",
    nombre: "Monograma",
    tipo: "monograma",
    acento: "#e7c76b",
    etiqueta: evento.nombre,
    sub: evento.fecha,
  },
  {
    id: "constelacion",
    nombre: "Constelación",
    tipo: "constelacion",
    acento: "#e6cd92",
    etiqueta: evento.nombre,
    sub: evento.fecha,
  },
  {
    id: "botanico",
    nombre: "Botánico",
    tipo: "botanico",
    acento: "#d9b56a",
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
    tamFecha: number;
    colorFecha: Pintura;
    familiaFecha?: string;
    linea?: Pintura;
    adorno?: (cx: number, cy: number) => void;
    velo?: number;
  },
) {
  const c = ctx as Ctx2D;
  const L = LADO;
  const alto = Math.round(L * 0.42);
  const opacidad = o.velo ?? 0.6;
  const g = ctx.createLinearGradient(0, L - alto, 0, L);
  g.addColorStop(0, "rgba(6,10,20,0)");
  g.addColorStop(0.55, `rgba(6,10,20,${opacidad * 0.45})`);
  g.addColorStop(1, `rgba(6,10,20,${opacidad})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, L - alto, L, alto);

  const maxW = L - 2 * o.margen - L * 0.07;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

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
      fuenteQueQuepa(ctx, marco.etiqueta, maxW, Math.round(L * o.tamNombre), o.familia, o.estilo);
      ctx.fillText(marco.etiqueta, L / 2, L * 0.775);
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

/**
 * Nombre de archivo ÚNICO para cada descarga: incluye el marco y la hora, así
 * el invitado puede guardar la misma foto con varios marcos sin que el teléfono
 * pida "reemplazar" la anterior.
 */
export function nombreDescarga(marcoId: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const sello = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `photobooth-${evento.hashtag}-${marcoId}-${sello}`;
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
