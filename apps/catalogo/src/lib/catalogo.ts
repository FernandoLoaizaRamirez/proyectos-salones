/**
 * Contenido del CATÁLOGO-TIENDA de la suite.
 *
 * Es la herramienta de venta: el salón (cliente) ve todas las apps que ofreces,
 * cada una con su precio en los 3 modelos, arma su selección y pide cotización
 * por WhatsApp.
 *
 * TODO editable aquí (white-label): tus datos, tus apps, tus precios.
 * No hay cobros en línea; el botón "Cotizar" arma un mensaje de WhatsApp.
 */
import type { ComponentType } from "react";
import {
  Globe,
  Camera,
  Mail,
  CalendarCheck,
  QrCode,
  Armchair,
  BookHeart,
  ListMusic,
  Aperture,
  MapPinned,
  Gamepad2,
  Video,
} from "lucide-react";
import { AppMode } from "@salones/core";

/** Tus datos como proveedor de la suite. CAMBIA por los tuyos. */
export const vendedor = {
  nombre: "Suite para Salones",
  tagline: "Todo lo digital para tu salón de eventos, en un solo lugar.",
  // WhatsApp real (con código de país de México, sin signos): 52 + número.
  whatsapp: "526673349236",
  email: "hola@suiteparasalones.mx",
};

/** Los 3 modelos de contratación (alineados con AppMode de @salones/core). */
export type Modelo = (typeof AppMode)[keyof typeof AppMode];

export const modelos = [
  {
    clave: AppMode.Managed,
    // El gestionado se cobra POR EVENTO (no por mes): el salón me contrata para
    // que yo monte y opere la app en esa boda. Por eso sale más barato que la
    // renta, que da la app el mes entero para los eventos que quieran.
    nombre: "Servicio gestionado",
    corto: "Gestionado",
    periodo: "/evento",
    resumen:
      "Se cobra por evento: yo lo monto, lo opero y te doy soporte esa noche. Tú solo lo usas y lo disfrutas.",
  },
  {
    clave: AppMode.Rental,
    nombre: "Renta mensual",
    corto: "Renta",
    periodo: "/mes",
    resumen:
      "La app es tuya todo el mes, para los eventos que quieras, y la manejas tú. Sin compromisos: cancelas cuando quieras.",
  },
  {
    clave: AppMode.Owned,
    nombre: "Compra completa",
    corto: "Compra",
    periodo: " pago único",
    resumen: "La app es tuya para siempre. Un solo pago, sin mensualidades.",
  },
] as const;

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  icono: ComponentType<{ className?: string }>;
  acento: string;
  disponible: boolean;
  destacado?: boolean;
  demoUrl?: string;
  precios: Record<Modelo, number>;
  /** En qué modelos se ofrece esta app. Si no se define, se ofrece en los 3. */
  modelos?: Modelo[];
  /**
   * Nota honesta sobre qué hace la app HOY vs. qué requiere el servicio
   * gestionado. Se muestra en la tarjeta para no vender de más las funciones
   * "colectivas" (juntar el contenido de muchos teléfonos en un solo lugar),
   * que necesitan el sistema central.
   */
  notaGestionado?: string;
};

/**
 * Tus apps. Precios en pesos mexicanos (MXN), de referencia y editables.
 * "MANAGED" es por evento, "RENTAL" es mensual y "OWNED" es pago único.
 *
 * REGLA DE PRECIOS: RENTAL siempre va POR ENCIMA de MANAGED (~20%, redondeado a
 * $50). No es un error: el gestionado es una sola noche con tu trabajo incluido,
 * mientras que la renta les deja la app el mes entero para todos los eventos que
 * quieran. Si algún día cambias un precio, respeta ese orden.
 */
