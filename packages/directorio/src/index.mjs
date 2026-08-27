/**
 * @salones/directorio — LA ÚNICA LISTA de dónde vive cada app y qué módulos
 * componen la experiencia del invitado.
 *
 * POR QUÉ EXISTE: los dominios de producción estaban copiados en TRES lugares
 * (apps/catalogo/src/lib/catalogo.ts, apps/portal/src/lib/modulos.ts y
 * scripts/comprobar-apps-al-dia.mjs) y los manifests de los módulos en el
 * portal. Cambiar una URL era cambiarla tres veces — y el propio script lo
 * admitía en un comentario. Ahora los tres importan de aquí.
 *
 * POR QUÉ ES UN PAQUETE PROPIO (y no parte de @salones/config): config es
 * devDependency de LAS CATORCE apps, y el portero de Vercel reconstruye por
 * dependencias declaradas — una URL cambiada ahí costaría 14 builds. Este
 * paquete lo declaran solo quienes lo usan (catalogo, portal y la raíz para el
 * script): una URL cambiada cuesta 2.
 *
 * POR QUÉ ES .mjs PLANO: lo importa `node` a pelo (el script de comprobación),
 * sin transpilar. Los tipos van al lado, en index.d.ts.
 *
 * REGLA: aquí van DATOS, no React. Los iconos son NOMBRES de lucide; cada
 * consumidor los convierte en componentes con su propio mapa. Así el script de
 * node no arrastra React, y el sitio no arrastra nada.
 */

/** Dominio de producción de cada app (Vercel). */
export const URLS = {
  "sitio-salon": "https://salones-teal.vercel.app",
  catalogo: "https://suite-salones.vercel.app",
  portal: "https://proyectos-salones-portal.vercel.app",
  "album-fotos": "https://album-fotos-gamma.vercel.app",
  invitaciones: "https://invitaciones-weld.vercel.app",
  rsvp: "https://rsvp-umber-pi.vercel.app",
  "pases-qr": "https://pases-qr.vercel.app",
  mesas: "https://proyectos-salones-mesas.vercel.app",
  "mi-mesa": "https://proyectos-salones-mi-mesa.vercel.app",
  muro: "https://proyectos-salones-muro.vercel.app",
  playlist: "https://proyectos-salones-playlist.vercel.app",
  photobooth: "https://proyectos-salones-photobooth.vercel.app",
  dinamicas: "https://proyectos-salones-dinamicas.vercel.app",
  brindis: "https://proyectos-salones-brindis.vercel.app",
};

/**
 * LAS SECCIONES DE LA EXPERIENCIA, en el orden en que se viven: lo tuyo antes
 * de la fiesta, la fiesta misma, y la información práctica. El portal agrupa
 * sus tarjetas y el menú "Experiencias" con esta lista; los módulos declaran a
 * cuál pertenecen con `grupo`.
 */
export const GRUPOS = [
  { clave: "asistencia", nombre: "Mi asistencia" },
  { clave: "fiesta", nombre: "Vive el evento" },
  { clave: "informacion", nombre: "Información" },
];

/**
 * LOS MÓDULOS DE LA EXPERIENCIA DEL INVITADO, en el orden de la HISTORIA de la
 * celebración: primero lo de antes de la fiesta (la invitación, confirmar, el
 * pase, encontrar su mesa), luego la fiesta misma (fotos, mensajes, música,
 * juegos, photobooth, brindis) y al final la información práctica (cronograma,
 * lugar, vestimenta, preguntas). El portal pinta sus tarjetas y el menú
 * "Experiencias" de aquí; el pie usa este orden para el "Siguiente →".
 *
 * `clave` es la MISMA de features/entitlements (el contrato comercial).
 * `rutaInterna` = el módulo ya vive DENTRO del portal (strangler-fig);
 * sin ella, es un PUENTE a su app (`app` + `rutaInvitado`). Los módulos que
 * NACIERON dentro del portal (pase e información) llevan `app: "portal"`.
 */
