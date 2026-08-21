/**
 * Contenido del CATÁLOGO-TIENDA de la suite.
 *
 * Es la herramienta de venta: el salón (cliente) ve todas las apps que ofreces,
 * cada una con su precio en los 3 modelos, arma su selección y pide cotización
 * por WhatsApp.
 *
 * TODO editable aquí (white-label): tus datos, tus apps, tus precios.
 * No hay cobros en línea; el botón "Cotizar" arma un mensaje de WhatsApp.
 *
 * La página está pensada para venderse SOLA (el salón la recibe por WhatsApp y
 * la lee sin vendedor), así que aquí también viven los textos que sustituyen a
 * ese vendedor: el beneficio de cada app en una línea, los 3 modelos explicados
 * con preguntas humanas, las etapas de la fiesta y las preguntas frecuentes.
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

/** Formato de dinero compartido por toda la página (MXN, sin centavos). */
export const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

/** Los 3 modelos de contratación (alineados con AppMode de @salones/core). */
export type Modelo = (typeof AppMode)[keyof typeof AppMode];

/**
 * Cada modelo se explica con las 4 preguntas que un dueño de salón haría de
 * verdad si tuviera un vendedor enfrente. El comparador de la página pinta los
 * renglones en el mismo orden para que se puedan leer lado a lado.
 */
export type InfoModelo = {
  clave: Modelo;
  nombre: string;
  corto: string;
  periodo: string;
  resumen: string;
  /** Titular humano de la tarjeta del comparador ("Yo lo monto y lo opero..."). */
  titular: string;
  quienOpera: string;
  cuantoDura: string;
  cuandoPagas: string;
  paraQuien: string;
  /** Gafete que corona la tarjeta (hoy solo lo lleva el gestionado). */
  gafete?: string;
  /** CTA propio de WhatsApp dentro de la tarjeta (hoy solo el gestionado). */
  ctaPropio?: string;
};

