/**
 * Tipos del SISTEMA DE TEMAS: la identidad heredada salón → evento → módulo.
 *
 * La cascada tiene tres capas y una regla:
 *
 *   tokens.css (base neutra, compilada)
 *     └─ TemaSalon   ← fila de `tenant_branding` (colores, superficie, fuentes)
 *          └─ TemaEvento ← fila de `event_branding` (color, portada, voz)
 *               └─ módulo: hereda TODO; jamás introduce colores de marca.
 *
 * Las capas 2 y 3 se FUSIONAN en TypeScript puro (`resolverTema`) y se emiten
 * como UN solo juego de variables CSS (`temaAVariables`) en UN solo scope. No
 * se anidan dos scopes: las derivadas (--muted sale de tinta+fondo, --ring del
 * acento YA resuelto) cruzan capas, y con dos contenedores la capa del evento
 * no podría recalcular lo derivado de la del salón.
 *
 * `TemaResuelto` es lo ÚNICO que consumen los componentes: quien pinta no sabe
 * (ni le importa) qué campo vino del salón, del evento o del tema base.
 */

/**
 * Clave de la pareja tipográfica, de la lista curada de `fuentes.ts`.
 * En la base se guarda SOLO la clave (nunca una URL): una clave desconocida
 * cae a "sistema" y jamás se interpola en un `<link>`.
 */
export type ClaveFuentes =
  | "clasica" // Cormorant Garamond + Jost + Parisienne — la del sitio/demo
  | "editorial" // Playfair Display + Source Sans 3 + Pinyon Script
  | "moderna" // Fraunces + Inter (sin script)
  | "romantica" // Libre Caslon Text + Nunito Sans + Great Vibes
  | "festiva" // Marcellus + Karla (sin script)
  | "sistema"; // sin descarga: pilas del sistema

/**
 * Identidad del SALÓN (fila de `tenant_branding`). Superconjunto compatible
 * del `BrandingSalon` histórico: los 8 call-sites existentes compilan sin
 * tocarse. Todo lo opcional que falte hereda el tema base.
 */
export type TemaSalon = {
  /** Nombre del salón (marca). Lo único obligatorio. */
  nombre: string;
  /** URL del logo. Si falta, la UI cae a un monograma con la inicial. */
  logoUrl?: string;
  /** La web del salón, para volver a ella desde la experiencia. */
  sitioUrl?: string;
  /** Color principal de la marca. → `--primary` */
  primario?: string;
  /** Texto sobre el principal. → `--primary-fg` (si falta, se DERIVA). */
  primarioTexto?: string;
  /** Acento para detalles y foco. → `--accent` y `--ring` */
  acento?: string;
  /**
   * Las DOS perillas de superficie del tema claro. De ellas se derivan las
   * nueve variables de superficie (tarjetas, bordes, apagados) Y el modo
   * oscuro entero ("gala nocturna", como la /premium del sitio) — sin guardar
   * una segunda paleta ni exponer nueve campos imposibles de validar.
   */
  fondo?: string;
  /** La tinta del texto sobre `fondo`. */
  tinta?: string;
  /** Redondeo de esquinas (p. ej. "0.4rem"). → `--radius` */
  radio?: string;
  /**
   * Pareja tipográfica del salón. Es `string` A PROPÓSITO (no `ClaveFuentes`):
   * este tipo describe FRONTERAS (filas de la base, respuestas de red) donde el
   * valor puede ser cualquier cosa. El ÚNICO dueño de la normalización es
   * `resolverTema` (vía `parejaDe`: clave desconocida → "sistema"); si el tipo
   * exigiera la unión, cada frontera pre-sanearía por su cuenta y habría tres
   * copias de la misma coerción.
   */
  fuentes?: string;
  /** Con qué modo arranca la experiencia del invitado ("claro"/"oscuro"; cualquier otro valor = claro). */
  esquema?: string;
};

/**
 * Personalización de UN evento (fila de `event_branding`). Deliberadamente
 * angosta: el evento cambia color, foto y voz — NO el radio, ni el logo, ni la
 * superficie, que son identidad del salón.
 */
export type TemaEvento = {
  /** Color principal DEL EVENTO (pisa al del salón). */
  primario?: string;
  /** Secundario del evento (pisa al acento del salón). */
  acento?: string;
  /** Foto de portada del hero. NO es variable CSS: la pinta un componente. */
  portadaUrl?: string;
  /** "A·R" — texto corto para el sello del evento. */
  monograma?: string;
  /** "Nos encantará celebrar contigo" — la voz del evento. */
  frase?: string;
  /** Pareja tipográfica del evento; si falta hereda la del salón. (String crudo: normaliza `resolverTema`.) */
  fuentes?: string;
};

/**
 * Datos del evento que la cáscara pinta (nombre, fecha) — no son CSS.
 * Los tres campos compartidos se TOMAN de `TemaEvento` (Pick): un campo nuevo
 * allá aparece aquí solo, sin tercera copia que olvidar.
 */
export type DatosEventoTema = Pick<TemaEvento, "monograma" | "frase" | "portadaUrl"> & {
  nombre?: string;
  /** Fecha ISO (yyyy-mm-dd) si se conoce. */
  fechaISO?: string;
};

/**
 * El resultado de la fusión: lo ÚNICO que consumen los componentes.
 * Todos sus colores ya pasaron por `esColorSeguro` (los inválidos se
 * descartaron y heredan la capa anterior).
 */
export type TemaResuelto = {
  salon: { nombre: string; logoUrl?: string; sitioUrl?: string };
  evento?: DatosEventoTema;
  colores: {
    primario?: string;
    primarioTexto?: string;
    acento?: string;
    acentoTexto?: string;
    fondo?: string;
    tinta?: string;
  };
  radio?: string;
  /** Ya resuelta (evento ?? salón ?? "sistema"). */
  fuentes: ClaveFuentes;
  esquema: "claro" | "oscuro";
  /** Para badges tipo "Datos de ejemplo" y para decidir cachés. */
  origen: "servidor" | "demo";
};