export const productos: Producto[] = [
  {
    id: "sitio-salon",
    nombre: "Sitio web del salón",
    descripcion:
      "Página profesional del salón con dos versiones: clásica y una premium inmersiva (cinematográfica). Con galería, paquetes y contacto directo por WhatsApp.",
    icono: Globe,
    acento: "from-rose-500 to-pink-600",
    disponible: true,
    destacado: true,
    demoUrl: "https://salones-teal.vercel.app",
    // El sitio SOLO SE VENDE: es una página hecha a la medida de la marca del
    // salón, no algo que se preste por evento ni por mes. Los dos precios
    // mensuales quedan aquí porque el tipo los pide, pero no se muestran nunca.
    precios: { MANAGED: 1500, RENTAL: 1800, OWNED: 12000 },
    modelos: [AppMode.Owned],
    // Consecuencia buscada: los paquetes que incluyen el sitio (Esencial y Todo
    // Incluido) solo tienen precio en Compra. En Gestionado y Renta su tarjeta
    // sigue apareciendo, pero con el aviso "Solo en Compra completa" y un botón
    // que lleva a esa pestaña.
  },
  {
    id: "album-fotos",
    nombre: "Álbum de fotos del evento",
    descripcion:
      "Los invitados suben sus fotos y videos escaneando un código QR, y todos los ven y descargan en un mismo lugar. Recuerdos de todos, al instante.",
    icono: Camera,
    acento: "from-fuchsia-500 to-purple-600",
    disponible: true,
    demoUrl: "https://album-fotos-gamma.vercel.app",
    precios: { MANAGED: 800, RENTAL: 950, OWNED: 9000 },
    notaGestionado:
      "Con el Servicio gestionado —así corre esta demo— cada foto sube sola al álbum común del evento: todos las ven y descargan en un mismo lugar. En Renta/Compra, cada quien guarda las suyas en su teléfono.",
  },
  {
    id: "invitaciones",
    nombre: "Invitaciones digitales",
    descripcion:
      "Invitación web elegante y personalizada con los datos del evento, mapa, cuenta regresiva y confirmación en un clic. Se comparte por WhatsApp.",
    icono: Mail,
    acento: "from-amber-500 to-orange-600",
    disponible: true,
    demoUrl: "https://invitaciones-weld.vercel.app",
    precios: { MANAGED: 600, RENTAL: 700, OWNED: 6500 },
  },
  {
    id: "rsvp",
    nombre: "Confirmación de asistencia (RSVP)",
    descripcion:
      "Los invitados confirman en línea si asisten y cuántos acompañantes llevan. Tú ves la lista actualizada en tiempo real, sin llamadas ni Excel.",
    icono: CalendarCheck,
    acento: "from-teal-500 to-emerald-600",
    disponible: true,
    demoUrl: "https://rsvp-umber-pi.vercel.app",
    precios: { MANAGED: 500, RENTAL: 600, OWNED: 5500 },
    notaGestionado:
      "Con el Servicio gestionado —así corre esta demo— el tablero se actualiza solo con la confirmación de cada invitado, desde su propio teléfono. En Renta/Compra, cada respuesta te llega por WhatsApp.",
  },
  {
    id: "pases-qr",
    nombre: "Pases con QR y check-in",
    descripcion:
      "Cada invitado recibe un pase con código QR. En la entrada se escanea para controlar el acceso: rápido, ordenado y sin colados.",
    icono: QrCode,
    acento: "from-sky-500 to-blue-600",
    disponible: true,
    demoUrl: "https://pases-qr.vercel.app",
    precios: { MANAGED: 700, RENTAL: 850, OWNED: 7500 },
  },
  {
    id: "mesas",
    nombre: "Acomodo de mesas",
    descripcion:
      "Organiza quién se sienta en cada mesa arrastrando a tus invitados, desde la computadora o el celular. Ves los lugares usados y libres al instante, y compartes el acomodo por un enlace de solo lectura con QR.",
    icono: Armchair,
    acento: "from-violet-500 to-indigo-600",
    disponible: true,
    demoUrl: "https://proyectos-salones-mesas.vercel.app",
    precios: { MANAGED: 600, RENTAL: 700, OWNED: 6000 },
  },
  {
    id: "muro",
    nombre: "Muro de mensajes",
    descripcion:
      "Un libro de firmas digital: los invitados escanean un QR, escriben su mensaje, firman y suben una foto. Tú los ves aparecer en una pared y los proyectas en la fiesta con el “modo pantalla”.",
    icono: BookHeart,
    acento: "from-rose-500 to-fuchsia-600",
    disponible: true,
    demoUrl: "https://proyectos-salones-muro.vercel.app",
    precios: { MANAGED: 550, RENTAL: 650, OWNED: 5500 },
    notaGestionado:
      "Con el Servicio gestionado —así corre esta demo— los mensajes aparecen solos en la pared desde el teléfono de cada invitado. En Renta/Compra funciona en una tablet en la fiesta o por WhatsApp.",
  },
  {
    id: "playlist",
    nombre: "Playlist colaborativa",
    descripcion:
      "Los invitados piden canciones y votan por sus favoritas escaneando un QR. El DJ ve la lista ordenada por votos y marca cuáles ya puso. La música de la fiesta la eligen todos.",
    icono: ListMusic,
    acento: "from-cyan-500 to-blue-600",
    disponible: true,
    demoUrl: "https://proyectos-salones-playlist.vercel.app",
    precios: { MANAGED: 600, RENTAL: 700, OWNED: 6000 },
    notaGestionado:
      "Con el Servicio gestionado —así corre esta demo— las peticiones y los votos llegan al DJ desde el teléfono de cada invitado. En Renta/Compra funciona en una tablet-kiosco en la fiesta.",
  },
  {
    id: "photobooth",
    nombre: "Photobooth digital",
    descripcion:
      "Tus invitados se toman una foto con la cámara de su teléfono, eligen un marco del evento y la descargan o comparten al instante, ya lista con el diseño. Sin imprimir nada.",
    icono: Aperture,
    acento: "from-purple-500 to-pink-600",
    disponible: true,
    demoUrl: "https://proyectos-salones-photobooth.vercel.app",
    precios: { MANAGED: 700, RENTAL: 850, OWNED: 7000 },
    // Photobooth funciona 100% hoy: cada invitado se toma su foto, elige el marco
    // y la descarga/comparte desde su teléfono. No necesita sistema central, así
    // que NO lleva nota de "servicio gestionado".
  },
  {
    id: "mi-mesa",
    nombre: "¿En qué mesa me toca?",
    descripcion:
      "El invitado escribe su nombre, encuentra su mesa al instante y ve quiénes lo acompañan. Usa el mismo acomodo que la app de mesas: se comparte por enlace o QR.",
    icono: MapPinned,
    acento: "from-emerald-500 to-green-600",
    disponible: true,
    demoUrl: "https://proyectos-salones-mi-mesa.vercel.app",
    precios: { MANAGED: 500, RENTAL: 600, OWNED: 5000 },
  },
  {
    id: "dinamicas",
    nombre: "Dinámicas y juegos",
    descripcion:
      "Trivia de los novios (con ranking en vivo), bingo de boda y un rompehielos. Los invitados juegan desde su teléfono escaneando un QR. Para que nadie se quede sentado.",
    icono: Gamepad2,
    acento: "from-yellow-500 to-orange-600",
    disponible: true,
    demoUrl: "https://proyectos-salones-dinamicas.vercel.app",
    precios: { MANAGED: 600, RENTAL: 700, OWNED: 6000 },
    notaGestionado:
      "Con el Servicio gestionado —así corre esta demo— el ranking de la trivia junta en vivo a todos los invitados. El bingo y el rompehielos funcionan en cada teléfono, sin necesidad de nada más.",
  },
  {
    id: "brindis",
    nombre: "Brindis en video",
    descripcion:
      "Cada invitado graba un mensaje corto en video para los novios desde su teléfono y lo comparte. Un recuerdo con la voz y la cara de todos.",
    icono: Video,
    acento: "from-red-500 to-rose-600",
    disponible: true,
    demoUrl: "https://proyectos-salones-brindis.vercel.app",
    precios: { MANAGED: 700, RENTAL: 850, OWNED: 7000 },
    notaGestionado:
      "Con el Servicio gestionado —así corre esta demo— cada video sube solo a la galería del anfitrión, que además puede crear un video recuerdo que fusiona los brindis de todos en uno. En Renta/Compra, cada video te llega por WhatsApp.",
  },
];