export const MODULOS = [
  {
    clave: "invitacion",
    nombre: "Invitación",
    descripcion: "La invitación del evento, siempre a la mano.",
    icono: "Mail",
    app: "invitaciones",
    rutaInvitado: "/",
    grupo: "asistencia",
  },
  {
    clave: "rsvp",
    nombre: "Confirmar asistencia",
    descripcion: "Dinos si vienes y cuántos serán.",
    icono: "CalendarCheck",
    app: "rsvp",
    rutaInvitado: "/",
    rutaInterna: "/rsvp",
    grupo: "asistencia",
  },
  {
    clave: "pase",
    nombre: "Mi pase",
    descripcion: "Tu boleto con QR para la entrada del evento.",
    icono: "QrCode",
    app: "portal",
    rutaInvitado: "/",
    rutaInterna: "/pase",
    grupo: "asistencia",
  },
  {
    clave: "mesas",
    nombre: "Mi mesa",
    descripcion: "Encuentra tu mesa y con quién la compartes.",
    icono: "Armchair",
    app: "mi-mesa",
    rutaInvitado: "/",
    rutaInterna: "/mesas",
    grupo: "asistencia",
  },
  {
    clave: "album",
    nombre: "Álbum de fotos",
    descripcion: "Sube tus fotos y míralas todas juntas.",
    icono: "Camera",
    app: "album-fotos",
    rutaInvitado: "/",
    rutaInterna: "/album",
    grupo: "fiesta",
  },
  {
    clave: "muro",
    nombre: "Muro de mensajes",
    descripcion: "Deja tu mensaje y tu firma para los novios.",
    icono: "BookHeart",
    app: "muro",
    rutaInvitado: "/firmar",
    rutaInterna: "/muro",
    grupo: "fiesta",
  },
  {
    clave: "playlist",
    nombre: "Playlist",
    descripcion: "Pide tu canción y vota las favoritas.",
    icono: "ListMusic",
    app: "playlist",
    rutaInvitado: "/pedir",
    rutaInterna: "/playlist",
    grupo: "fiesta",
  },
  {
    clave: "dinamicas",
    nombre: "Dinámicas y juegos",
    descripcion: "Trivia, bingo y rompehielos desde tu teléfono.",
    icono: "Gamepad2",
    app: "dinamicas",
    rutaInvitado: "/jugar",
    rutaInterna: "/dinamicas",
    grupo: "fiesta",
  },
  {
    clave: "photobooth",
    nombre: "Photobooth",
    descripcion: "Tómate una foto con los marcos del evento.",
    icono: "Aperture",
    app: "photobooth",
    rutaInvitado: "/",
    grupo: "fiesta",
  },
  {
    clave: "brindis",
    nombre: "Brindis en video",
    descripcion: "Graba un mensaje en video para los festejados.",
    icono: "Wine",
    app: "brindis",
    rutaInvitado: "/",
    grupo: "fiesta",
  },
  {
    clave: "cronograma",
    nombre: "Cronograma",
    descripcion: "El plan de la celebración, hora por hora.",
    icono: "CalendarClock",
    app: "portal",
    rutaInvitado: "/",
    rutaInterna: "/cronograma",
    grupo: "informacion",
  },
  {
    clave: "lugar",
    nombre: "Lugar y cómo llegar",
    descripcion: "Las sedes del evento, con mapa y direcciones.",
    icono: "MapPin",
    app: "portal",
    rutaInvitado: "/",
    rutaInterna: "/lugar",
    grupo: "informacion",
  },
  {
    clave: "vestimenta",
    nombre: "Código de vestimenta",
    descripcion: "Qué ponerte y la paleta de colores sugerida.",
    icono: "Shirt",
    app: "portal",
    rutaInvitado: "/",
    rutaInterna: "/vestimenta",
    grupo: "informacion",
  },
  {
    clave: "faq",
    nombre: "Preguntas frecuentes",
    descripcion: "Estacionamiento, niños, regalos: lo que todos preguntan.",
    icono: "CircleHelp",
    app: "portal",
    rutaInvitado: "/",
    rutaInterna: "/faq",
    grupo: "informacion",
  },
];

/** El grupo de un módulo, con su nombre de cara al invitado. */
export function grupoDeModulo(modulo) {
  return GRUPOS.find((g) => g.clave === modulo.grupo) ?? GRUPOS[0];
}

/** La base (dominio) de la app que sirve un módulo como puente. */
export function baseDeModulo(modulo) {
  return URLS[modulo.app];
}
