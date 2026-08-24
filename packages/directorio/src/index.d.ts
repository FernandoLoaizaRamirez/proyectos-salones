/** Tipos de @salones/directorio (los datos viven en index.mjs, JS plano). */

export type AppId =
  | "sitio-salon"
  | "catalogo"
  | "portal"
  | "album-fotos"
  | "invitaciones"
  | "rsvp"
  | "pases-qr"
  | "mesas"
  | "mi-mesa"
  | "muro"
  | "playlist"
  | "photobooth"
  | "dinamicas"
  | "brindis";

/** Dominio de producción de cada app (Vercel). */
export declare const URLS: Record<AppId, string>;

export type ModuloDirectorio = {
  /** La clave de la función vendible (features / entitlements). */
  clave: string;
  nombre: string;
  descripcion: string;
  /** NOMBRE del icono de lucide; el consumidor lo convierte en componente. */
  icono: string;
  /** La app que sirve este módulo cuando es puente. */
  app: AppId;
  /** Ruta del invitado dentro de esa app. */
  rutaInvitado: string;
  /** Si el módulo ya vive dentro del portal, su ruta interna (manda). */
  rutaInterna?: string;
};

/** Los módulos del invitado, en el orden de la historia de la celebración. */
export declare const MODULOS: ModuloDirectorio[];

/** La base (dominio) de la app que sirve un módulo como puente. */
export declare function baseDeModulo(modulo: ModuloDirectorio): string;