/* ------------------------------------------------------------------ */
/* Paquetes (combos con descuento)                                    */
/* ------------------------------------------------------------------ */

/**
 * Paquetes: combinaciones de apps a un precio más económico que
 * contratarlas por separado. El precio se calcula solo a partir de los
 * precios individuales y el descuento, así siempre queda consistente.
 */
export type Paquete = {
  id: string;
  nombre: string;
  descripcion: string;
  incluye: string[]; // ids de productos
  descuento: number; // 0.2 = 20% de descuento
  acento: string;
  destacado?: boolean;
};

export const paquetes: Paquete[] = [
  {
    id: "esencial",
    nombre: "Paquete Esencial",
    descripcion: "Tu presencia digital lista: la página del salón y el álbum de fotos del evento.",
    incluye: ["sitio-salon", "album-fotos"],
    descuento: 0.15,
    acento: "from-rose-500 to-fuchsia-600",
  },
  {
    id: "invitados",
    nombre: "Paquete Invitados",
    descripcion:
      "Todo para manejar a tus invitados de principio a fin: invitación, confirmación y acceso con QR.",
    incluye: ["invitaciones", "rsvp", "pases-qr"],
    descuento: 0.2,
    acento: "from-sky-500 to-emerald-600",
  },
  {
    id: "todo",
    nombre: "Paquete Todo Incluido",
    descripcion: "La suite completa para tu salón, al mejor precio. Todo lo digital de tu evento.",
    incluye: [
      "sitio-salon",
      "album-fotos",
      "invitaciones",
      "rsvp",
      "pases-qr",
      "mesas",
      "muro",
      "playlist",
      "photobooth",
      "mi-mesa",
      "dinamicas",
      "brindis",
    ],
    descuento: 0.25,
    acento: "from-primary to-purple-600",
    destacado: true,
  },
];

