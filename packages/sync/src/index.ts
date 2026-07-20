/**
 * @salones/sync — Cimientos del "lugar central" (servicio gestionado).
 *
 * Da a TODAS las apps una forma común de compartir "colecciones" por evento
 * (los mensajes del muro, las canciones de la playlist, las confirmaciones de
 * RSVP…) sin que cada app reinvente la sincronización.
 *
 * Tiene un INTERRUPTOR automático:
 *   - SIN datos de servidor  → proveedor LOCAL: se sincroniza entre pestañas del
 *     mismo dispositivo (localStorage + BroadcastChannel). Es el modo de la demo
 *     y de los planes Renta / Compra.
 *   - CON datos de servidor  → proveedor SERVIDOR: se sincroniza entre los
 *     teléfonos de TODOS los invitados (Supabase). Es el modo del servicio
 *     GESTIONADO. Se enciende con dos variables de entorno públicas:
 *         NEXT_PUBLIC_SUPABASE_URL
 *         NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Las apps NO cambian su código para pasar de un modo al otro: solo se agregan
 * (o no) esas dos variables. Así, "juntar el contenido de muchos teléfonos" se
 * activa cuando el salón contrata el servicio gestionado.
 */

/** Todo item compartido tiene, al menos, un id único. */
export type ItemSync = { id: string; [clave: string]: unknown };

export interface ProveedorSync {
  /** "local" (mismo dispositivo) o "servidor" (todos los teléfonos). */
  readonly nombre: "local" | "servidor";
  /** Lee todos los items actuales de una colección de un evento. */
  listar<T extends ItemSync>(evento: string, coleccion: string): Promise<T[]>;
  /** Agrega o actualiza (por id) un item. */
  guardar<T extends ItemSync>(evento: string, coleccion: string, item: T): Promise<void>;
  /** Elimina un item por id. */
  eliminar(evento: string, coleccion: string, id: string): Promise<void>;
  /**
   * Se suscribe a los cambios de una colección. Llama a `cb` con la lista
   * completa de inmediato y cada vez que algo cambia. Devuelve una función para
   * cancelar la suscripción.
   */
  suscribir<T extends ItemSync>(
    evento: string,
    coleccion: string,
    cb: (items: T[]) => void,
  ): () => void;
  /**
   * Sube un archivo (foto o video) y devuelve la URL para mostrarlo.
   * En LOCAL devuelve una URL temporal del propio navegador (dura mientras la
   * pestaña esté abierta: la demo de un solo dispositivo). En SERVIDOR lo guarda
   * en el almacenamiento central (bucket "media") y la URL sirve para todos.
   */
  subirArchivo(evento: string, nombre: string, blob: Blob, tipo: string): Promise<string>;
}

/** Saca una extensión de archivo razonable del nombre o del tipo MIME. */
function extensionDe(nombre: string, tipo: string): string {
  const porNombre = /\.([a-z0-9]{1,5})$/i.exec(nombre)?.[1];
  if (porNombre) return porNombre.toLowerCase();
  const porTipo = tipo.split("/")[1]?.replace(/[^a-z0-9]/gi, "");
  return (porTipo || "bin").toLowerCase();
}

/* ================================================================== */
/* Proveedor LOCAL — mismo dispositivo, en vivo entre pestañas         */
/* ================================================================== */

const hayNavegador = () => typeof window !== "undefined";
const claveDe = (evento: string, coleccion: string) => `salones:${evento}:${coleccion}`;