export const modelos: InfoModelo[] = [
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
    titular: "Yo lo monto y lo opero esa noche",
    quienOpera: "Yo, en tu evento. Tú no mueves un dedo.",
    cuantoDura: "Esa noche, de principio a fin.",
    cuandoPagas: "Por evento. Sin contratos ni mensualidades.",
    paraQuien: "¿Tu primer evento con esto? Empieza aquí.",
    // Sin "el más pedido": todavía no hay clientes que lo respalden, y este
    // catálogo no miente ni en lo chiquito.
    gafete: "La forma más fácil de probar",
    ctaPropio: "Quiero estrenarlo en mi próximo evento",
  },
  {
    clave: AppMode.Rental,
    nombre: "Renta mensual",
    corto: "Renta",
    periodo: "/mes",
    resumen:
      "La app es tuya todo el mes, para los eventos que quieras, y la manejas tú. Sin compromisos: cancelas cuando quieras.",
    titular: "Te la rento por mes",
    quienOpera: "Tú la manejas (te enseño cómo).",
    cuantoDura: "Todo el mes, para los eventos que quieras.",
    cuandoPagas: "Cada mes. Cancelas cuando quieras.",
    paraQuien: "¿Varios eventos al mes? Este te conviene.",
  },
  {
    clave: AppMode.Owned,
    nombre: "Compra completa",
    corto: "Compra",
    periodo: " pago único",
    resumen: "La app es tuya para siempre. Un solo pago, sin mensualidades.",
    titular: "Te la vendo para siempre",
    quienOpera: "Tú, y es tuya.",
    cuantoDura: "Para siempre.",
    cuandoPagas: "Una sola vez, sin mensualidades.",
    paraQuien: "¿La quieres tuya, con tu marca? Esta es.",
  },
];

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  /**
   * El beneficio en UNA línea, en el idioma del dueño del salón. Es lo único
   * que se lee en la tarjeta sin desplegar "Más detalles", así que tiene que
   * venderse solo en cinco segundos.
   */
  beneficio: string;
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
      "Página profesional del salón con dos versiones: una clásica y una de lujo, tipo película. Con galería, paquetes y contacto directo por WhatsApp.",
    beneficio: "Tu carta de presentación: te encuentran en internet y te apartan la fecha",
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
    // que lleva a esa pestaña. La tarjeta individual del sitio, en cambio, se
    // puede agregar desde cualquier pestaña: siempre como pago único.
  },
  {
    id: "album-fotos",
    nombre: "Álbum de fotos del evento",
    descripcion:
      "Los invitados suben sus fotos y videos escaneando un código QR, y todos los ven y descargan en un mismo lugar. Recuerdos de todos, al instante.",
    beneficio: "Las fotos de todos los invitados, juntas en un mismo lugar",
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
    beneficio: "Una invitación elegante que se comparte por WhatsApp, con el sello de tu salón",
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
    beneficio: "Sabes cuántos van, sin hacer una sola llamada",
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
    beneficio: "Se escanea el pase y adentro: entrada rápida, ordenada y sin colados",
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
    beneficio: "Acomodas a los invitados arrastrándolos en la pantalla, sin papelitos ni Excel",
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
    beneficio: "Un libro de firmas digital que se proyecta en la pantalla del salón",
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
    beneficio: "La música la piden y la votan tus invitados; el DJ solo ve la lista",
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
    beneficio: "Se toman la foto, le ponen el marco del evento y se la llevan al instante",
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
    beneficio: "El invitado escribe su nombre y su mesa aparece al instante",
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
    beneficio: "Trivia, bingo y juegos desde el celular, para que nadie se quede sentado",
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
    beneficio: "Cada invitado graba un mensajito en video: un recuerdo con la voz de todos",
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
/* Las etapas de la fiesta (el orden en que se cuentan las apps)      */
/* ------------------------------------------------------------------ */

/**
 * El dueño de un salón no piensa en "12 productos": piensa en momentos de un
 * evento. El catálogo agrupa las apps en ese orden y abre cada grupo con una
 * "escena" de una línea que él reconoce de sus propias fiestas.
 */
export type Etapa = {
  id: string;
  titulo: string;
  escena: string;
  apps: string[]; // ids de productos, en el orden en que se muestran
};

export const etapas: Etapa[] = [
  {
    id: "antes",
    titulo: "Antes de la fiesta",
    escena:
      "Una mamá busca salón para los XV de su hija: te encuentra en internet, aparta la fecha, y la invitación sale con el sello de tu salón.",
    apps: ["sitio-salon", "invitaciones", "rsvp", "mesas"],
  },
  {
    id: "puerta",
    titulo: "En la puerta",
    escena:
      "Van llegando 200 personas a la vez: tu hostess escanea pases en segundos y nadie anda preguntando dónde se sienta.",
    apps: ["pases-qr", "mi-mesa"],
  },
  {
    id: "noche",
    titulo: "La noche de la fiesta",
    escena:
      "La pista está llena y en la pantalla del salón van cayendo en vivo las fotos y los mensajes de los invitados.",
    apps: ["album-fotos", "muro", "playlist", "photobooth", "dinamicas", "brindis"],
  },
];

/**
 * Las demos que la portada empuja primero. El photobooth es la estrella porque
 * es la única 100% autónoma (cámara + marco + descarga, sin nota de gestionado
 * que matizar): probarla es un wow garantizado en cualquier celular.
 */
export const demosDestacadas = {
  principal: "photobooth",
  secundarias: ["muro", "playlist"],
} as const;

/* ------------------------------------------------------------------ */
/* Paquetes (combos con descuento)                                    */
/* ------------------------------------------------------------------ */

/**
 * Paquetes: combinaciones de apps a un precio más económico que
 * contratarlas por separado. El precio se calcula solo a partir de los
 * precios individuales y el descuento, así siempre queda consistente.
 *
 * REGLA DE LA ESCALERA: un paquete con MÁS apps nunca puede descontar menos
 * que uno con menos apps, o el catálogo acaba diciendo "llevarte más te
 * conviene menos". Hoy: Esencial 30% (2 apps), Invitados 30% (3), Todo
 * Incluido 40% (12).
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
    descripcion: "Para empezar: tu página en internet y el álbum de fotos de cada evento.",
    incluye: ["sitio-salon", "album-fotos"],
    // 30% (no 15%): con 15% se iba a $17,850 y no se sentía combo. Con 30% baja
    // a $14,700, del otro lado de la barrera de los 15 mil.
    descuento: 0.3,
    acento: "from-rose-500 to-fuchsia-600",
  },
  {
    id: "invitados",
    nombre: "Paquete Invitados",
    descripcion: "La puerta resuelta: invitación, confirmación de asistencia y pases con QR.",
    incluye: ["invitaciones", "rsvp", "pases-qr"],
    // 30%: tiene que empatar al Esencial. Con 20% este combo de TRES apps
    // descontaba menos que el de dos, y quien comparara veía que llevarse más
    // le convenía menos.
    descuento: 0.3,
    acento: "from-sky-500 to-emerald-600",
  },
  {
    id: "todo",
    nombre: "Paquete Todo Incluido",
    descripcion: "La noche completa: las 12 apps, del primer clic al último brindis.",
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
    // 40% (no 25%): con 25% el combo se iba a $62,250 y ese número asustaba de
    // entrada. Con 40% baja a $49,800, que rompe la barrera de los 50 mil sin
    // tener que abaratar las apps sueltas.
    descuento: 0.4,
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

/* ------------------------------------------------------------------ */
/* Los textos que sustituyen al vendedor                               */
/* ------------------------------------------------------------------ */

/**
 * La aclaración de las funciones "colectivas", dicha UNA vez y de frente en la
 * sección de modelos (las notas por app viven en "Más detalles" de cada
 * tarjeta). Es la honestidad de siempre, pero puesta donde no asusta antes de
 * tiempo ni se esconde después.
 */
export const notaHonestaGeneral =
  "Una aclaración honesta: eso de que las fotos, los votos y los mensajes se juntan solitos en una pantalla es del Servicio gestionado — así corren las demos que acabas de probar. En Renta o Compra cada app funciona de una forma más sencilla, y el apartado “Más detalles” de cada una te dice exactamente cómo.";

/** Las preguntas que un dueño de salón le haría a un vendedor, ya respondidas. */
export type PreguntaFrecuente = {
  pregunta: string;
  respuesta: string;
  /** Enlace interno opcional al final de la respuesta (p. ej. al aviso legal). */
  enlace?: { href: string; texto: string };
};

export const preguntasFrecuentes: PreguntaFrecuente[] = [
  {
    pregunta: "¿Mis invitados tienen que instalar algo o registrarse?",
    respuesta:
      "Nada. Abren la cámara de su celular, apuntan al código y listo: se abre en el navegador como cualquier página. Sin bajar apps, sin crear cuentas. Si saben tomar una foto, saben usar esto.",
  },
  {
    pregunta: "¿Y si un invitado no le sabe al celular o no trae smartphone?",
    respuesta:
      "No pasa nada: la fiesta sigue igual para él. Nadie está obligado a participar — los que quieran suben fotos, piden canciones o juegan, y los demás disfrutan como siempre.",
  },
  {
    pregunta: "¿Qué necesito yo en mi salón? ¿Tengo que saber de computadoras?",
    respuesta:
      "Solo necesitas internet en tu salón; la pantalla para proyectar es opcional. Y no, no necesitas saber de computadoras: con el Servicio gestionado yo monto todo y lo opero esa noche.",
  },
  {
    pregunta: "¿Quién monta todo el día del evento?",
    respuesta:
      "Depende de cómo contrates. Con el Servicio gestionado, yo: llego, monto, lo opero durante la fiesta y te entrego todo al final. Con Renta o Compra lo manejas tú, y te enseño cómo — está pensado para que cualquiera pueda.",
  },
  {
    pregunta: "¿Puedo verlo funcionando antes de contratar?",
    respuesta:
      "Sí, ahorita mismo: todos los botones de “Ver demo” de esta página abren las apps de verdad, funcionando. Pruébalas como si fueras un invitado — eso mismo verían tus clientes.",
  },
  {
    pregunta: "¿Yo puedo cobrarle esto a mis clientes?",
    respuesta:
      "Claro, y esa es la idea: lo agregas a tus paquetes de boda o XV años con el precio que tú decidas. Para tu salón es un ingreso extra y algo que el salón de enfrente no ofrece.",
  },
  {
    pregunta: "¿Qué pasa con las fotos y los datos de mis clientes cuando acaba el evento?",
    respuesta:
      "Se entregan completos al anfitrión del evento y después se borran de la plataforma. No se usan para nada más.",
    enlace: { href: "/legal/privacidad", texto: "Leer el aviso de privacidad" },
  },
  {
    pregunta: "¿Con cuánta anticipación lo contrato y en cuánto queda listo?",
    respuesta:
      "Un evento con Servicio gestionado se arma en unos pocos días: con una semana de anticipación vamos sobrados. El sitio web a tu medida tarda más porque se diseña para tu marca. Al cotizar por WhatsApp te doy fechas exactas para tu caso.",
  },
];
