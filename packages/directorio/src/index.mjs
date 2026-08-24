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
 * LOS MÓDULOS DE LA EXPERIENCIA DEL INVITADO, en el orden de la HISTORIA de la
 * celebración: primero lo de antes de la fiesta (la invitación, confirmar,
 * encontrar su mesa) y luego la fiesta misma (fotos, mensajes, música, juegos,
 * photobooth, brindis). El portal pinta sus tarjetas y el menú "Experiencias"
 * de aquí; el pie usa este orden para el "Siguiente →".
 *
 * `clave` es la MISMA de features/entitlements (el contrato comercial).
 * `rutaInterna` = el módulo ya vive DENTRO del portal (strangler-fig);
 * sin ella, es un PUENTE a su app (`app` + `rutaInvitado`).
 */
export const MODULOS = [
  {
    clave: "invitacion",
    nombre: "Invitación",
    descripcion: "La invitación del evento, siempre a la mano.",
    icono: "Mail",
    app: "invitaciones",
    rutaInvitado: "/",
  },
  {
    clave: "rsvp",
    nombre: "Confirmar asistencia",
    descripcion: "Dinos si vienes y cuántos serán.",
    icono: "CalendarCheck",
    app: "rsvp",
    rutaInvitado: "/",
    rutaInterna: "/rsvp",
  },
  {
    clave: "mesas",
    nombre: "Mi mesa",
    descripcion: "Encuentra tu mesa y con quién la compartes.",
    icono: "Armchair",
    app: "mi-mesa",
    rutaInvitado: "/",
    rutaInterna: "/mesas",
  },
  {
    clave: "album",
    nombre: "Álbum de fotos",
    descripcion: "Sube tus fotos y míralas todas juntas.",
    icono: "Camera",
    app: "album-fotos",
    rutaInvitado: "/",
    rutaInterna: "/album",
  },
  {
    clave: "muro",
    nombre: "Muro de mensajes",
    descripcion: "Deja tu mensaje y tu firma para los novios.",
    icono: "BookHeart",
    app: "muro",
    rutaInvitado: "/firmar",
    rutaInterna: "/muro",
  },
  {
    clave: "playlist",
    nombre: "Playlist",
    descripcion: "Pide tu canción y vota las favoritas.",
    icono: "ListMusic",
    app: "playlist",
    rutaInvitado: "/pedir",
    rutaInterna: "/playlist",
  },
  {
    clave: "dinamicas",
    nombre: "Dinámicas y juegos",
    descripcion: "Trivia, bingo y rompehielos desde tu teléfono.",
    icono: "Gamepad2",
    app: "dinamicas",
    rutaInvitado: "/jugar",
    rutaInterna: "/dinamicas",
  },
  {
    clave: "photobooth",
    nombre: "Photobooth",
    descripcion: "Tómate una foto con los marcos del evento.",
    icono: "Aperture",
    app: "photobooth",
    rutaInvitado: "/",
  },
  {
    clave: "brindis",
    nombre: "Brindis en video",
    descripcion: "Graba un mensaje en video para los festejados.",
    icono: "Wine",
    app: "brindis",
    rutaInvitado: "/",
  },
];

/** La base (dominio) de la app que sirve un módulo como puente. */
export function baseDeModulo(modulo) {
  return URLS[modulo.app];
}