function leerLocal<T extends ItemSync>(k: string): T[] {
  if (!hayNavegador()) return [];
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function escribirLocal<T extends ItemSync>(k: string, items: T[]): boolean {
  if (!hayNavegador()) return false;
  try {
    window.localStorage.setItem(k, JSON.stringify(items));
    return true;
  } catch {
    // Almacenamiento lleno (p. ej. demasiadas fotos): lo reporta quien llama.
    return false;
  }
}

function crearProveedorLocal(): ProveedorSync {
  // Un canal por clave para avisar a OTRAS pestañas del mismo navegador…
  const canales = new Map<string, BroadcastChannel>();
  // …y un juego de escuchas por clave para avisar a la MISMA pestaña
  // (BroadcastChannel no se entrega a sí mismo).
  const escuchas = new Map<string, Set<() => void>>();

  const canalDe = (k: string): BroadcastChannel | null => {
    if (!hayNavegador() || typeof BroadcastChannel === "undefined") return null;
    let c = canales.get(k);
    if (!c) {
      c = new BroadcastChannel(k);
      canales.set(k, c);
    }
    return c;
  };
  const avisar = (k: string) => {
    escuchas.get(k)?.forEach((fn) => fn());
    canalDe(k)?.postMessage("cambio");
  };

  return {
    nombre: "local",
    async listar(evento, coleccion) {
      return leerLocal(claveDe(evento, coleccion));
    },
    async guardar(evento, coleccion, item) {
      const k = claveDe(evento, coleccion);
      const resto = leerLocal(k).filter((x) => x.id !== item.id);
      if (!escribirLocal(k, [item as ItemSync, ...resto])) {
        throw new Error("almacenamiento-lleno");
      }
      avisar(k);
    },
    async eliminar(evento, coleccion, id) {
      const k = claveDe(evento, coleccion);
      escribirLocal(
        k,
        leerLocal(k).filter((x) => x.id !== id),
      );
      avisar(k);
    },
    suscribir(evento, coleccion, cb) {
      const k = claveDe(evento, coleccion);
      const emitir = () => cb(leerLocal(k));
      emitir(); // estado inicial

      let set = escuchas.get(k);
      if (!set) {
        set = new Set();
        escuchas.set(k, set);
      }
      set.add(emitir);

      const canal = canalDe(k);
      const onMsg = () => emitir();
      const onStorage = (e: StorageEvent) => {
        if (e.key === k) emitir();
      };
      canal?.addEventListener("message", onMsg);
      if (hayNavegador()) window.addEventListener("storage", onStorage);

      return () => {
        set?.delete(emitir);
        canal?.removeEventListener("message", onMsg);
        if (hayNavegador()) window.removeEventListener("storage", onStorage);
      };
    },
    async subirArchivo(_evento, _nombre, blob) {
      if (!hayNavegador()) throw new Error("sin-navegador");
      // Demo local: una URL temporal de este navegador (no viaja a otros).
      return URL.createObjectURL(blob);
    },
  };
}

/* ================================================================== */
/* Llave del ANFITRIÓN — la segunda llave, la de quien organiza        */
/* ================================================================== */

/**
 * Hay DOS llaves por evento:
 *
 *   - La del INVITADO  → el código del evento (`?e=`). Va en el QR, la tiene
 *     todo el mundo. Sirve para ver el evento y para aportar (firmar el muro,
 *     pedir una canción, subir una foto, confirmar asistencia).
 *
 *   - La del ANFITRIÓN → una clave privada (`&a=`) que solo recibe quien
 *     organiza. Es la única que permite BORRAR y moderar.
 *
 * Antes de esto, el código del evento permitía borrar, así que cualquier
 * invitado podía vaciar el álbum o el muro de la boda entera. Ver la migración
 * `supabase/migrations/0009_llave_anfitrion.sql`.
 *
 * La clave se recuerda en el navegador POR EVENTO, para que el anfitrión no
 * tenga que volver a pegar su enlace cada vez que cambia de pantalla.
 */
const claveAnfitrionKey = (evento: string) => `salones:anfitrion:${evento}`;

export function claveAnfitrion(evento: string): string | null {
  if (!hayNavegador()) return null;
  const enUrl = new URLSearchParams(window.location.search).get("a");
  if (enUrl && /^[a-zA-Z0-9_-]{8,128}$/.test(enUrl)) {
    try {
      window.localStorage.setItem(claveAnfitrionKey(evento), enUrl);
    } catch {
      /* almacenamiento lleno o bloqueado: se usa la de la URL igualmente */
    }
    return enUrl;
  }
  try {
    return window.localStorage.getItem(claveAnfitrionKey(evento));
  } catch {
    return null;
  }
}

/**
 * Olvida la llave de anfitrión guardada en ESTE dispositivo. Útil cuando el
 * enlace se abrió en una pantalla prestada (la del salón, un proyector).
 */
export function olvidarClaveAnfitrion(evento: string): void {
  if (!hayNavegador()) return;
  try {
    window.localStorage.removeItem(claveAnfitrionKey(evento));
  } catch {
    /* nada que olvidar */
  }
}

/* ================================================================== */
/* Proveedor SERVIDOR — todos los teléfonos, vía Supabase (REST)       */
/* ================================================================== */

/**
 * Habla con la API REST de Supabase (PostgREST) y refresca cada pocos segundos
 * (sondeo). Es sencillo, sin dependencias, y de sobra para un muro o una lista
 * de canciones. Más adelante se puede subir a "tiempo real" por websocket.
 *
 * Tabla esperada en Supabase (ver docs/SERVICIO-GESTIONADO.md):
 *   items(evento text, coleccion text, id text primary key, dato jsonb,
 *         creado timestamptz default now())
 */
function crearProveedorServidor(url: string, anon: string): ProveedorSync {
  const raiz = url.replace(/\/$/, "");
  const base = `${raiz}/rest/v1/items`;
  const rpcPase = `${raiz}/rest/v1/rpc/emitir_pase`;
  const rpcPaseAnfitrion = `${raiz}/rest/v1/rpc/emitir_pase_anfitrion`;
  // La llave puede ser "legacy" (un JWT que empieza con eyJ) o del formato nuevo
  // (sb_publishable_...). El encabezado Authorization solo admite JWTs; con las
  // llaves nuevas basta el encabezado apikey.
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };

  /* ---- Pase firmado por evento (migración x-evento → pase, Fase 1) ---------
   * Antes de cada petición se pide (y se cachea) un PASE al servidor:
   * `<evento>.<caducidad>.<firma>`, que emite la función `emitir_pase` de la
   * propia base de datos (ver migración 0006). Viaja en el encabezado
   * `x-evento-pase` y la RLS lo verifica ahí mismo (firma + caducidad), así que
   * no se puede forjar y caduca solo. Es NO-FATAL: si el servidor todavía no lo
   * tiene, se sigue por el candado viejo (encabezado x-evento), de modo que esta
   * versión es segura de desplegar ANTES de aplicar la migración. */
  const pases = new Map<string, { pase: string; expira: number }>();
  const pasesAnfitrion = new Map<string, { pase: string; expira: number }>();
  const MARGEN_MS = 60_000; // renovar 1 min antes de que caduque

  /**
   * La caducidad viaja dentro del propio pase:
   *   invitado  → <evento>.<exp>.<firma>
   *   anfitrión → a.<evento>.<exp>.<firma>   (la "a." del principio lo delata)
   */
  const caducidadDe = (pase: string): number => {
    const partes = pase.split(".");
    const exp = Number(partes[0] === "a" ? partes[2] : partes[1]);
    return Number.isFinite(exp) ? exp * 1000 : 0;
  };

  /** Pide un pase (de invitado o de anfitrión) y lo cachea hasta que caduque. */
  async function pedirPase(
    cache: Map<string, { pase: string; expira: number }>,
    evento: string,
    ruta: string,
    cuerpo: Record<string, string>,
  ): Promise<string | null> {
    const guardado = cache.get(evento);
    if (guardado && guardado.expira - MARGEN_MS > Date.now()) return guardado.pase;
    try {
      const res = await fetch(ruta, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) return null;
      const pase = (await res.json()) as unknown;
      if (typeof pase !== "string" || !pase) return null;
      cache.set(evento, { pase, expira: caducidadDe(pase) });
      return pase;
    } catch {
      return null; // sin red o migración sin aplicar: se sigue por el header
    }
  }

  const obtenerPase = (evento: string) =>
    pedirPase(pases, evento, rpcPase, { p_codigo: evento });

  /**
   * Pase de ANFITRIÓN: solo se puede pedir si este dispositivo tiene la llave
   * privada del evento (el `&a=` de su enlace). Sin llave no se pide nada —
   * ni siquiera se molesta al servidor.
   */
  async function obtenerPaseAnfitrion(evento: string): Promise<string | null> {
    const clave = claveAnfitrion(evento);
    // "demo" es la vitrina pública: cualquiera modera la demostración.
    if (!clave && evento !== "demo") return null;
    return pedirPase(pasesAnfitrion, evento, rpcPaseAnfitrion, {
      p_codigo: evento,
      p_clave: clave ?? "",
    });
  }

  /**
   * La llave del evento viaja de VARIAS formas mientras dura la transición: el
   * encabezado viejo (x-evento), el PASE de invitado (x-evento-pase) y, si este
   * dispositivo es el del anfitrión, su PASE DE ANFITRIÓN (x-evento-anfitrion),
   * que es el único que permite borrar una vez hecho el corte.
   * Ver docs/MIGRACION-TOKEN-FIRMADO.md y docs/LLAVE-ANFITRION.md.
   */
  const headersDe = async (evento: string): Promise<Record<string, string>> => {
    const [pase, paseAnfitrion] = await Promise.all([
      obtenerPase(evento),
      obtenerPaseAnfitrion(evento),
    ]);
    return {
      ...auth,
      "x-evento": evento,
      ...(pase ? { "x-evento-pase": pase } : {}),
      ...(paseAnfitrion ? { "x-evento-anfitrion": paseAnfitrion } : {}),
      "Content-Type": "application/json",
    };
  };
  /** Almacenamiento central de fotos/videos (bucket "media" del proyecto). */
  const almacen = `${raiz}/storage/v1`;
  const BUCKET = "media";
  const INTERVALO_MS = 3000;

  /* ---- Permiso de subida (migración 0010) ---------------------------------
   * Antes de subir una foto o un video se pide permiso a la Edge Function
   * `media-subir`, presentando el pase del evento. Ella verifica el pase y
   * devuelve una URL de subida firmada para una ruta que decide ELLA: así el
   * navegador no puede escribir en la carpeta de otro evento.
   *
   * Es NO-FATAL, igual que el pase: si la función todavía no está desplegada,
   * devuelve null y se sigue por la subida directa de siempre. Por eso esta
   * versión es segura de desplegar ANTES de tocar nada en el servidor. */
  const funcMediaSubir = `${raiz}/functions/v1/media-subir`;

  type PermisoSubida = { subirUrl: string; urlPublica: string };

  async function pedirPermisoSubida(
    evento: string,
    nombre: string,
    tipo: string,
  ): Promise<PermisoSubida | null> {
    try {
      const [pase, paseAnfitrion] = await Promise.all([
        obtenerPase(evento),
        obtenerPaseAnfitrion(evento),
      ]);
      // Sin ningún pase no hay nada que presentar: se deja para el camino viejo.
      if (!pase && !paseAnfitrion) return null;

      const res = await fetch(funcMediaSubir, {
        method: "POST",
        headers: {
          ...auth,
          ...(pase ? { "x-evento-pase": pase } : {}),
          ...(paseAnfitrion ? { "x-evento-anfitrion": paseAnfitrion } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, tipo }),
      });
      if (!res.ok) return null;
      const dato = (await res.json()) as Partial<PermisoSubida>;
      if (typeof dato.subirUrl !== "string" || typeof dato.urlPublica !== "string") return null;
      return { subirUrl: dato.subirUrl, urlPublica: dato.urlPublica };
    } catch {
      return null; // sin red o función sin desplegar
    }
  }

  const filtro = (evento: string, coleccion: string) =>
    `evento=eq.${encodeURIComponent(evento)}&coleccion=eq.${encodeURIComponent(coleccion)}`;

  async function pedir<T extends ItemSync>(evento: string, coleccion: string): Promise<T[]> {
    const q = `${base}?${filtro(evento, coleccion)}&select=id,dato&order=creado.desc`;
    const res = await fetch(q, { headers: await headersDe(evento) });
    if (!res.ok) throw new Error(`sync/listar ${res.status}`);
    const filas = (await res.json()) as { id: string; dato: Record<string, unknown> }[];
    return filas.map((f) => ({ ...(f.dato ?? {}), id: f.id })) as T[];
  }

  return {
    nombre: "servidor",
    async listar(evento, coleccion) {
      return pedir(evento, coleccion);
    },
    async guardar(evento, coleccion, item) {
      const { id, ...dato } = item;
      const res = await fetch(base, {
        method: "POST",
        headers: {
          ...(await headersDe(evento)),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({ evento, coleccion, id, dato }),
      });
      if (!res.ok) throw new Error(`sync/guardar ${res.status}`);
    },
    async eliminar(evento, coleccion, id) {
      const q = `${base}?${filtro(evento, coleccion)}&id=eq.${encodeURIComponent(id)}`;
      const res = await fetch(q, { method: "DELETE", headers: await headersDe(evento) });
      if (!res.ok) throw new Error(`sync/eliminar ${res.status}`);
    },
    suscribir(evento, coleccion, cb) {
      let vivo = true;
      let firma = "";
      const revisar = async () => {
        try {
          const items = await pedir(evento, coleccion);
          if (!vivo) return;
          const nueva = JSON.stringify(items);
          if (nueva !== firma) {
            firma = nueva;
            cb(items as never);
          }
        } catch {
          /* error de red puntual: se reintenta en el próximo ciclo */
        }
      };
      revisar();
      const t = hayNavegador() ? window.setInterval(revisar, INTERVALO_MS) : null;
      return () => {
        vivo = false;
        if (t !== null) window.clearInterval(t);
      };
    },
    async subirArchivo(evento, nombre, blob, tipo) {
      const mime = tipo || "application/octet-stream";

      // Camino NUEVO: se pide permiso a la Edge Function `media-subir`, que
      // verifica el pase y decide ELLA la carpeta (ver migración 0010). Así el
      // navegador no puede escribir en la burbuja de otro evento.
      const permiso = await pedirPermisoSubida(evento, nombre, mime);
      if (permiso) {
        const res = await fetch(permiso.subirUrl, {
          method: "PUT",
          headers: { "Content-Type": mime },
          body: blob,
        });
        if (res.ok) return permiso.urlPublica;
        // Si la subida firmada falla, se intenta el camino viejo: mientras el
        // corte no esté hecho sigue abierto, y es mejor que perder la foto.
      }

      // Camino VIEJO (subida directa). Deja de funcionar en cuanto se corra el
      // corte de la 0010, que es justo el objetivo.
      const ruta = `${encodeURIComponent(evento)}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extensionDe(nombre, mime)}`;
      const [pase, paseAnfitrion] = await Promise.all([
        obtenerPase(evento),
        obtenerPaseAnfitrion(evento),
      ]);
      const res = await fetch(`${almacen}/object/${BUCKET}/${ruta}`, {
        method: "POST",
        headers: {
          ...auth,
          "x-evento": evento,
          ...(pase ? { "x-evento-pase": pase } : {}),
          ...(paseAnfitrion ? { "x-evento-anfitrion": paseAnfitrion } : {}),
          "Content-Type": mime,
        },
        body: blob,
      });
      if (!res.ok) throw new Error(`sync/subir ${res.status}`);
      return `${almacen}/object/public/${BUCKET}/${ruta}`;
    },
  };
}

/* ================================================================== */
/* Selector — elige el proveedor según haya (o no) datos de servidor   */
/* ================================================================== */

let cache: ProveedorSync | null = null;

/**
 * Devuelve el proveedor de sincronización activo: SERVIDOR si están puestas las
 * variables de entorno de Supabase, o LOCAL en caso contrario.
 */
export function obtenerSync(): ProveedorSync {
  if (cache) return cache;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cache = url && anon ? crearProveedorServidor(url, anon) : crearProveedorLocal();
  return cache;
}

/** ¿Está conectado al servidor central (servicio gestionado)? */
export function estaConectado(): boolean {
  return obtenerSync().nombre === "servidor";
}

/* ================================================================== */
/* Evento actual — cada evento vive en su propia "burbuja"             */
/* ================================================================== */

/**
 * Lee el código del evento desde el enlace (?e=...). Así cada evento real tiene
 * su propio espacio: el salón recibe enlaces como  /firmar?e=boda-garcia-x7k2
 * y su contenido no se mezcla con el de nadie más. Sin ?e= se usa el evento de
 * demostración ("demo"), que es el de las vitrinas públicas.
 *
 * El código funciona como una "llave por enlace": al ser aleatorio y difícil de
 * adivinar, solo quien recibió el enlace/QR puede ver o escribir ese evento.
 */
export function eventoActual(porDefecto = "demo"): string {
  if (!hayNavegador()) return porDefecto;
  const e = new URLSearchParams(window.location.search).get("e");
  // Solo letras, números y guiones, para que el código viaje limpio en el enlace.
  return e && /^[a-z0-9-]{1,60}$/i.test(e) ? e : porDefecto;
}

/**
 * Sufijo para propagar el evento actual a otros enlaces de la misma app
 * (p. ej. `${origin}/firmar${sufijoEvento()}`). Devuelve "" en el evento demo.
 */
export function sufijoEvento(): string {
  const e = eventoActual();
  return e === "demo" ? "" : `?e=${e}`;
}

/**
 * ¿Este dispositivo es el del ANFITRIÓN de este evento?
 *
 * Sirve para DIBUJAR la interfaz: mostrar u ocultar los botones de borrar y
 * moderar. **No es el candado.** El candado de verdad está en la base de datos
 * (migración 0009): aunque alguien fuerce la interfaz, el servidor rechaza el
 * borrado si no viene con un pase de anfitrión válido.
 *
 * Devuelve `true` cuando:
 *   - no hay servidor central (modo local: un solo dispositivo, quien lo usa es
 *     el anfitrión — es el modo de las demos y de los planes Renta / Compra), o
 *   - el evento es "demo" (la vitrina pública se puede moderar sin llave), o
 *   - este dispositivo tiene la llave privada del evento (llegó por `&a=`).
 */
export function esAnfitrion(evento: string = eventoActual()): boolean {
  if (!estaConectado()) return true;
  if (evento === "demo") return true;
  return claveAnfitrion(evento) !== null;
}

/**
 * Sufijo del enlace PRIVADO del anfitrión (`?e=…&a=…`), para propagar la llave
 * entre las pantallas de la misma app. Devuelve el sufijo normal si este
 * dispositivo no tiene llave, para no inventar una.
 *
 * ⚠️ Este enlace NO se comparte con los invitados: quien lo tenga puede borrar.
 */
export function sufijoAnfitrion(evento: string = eventoActual()): string {
  const clave = claveAnfitrion(evento);
  if (!clave) return sufijoEvento();
  return `?e=${evento}&a=${clave}`;
}
