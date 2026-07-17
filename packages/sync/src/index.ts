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
  const base = `${url.replace(/\/$/, "")}/rest/v1/items`;
  // La llave puede ser "legacy" (un JWT que empieza con eyJ) o del formato nuevo
  // (sb_publishable_...). El encabezado Authorization solo admite JWTs; con las
  // llaves nuevas basta el encabezado apikey.
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };
  const headers: Record<string, string> = { ...auth, "Content-Type": "application/json" };
  /** Almacenamiento central de fotos/videos (bucket "media" del proyecto). */
  const almacen = `${url.replace(/\/$/, "")}/storage/v1`;
  const BUCKET = "media";
  const INTERVALO_MS = 3000;

  const filtro = (evento: string, coleccion: string) =>
    `evento=eq.${encodeURIComponent(evento)}&coleccion=eq.${encodeURIComponent(coleccion)}`;

  async function pedir<T extends ItemSync>(evento: string, coleccion: string): Promise<T[]> {
    const q = `${base}?${filtro(evento, coleccion)}&select=id,dato&order=creado.desc`;
    const res = await fetch(q, { headers });
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
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ evento, coleccion, id, dato }),
      });
      if (!res.ok) throw new Error(`sync/guardar ${res.status}`);
    },
    async eliminar(evento, coleccion, id) {
      const q = `${base}?${filtro(evento, coleccion)}&id=eq.${encodeURIComponent(id)}`;
      const res = await fetch(q, { method: "DELETE", headers });
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
      const ext = extensionDe(nombre, tipo);
      const ruta = `${encodeURIComponent(evento)}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const res = await fetch(`${almacen}/object/${BUCKET}/${ruta}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": tipo || "application/octet-stream" },
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
