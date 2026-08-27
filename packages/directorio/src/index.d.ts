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

/** Las secciones en que se agrupa la experiencia del invitado. */
export type GrupoClave = "asistencia" | "fiesta" | "informacion";

export type GrupoDirectorio = {
  clave: GrupoClave;
  /** Nombre de cara al invitado: "Mi asistencia", "Vive el evento"… */
  nombre: string;
};

/** Las secciones, en el orden en que se viven. */
export declare const GRUPOS: GrupoDirectorio[];

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
  /** La sección de la experiencia a la que pertenece. */
  grupo: GrupoClave;
};

/** Los módulos del invitado, en el orden de la historia de la celebración. */
export declare const MODULOS: ModuloDirectorio[];

/** La base (dominio) de la app que sirve un módulo como puente. */
export declare function baseDeModulo(modulo: ModuloDirectorio): string;

/** El grupo de un módulo, con su nombre de cara al invitado. */
export declare function grupoDeModulo(modulo: ModuloDirectorio): GrupoDirectorio;
