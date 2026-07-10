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
import { Globe, Camera, Mail, CalendarCheck, QrCode, Armchair, BookHeart } from "lucide-react";
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
    nombre: "Servicio gestionado",
    corto: "Gestionado",
    periodo: "/mes",
    resumen: "Yo lo monto, lo opero y te doy soporte. Tú solo lo usas y lo disfrutas.",
  },
  {
    clave: AppMode.Rental,
    nombre: "Renta mensual",
    corto: "Renta",
    periodo: "/mes",
    resumen: "Te presto la app y la manejas tú. Sin compromisos: cancelas cuando quieras.",
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
};

/**
 * Tus apps. Precios en pesos mexicanos (MXN), de referencia y editables.
 * "MANAGED" y "RENTAL" son mensuales; "OWNED" es pago único.
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
    precios: { MANAGED: 1500, RENTAL: 900, OWNED: 18000 },
    // El sitio es hecho a la medida de la marca del salón: se VENDE, no se renta.
    modelos: [AppMode.Owned],
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
    precios: { MANAGED: 800, RENTAL: 500, OWNED: 9000 },
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
    precios: { MANAGED: 600, RENTAL: 350, OWNED: 6500 },
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
    precios: { MANAGED: 500, RENTAL: 300, OWNED: 5500 },
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
    precios: { MANAGED: 700, RENTAL: 400, OWNED: 7500 },
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
    precios: { MANAGED: 600, RENTAL: 350, OWNED: 6000 },
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
    precios: { MANAGED: 550, RENTAL: 350, OWNED: 5500 },
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
    incluye: ["sitio-salon", "album-fotos", "invitaciones", "rsvp", "pases-qr", "mesas", "muro"],
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
