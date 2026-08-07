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
  /**
   * Lee la colección ENTERA (por páginas si hace falta). Es la que hay que usar
   * cuando no puede faltar nada: contar, exportar o ENTREGAR el álbum al
   * cliente. A cambio es la cara: no la pongas en un sondeo.
   */
  listar<T extends ItemSync>(evento: string, coleccion: string): Promise<T[]>;
  /** Agrega o actualiza (por id) un item. */
  guardar<T extends ItemSync>(evento: string, coleccion: string, item: T): Promise<void>;
  /** Elimina un item por id. */
  eliminar(evento: string, coleccion: string, id: string): Promise<void>;
  /**
   * Se suscribe a los cambios de una colección. Llama a `cb` de inmediato y
   * cada vez que algo cambia. Devuelve una función para cancelar.
   *
   * ⚠️ Entrega los MÁS RECIENTES, no necesariamente todos: en un evento enorme
   * se corta por arriba para que el teléfono de un invitado no se descargue
   * miles de fotos cada pocos segundos. **Para entregar o exportar usa
   * `listar`**, que sí trae la colección completa.
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
    tipo: string,
  ): Promise<string | null> {
    const guardado = cache.get(evento);
    if (guardado && guardado.expira - MARGEN_MS > Date.now()) return guardado.pase;
    try {
      const res = await fetch(ruta, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        // Un 404 es "la migración todavía no está aplicada": esperado durante
        // el despliegue y no es noticia. Un 5xx sí lo es.
        if (res.status >= 500) reportar(tipo, `la base respondió ${res.status}`, evento);
        return null;
      }
      const pase = (await res.json()) as unknown;
      if (typeof pase !== "string" || !pase) return null;
      cache.set(evento, { pase, expira: caducidadDe(pase) });
      return pase;
    } catch (e) {
      // Sin red. Se sigue por el header viejo mientras exista.
      reportar(tipo, e instanceof Error ? e.message : "sin conexión", evento);
      return null;
    }
  }

  const obtenerPase = (evento: string) =>
    pedirPase(pases, evento, rpcPase, { p_codigo: evento }, "sin-pase");

  /**
   * Pase de ANFITRIÓN: solo se puede pedir si este dispositivo tiene la llave
   * privada del evento (el `&a=` de su enlace). Sin llave no se pide nada —
   * ni siquiera se molesta al servidor.
   */
  async function obtenerPaseAnfitrion(evento: string): Promise<string | null> {
    const clave = claveAnfitrion(evento);
    // "demo" es la vitrina pública: cualquiera modera la demostración.
    if (!clave && evento !== "demo") return null;
    return pedirPase(
      pasesAnfitrion,
      evento,
      rpcPaseAnfitrion,
      { p_codigo: evento, p_clave: clave ?? "" },
      "sin-pase-anfitrion",
    );
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

  /* ---- Cuánto se baja y cada cuánto (arreglado el 6 ago 2026) --------------
   * ANTES: la consulta no llevaba NINGÚN tope y el sondeo la repetía cada 3 s.
   * O sea, cada teléfono conectado se descargaba el álbum, el muro o la lista
   * ENTERA veinte veces por minuto. Cuanta más gente participaba, peor iba la
   * fiesta: justo al revés de lo que tiene que pasar.
   *
   * El reparto que hay ahora:
   *   · `suscribir` (lo que corre en el teléfono de cada invitado) trae solo los
   *     más recientes, hasta TOPE_SONDEO.
   *   · `listar` (lo que se usa para CONTAR y para ENTREGAR el álbum al cliente)
   *     sigue trayendo la colección entera, por páginas. Ahí la exactitud manda
   *     sobre la velocidad: entregar 200 fotos de 800 sería perder recuerdos.
   *
   * El tope NO es silencioso: si una colección lo alcanza, queda un aviso en el
   * diagnóstico para que se sepa que hay contenido que no se está mostrando. */
  const TOPE_SONDEO = 500;
  const PAGINA = 1000;
  /** Freno de mano por si algo se descontrola; no debería alcanzarse nunca. */
  const TOPE_ABSOLUTO = 20000;

  const INTERVALO_MS = 3000;
  /** Con la pestaña de fondo nadie está mirando: se sondea mucho más despacio. */
  const INTERVALO_OCULTO_MS = 15000;

  /* ---- Direcciones de lectura que caducan (migración 0013) ----------------
   * Lo que se guarda en la base deja de ser una dirección que sirva sola y pasa
   * a ser una REFERENCIA. Al mostrar el álbum se pide a `media-ver` que firme
   * esas referencias, y las direcciones que devuelve caducan en una hora.
   *
   * Se cachean: un álbum se repinta cada 3 segundos por el sondeo, y sin caché
   * se pediría la firma de cientos de fotos cada vez.
   *
   * Es NO-FATAL: si la función no está desplegada, devuelve nada y quien llama
   * se queda con las direcciones de siempre —que siguen sirviendo mientras el
   * bucket sea público—. Por eso esto se puede desplegar ANTES del corte. */
  const funcMediaVer = `${raiz}/functions/v1/media-ver`;
  const MARGEN_FIRMA_MS = 60_000;
  const firmadas = new Map<string, { url: string; expira: number }>();

  firmarMedios = async (evento, rutas) => {
    const ahora = Date.now();
    const salida: Record<string, string> = {};
    const faltan: string[] = [];

    for (const ruta of rutas) {
      const guardada = firmadas.get(ruta);
      if (guardada && guardada.expira - MARGEN_FIRMA_MS > ahora) salida[ruta] = guardada.url;
      else faltan.push(ruta);
    }
    if (faltan.length === 0) return salida;

    try {
      const [pase, paseAnfitrion] = await Promise.all([
        obtenerPase(evento),
        obtenerPaseAnfitrion(evento),
      ]);
      if (!pase && !paseAnfitrion) return salida;

      // De 500 en 500, que es el tope de la función.
      for (let i = 0; i < faltan.length; i += 500) {
        const tanda = faltan.slice(i, i + 500);
        const res = await fetch(funcMediaVer, {
          method: "POST",
          headers: {
            ...auth,
            ...(pase ? { "x-evento-pase": pase } : {}),
            ...(paseAnfitrion ? { "x-evento-anfitrion": paseAnfitrion } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rutas: tanda }),
        });
        if (!res.ok) return salida; // sin firmar: quien llama usa lo de siempre

        const dato = (await res.json()) as {
          direcciones?: Record<string, string>;
          vigenciaSeg?: number;
        };
        const vigencia = (dato.vigenciaSeg ?? 3600) * 1000;
        for (const [ruta, url] of Object.entries(dato.direcciones ?? {})) {
          firmadas.set(ruta, { url, expira: Date.now() + vigencia });
          salida[ruta] = url;
        }
      }
    } catch {
      /* sin red o función sin desplegar: se sigue con lo de siempre */
    }
    return salida;
  };

  /* ---- Diagnóstico (migración 0012) ---------------------------------------
   * Antes, cuando algo fallaba aquí dentro, el error se tragaba en silencio
   * (`catch {}`) y el invitado veía "no hay mensajes" en vez de un aviso. El
   * operador se enteraba por un WhatsApp enfadado. Ahora los fallos dejan
   * rastro.
   *
   * REGLAS DE ESTE REPORTE:
   *   · Nunca lanza ni bloquea: si el propio reporte falla, se calla. Un fallo
   *     al avisar de un fallo no puede tumbar la app de un invitado.
   *   · Agrupa: el sondeo reintenta cada 3 segundos; sin agrupar, un invitado
   *     con mala cobertura generaría cientos de avisos. Se manda uno por tipo
   *     cada 5 minutos, con la cuenta de las veces que se repitió.
   *   · **Nunca manda la query de la dirección**: ahí viaja la llave de
   *     anfitrión (`?a=…`). Solo el `pathname`. El servidor la vuelve a
   *     recortar por si acaso. */
  const funcDiagnostico = `${raiz}/functions/v1/diagnostico`;
  const VENTANA_MS = 5 * 60_000;
  const vistos = new Map<string, { desde: number; veces: number }>();

  /** Qué app es esta, para saber dónde mirar. Del nombre del host, sin más. */
  const appActual = (): string => {
    if (!hayNavegador()) return "servidor";
    return window.location.hostname.replace(/\.vercel\.app$/, "").slice(0, 40) || "desconocida";
  };

  function reportar(tipo: string, mensaje: string, evento?: string): void {
    if (!hayNavegador()) return;
    const ahora = Date.now();
    const clave = `${tipo}:${evento ?? ""}`;
    const previo = vistos.get(clave);

    if (previo && ahora - previo.desde < VENTANA_MS) {
      previo.veces += 1;
      return; // dentro de la ventana: se cuenta y se calla
    }
    const veces = previo ? previo.veces : 1;
    vistos.set(clave, { desde: ahora, veces: 1 });

    try {
      void fetch(funcDiagnostico, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          app: appActual(),
          tipo,
          evento,
          mensaje: String(mensaje).slice(0, 500),
          // SOLO la ruta. La query lleva la llave de anfitrión.
          ruta: window.location.pathname,
          navegador: navigator.userAgent.slice(0, 200),
          repeticiones: veces,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* avisar de un fallo nunca puede provocar otro */
    }
  }

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

  /** Una tanda, de la más reciente a la más antigua. */
  async function pedir<T extends ItemSync>(
    evento: string,
    coleccion: string,
    limite: number,
    desplazamiento = 0,
  ): Promise<T[]> {
    const q =
      `${base}?${filtro(evento, coleccion)}&select=id,dato&order=creado.desc` +
      `&limit=${limite}&offset=${desplazamiento}`;
    const res = await fetch(q, { headers: await headersDe(evento) });
    if (!res.ok) throw new Error(`sync/listar ${res.status}`);
    const filas = (await res.json()) as { id: string; dato: Record<string, unknown> }[];
    return filas.map((f) => ({ ...(f.dato ?? {}), id: f.id })) as T[];
  }

  /**
   * La colección ENTERA, tanda a tanda. Es lo que usa `listar`, y por tanto lo
   * que usan el contador del panel y la entrega del álbum al cliente: ahí no
   * puede faltar ni una foto.
   */
  async function pedirTodo<T extends ItemSync>(evento: string, coleccion: string): Promise<T[]> {
    const todo: T[] = [];
    for (let desplazamiento = 0; ; desplazamiento += PAGINA) {
      const tanda = await pedir<T>(evento, coleccion, PAGINA, desplazamiento);
      todo.push(...tanda);
      if (tanda.length < PAGINA || todo.length >= TOPE_ABSOLUTO) return todo;
    }
  }

  return {
    nombre: "servidor",
    async listar(evento, coleccion) {
      return pedirTodo(evento, coleccion);
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
    /**
     * ⚠️ BORRAR "BIEN" NO SIGNIFICA HABER BORRADO (arreglado el 6 ago 2026).
     *
     * PostgREST responde **204 aunque no haya borrado ni una fila**: si la RLS
     * la filtra —lo que pasa cuando no llega el pase de ANFITRIÓN, que desde el
     * corte de la 0009 es el único que permite borrar— la petición sale
     * perfecta y el contenido sigue ahí. Comprobado en producción: un DELETE
     * de un id inventado devuelve 204 igual.
     *
     * Se veía así: el anfitrión quitaba un mensaje subido de tono desde su
     * teléfono, la app no decía nada, y el mensaje seguía en la pantalla grande.
     *
     * Ahora se pide que devuelva lo borrado. Si no devuelve nada, se comprueba
     * si la fila sigue existiendo: si ya no está, el borrado vale igual
     * (alguien se adelantó, o fue un doble toque); si sigue ahí, es que no hubo
     * permiso y hay que decirlo.
     */
    async eliminar(evento, coleccion, id) {
      const q = `${base}?${filtro(evento, coleccion)}&id=eq.${encodeURIComponent(id)}`;
      const res = await fetch(q, {
        method: "DELETE",
        headers: { ...(await headersDe(evento)), Prefer: "return=representation" },
      });
      if (!res.ok) throw new Error(`sync/eliminar ${res.status}`);

      const cuerpo = await res.text();
      let borradas: unknown = [];
      try {
        borradas = cuerpo ? JSON.parse(cuerpo) : [];
      } catch {
        borradas = [];
      }
      if (Array.isArray(borradas) && borradas.length > 0) return;

      const comprobar = await fetch(`${q}&select=id`, { headers: await headersDe(evento) });
      if (!comprobar.ok) return; // no se pudo comprobar: no se inventa un fallo
      const quedan = (await comprobar.json()) as unknown;
      if (Array.isArray(quedan) && quedan.length > 0) {
        reportar("borrado-sin-permiso", `${coleccion}: la fila sigue ahí`, evento);
        throw new Error("sync/eliminar sin-permiso");
      }
    },
    suscribir(evento, coleccion, cb) {
      let vivo = true;
      let firma = "";
      let temporizador: number | null = null;

      const revisar = async () => {
        try {
          const items = await pedir(evento, coleccion, TOPE_SONDEO);
          if (!vivo) return;
          // El tope NUNCA es silencioso: si se alcanza, hay contenido que el
          // invitado no está viendo y tiene que quedar constancia.
          if (items.length >= TOPE_SONDEO) {
            reportar(
              "coleccion-llena",
              `${coleccion}: se muestran los ${TOPE_SONDEO} más recientes`,
              evento,
            );
          }
          const nueva = JSON.stringify(items);
          if (nueva !== firma) {
            firma = nueva;
            cb(items as never);
          }
        } catch (e) {
          // Se reintenta en el próximo ciclo, pero ya no en silencio: si el
          // muro de una boda lleva 10 minutos sin actualizarse, tiene que
          // quedar constancia de por qué.
          reportar(
            "sondeo",
            `${coleccion}: ${e instanceof Error ? e.message : "fallo de red"}`,
            evento,
          );
        }
      };

      /**
       * Se reprograma sola en vez de usar un intervalo fijo, por dos razones:
       * el ritmo cambia según la pestaña esté a la vista o de fondo, y así
       * nunca se solapan dos sondeos si la red va lenta.
       */
      const programar = () => {
        if (!vivo || !hayNavegador()) return;
        const espera =
          typeof document !== "undefined" && document.hidden ? INTERVALO_OCULTO_MS : INTERVALO_MS;
        temporizador = window.setTimeout(() => {
          void revisar().then(programar);
        }, espera);
      };

      /** Al volver a la pestaña, refrescar YA en vez de esperar al turno. */
      const alCambiarVisibilidad = () => {
        if (typeof document !== "undefined" && !document.hidden) void revisar();
      };

      void revisar();
      programar();
      if (hayNavegador() && typeof document !== "undefined") {
        document.addEventListener("visibilitychange", alCambiarVisibilidad);
      }

      return () => {
        vivo = false;
        if (temporizador !== null) window.clearTimeout(temporizador);
        if (hayNavegador() && typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", alCambiarVisibilidad);
        }
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
      if (!res.ok) {
        // Aquí sí importa avisar: una foto que no sube es un recuerdo perdido.
        reportar("subida", `el almacén respondió ${res.status}`, evento);
        throw new Error(`sync/subir ${res.status}`);
      }
      return `${almacen}/object/public/${BUCKET}/${ruta}`;
    },
  };
}

/* ================================================================== */
/* Selector — elige el proveedor según haya (o no) datos de servidor   */
/* ================================================================== */

let cache: ProveedorSync | null = null;

/**
 * Lo pone `crearProveedorServidor` al construirse. En modo local no hay nada
 * que firmar (las fotos son direcciones temporales de este navegador).
 */
let firmarMedios: ((evento: string, rutas: string[]) => Promise<Record<string, string>>) | null =
  null;

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

/* ================================================================== */
/* Fotos y videos: de referencia guardada a dirección que caduca       */
/* ================================================================== */

/**
 * En la base se guarda la dirección pública del archivo. Después del corte de
 * la migración 0013 esa dirección deja de servir por sí sola y pasa a ser solo
 * una REFERENCIA: de ella se saca la ruta dentro del almacén.
 *
 * Se hace así —deducir la ruta— en vez de guardar un campo nuevo, para no tener
 * que tocar las fotos que ya están guardadas. Una migración de datos sobre los
 * álbumes de eventos reales es justo el riesgo que no merece la pena correr
 * cuando el dato ya está ahí dentro.
 */
const RUTA_EN_DIRECCION = /\/storage\/v1\/object\/public\/media\/(.+)$/;

function rutaDe(direccion: string): string | null {
  return RUTA_EN_DIRECCION.exec(direccion)?.[1] ?? null;
}

/**
 * Convierte las direcciones guardadas en direcciones que se pueden mostrar.
 *
 * Devuelve un mapa `direcciónGuardada → direcciónParaMostrar`. Lo que no sea
 * del almacén central (las fotos de ejemplo en `/img/...`, los `data:` del muro,
 * los `blob:` del modo local) **se devuelve tal cual**: esta función nunca
 * estropea una dirección que ya funcionaba.
 *
 * NO FALLA NUNCA: si la función del servidor no está desplegada o no hay red,
 * devuelve las originales, que siguen sirviendo mientras el bucket sea público.
 * Por eso las apps se pueden desplegar antes de hacer el corte.
 */
export async function resolverMedios(
  evento: string,
  direcciones: string[],
): Promise<Record<string, string>> {
  obtenerSync(); // asegura que el proveedor esté construido
  const salida: Record<string, string> = {};
  const porRuta = new Map<string, string[]>();

  for (const direccion of direcciones) {
    salida[direccion] = direccion; // por defecto, tal cual
    const ruta = rutaDe(direccion);
    if (!ruta) continue;
    const lista = porRuta.get(ruta);
    if (lista) lista.push(direccion);
    else porRuta.set(ruta, [direccion]);
  }

  if (!firmarMedios || porRuta.size === 0) return salida;

  const firmadas = await firmarMedios(evento, [...porRuta.keys()]);
  for (const [ruta, url] of Object.entries(firmadas)) {
    for (const original of porRuta.get(ruta) ?? []) salida[original] = url;
  }
  return salida;
}

/* ================================================================== */
/* Bajar los medios de un evento — la ENTREGA al cliente               */
/* ================================================================== */

/**
 * Lo mínimo que hace falta para bajar un archivo. A propósito NO es el tipo
 * `Foto` de ninguna app: así cada una pasa el suyo sin tener que convertirlo.
 */
export type MedioDescargable = { nombre: string; url: string };

/** Cómo terminó una descarga masiva. */
export type ResultadoDescarga = { guardadas: number; fallidas: number; cancelada: boolean };

/** Nombre numerado, para que no se pisen al guardarse en la misma carpeta. */
function nombreDeArchivo(medio: MedioDescargable, indice: number): string {
  const limpio = (medio.nombre || "recuerdo").replace(/[\\/:*?"<>|]/g, "-").slice(-60);
  return `${String(indice + 1).padStart(3, "0")}-${limpio}`;
}

/**
 * Descarga una lista de fotos y videos, archivo por archivo.
 *
 * ⚠️ POR QUÉ NO BASTA CON UN ENLACE `<a download>` (el fallo que esto arregla):
 *   El navegador **ignora el atributo `download` cuando el archivo es de otro
 *   dominio** —y el almacén siempre lo es—, así que en vez de guardarlo lo ABRE
 *   en una pestaña. Encima, disparar muchos enlaces seguidos hace que el
 *   navegador bloquee casi todos por parecer ventanas emergentes. Resultado: el
 *   salón creía haber entregado la boda y no había bajado ni un archivo.
 *   Bajándolo aquí (fetch → blob) el archivo llega de verdad, y además se puede
 *   COMPROBAR si llegó, que es lo que permite bloquear el borrado si algo falló.
 *
 * Va de uno en uno, avisando del avance y dejando cancelar: una boda pueden ser
 * cientos de archivos y hacerlo todo de golpe tumba la pestaña.
 *
 * Vivía en `apps/catalogo/src/lib/album.ts`; se subió aquí para que la usen
 * también las apps del invitado en vez de reimplementarla mal.
 */
export async function descargarMedios(
  medios: MedioDescargable[],
  alAvanzar: (hechas: number, total: number) => void,
  seguir: () => boolean,
): Promise<ResultadoDescarga> {
  let guardadas = 0;
  let fallidas = 0;
  let cancelada = false;

  for (let i = 0; i < medios.length; i++) {
    if (!seguir()) {
      cancelada = true;
      break;
    }
    const medio = medios[i];
    if (!medio) continue;
    try {
      const res = await fetch(medio.url);
      if (!res.ok) throw new Error(`descarga ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreDeArchivo(medio, i);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      guardadas++;
    } catch {
      fallidas++;
    }
    alAvanzar(i + 1, medios.length);
    // Un respiro entre archivos: el navegador encola mejor y no se atraganta.
    await new Promise((r) => setTimeout(r, 150));
  }

  return { guardadas, fallidas, cancelada };
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