/** Las apps que incluye un paquete (como objetos Producto). */
export function appsDelPaquete(pkg: Paquete): Producto[] {
  return pkg.incluye
    .map((id) => productos.find((p) => p.id === id))
    .filter((p): p is Producto => Boolean(p));
}

/** Precio del paquete SIN descuento (suma de las apps sueltas) para un modelo. */
export function precioPaqueteBruto(pkg: Paquete, modelo: Modelo): number {
  return appsDelPaquete(pkg).reduce((s, p) => s + p.precios[modelo], 0);
}

/** Precio del paquete CON descuento, redondeado a $50 para que quede limpio. */
export function precioPaquete(pkg: Paquete, modelo: Modelo): number {
  const conDescuento = precioPaqueteBruto(pkg, modelo) * (1 - pkg.descuento);
  return Math.round(conDescuento / 50) * 50;
}

/* ------------------------------------------------------------------ */
/* Qué modelos aplican a cada app / paquete                            */
/* ------------------------------------------------------------------ */

export const TODOS_LOS_MODELOS: Modelo[] = [AppMode.Managed, AppMode.Rental, AppMode.Owned];

/** Modelos en los que se ofrece una app (por defecto, los 3). */
export function modelosDeProducto(p: Producto): Modelo[] {
  return p.modelos ?? TODOS_LOS_MODELOS;
}

/** Un paquete se ofrece solo en los modelos que TODAS sus apps comparten. */
export function modelosDePaquete(pkg: Paquete): Modelo[] {
  const apps = appsDelPaquete(pkg);
  return TODOS_LOS_MODELOS.filter((m) => apps.every((a) => modelosDeProducto(a).includes(m)));
}

/** Nombre bonito de un modelo (para textos). */
export function nombreModelo(m: Modelo): string {
  return modelos.find((x) => x.clave === m)?.nombre ?? "";
}
