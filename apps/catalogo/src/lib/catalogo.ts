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
import { Globe, Camera, Mail, CalendarCheck, QrCode, Gift } from "lucide-react";
import { AppMode } from "@salones/core";

/** Tus datos como proveedor de la suite. CAMBIA por los tuyos. */
export const vendedor = {
  nombre: "Suite para Salones",
  tagline: "Todo lo digital para tu salón de eventos, en un solo lugar.",
  // ⚠️ Pon aquí TU WhatsApp real (con código de país, sin signos): 52 + número.
  whatsapp: "526672216283",
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
  },
  {
    id: "album-fotos",
    nombre: "Álbum de fotos del evento",
    descripcion:
      "Los invitados suben sus fotos y videos escaneando un código QR, y todos los ven y descargan en un mismo lugar. Recuerdos de todos, al instante.",
    icono: Camera,
    acento: "from-fuchsia-500 to-purple-600",
    disponible: true,
    precios: { MANAGED: 800, RENTAL: 500, OWNED: 9000 },
  },
  {
    id: "invitaciones",
    nombre: "Invitaciones digitales",
    descripcion:
      "Invitación web elegante y personalizada con los datos del evento, mapa, cuenta regresiva y confirmación en un clic. Se comparte por WhatsApp.",
    icono: Mail,
    acento: "from-amber-500 to-orange-600",
    disponible: false,
    precios: { MANAGED: 600, RENTAL: 350, OWNED: 6500 },
  },
  {
    id: "rsvp",
    nombre: "Confirmación de asistencia (RSVP)",
    descripcion:
      "Los invitados confirman en línea si asisten y cuántos acompañantes llevan. Tú ves la lista actualizada en tiempo real, sin llamadas ni Excel.",
    icono: CalendarCheck,
    acento: "from-teal-500 to-emerald-600",
    disponible: false,
    precios: { MANAGED: 500, RENTAL: 300, OWNED: 5500 },
  },
  {
    id: "pases-qr",
    nombre: "Pases con QR y check-in",
    descripcion:
      "Cada invitado recibe un pase con código QR. En la entrada se escanea para controlar el acceso: rápido, ordenado y sin colados.",
    icono: QrCode,
    acento: "from-sky-500 to-blue-600",
    disponible: false,
    precios: { MANAGED: 700, RENTAL: 400, OWNED: 7500 },
  },
  {
    id: "recuerditos",
    nombre: "Recuerditos digitales",
    descripcion:
      "Genera recuerdos personalizados del evento (tarjetas, mensajes y foto-clips) que los invitados se llevan a su teléfono como memoria de la fiesta.",
    icono: Gift,
    acento: "from-violet-500 to-indigo-600",
    disponible: false,
    precios: { MANAGED: 500, RENTAL: 300, OWNED: 5000 },
  },
];
