/**
 * Edge Function `evento-cierre` — entregar y cerrar un evento.
 *
 * QUÉ RESUELVE:
 *   El aviso de privacidad promete que, al cerrar un evento, el salón puede
 *   pedir la entrega de todo el material y su borrado. Hasta ahora eso no
 *   existía: no había forma de sacar el contenido completo de un evento ni de
 *   borrarlo. Una promesa por escrito que no se puede cumplir es peor que no
 *   haberla hecho.
 *
 *   Además, el borrado limpia los archivos HUÉRFANOS: hasta hoy, quitar una foto
 *   borraba su fila pero dejaba el archivo en el almacén para siempre.
 *
 * DOS OPERACIONES, DOS NIVELES DE PERMISO (decisión de diseño):
 *
 *   GET  ?e=<codigo>  → INVENTARIO. Todo lo que hay en el evento, para
 *                       descargarlo. Basta el pase de ANFITRIÓN: es material de
 *                       los novios y tienen derecho a llevárselo.
 *
 *   POST {e, confirmar} → BORRADO. Irreversible. Exige la SESIÓN del staff del
 *                       salón (rol dueño o administrador), no el pase de
 *                       anfitrión. Borrar una boda entera no puede colgar de la
 *                       misma llave que sirve para moderar un mensaje: esa la
 *                       tienen los novios y viaja en un enlace de WhatsApp.
 *
 * ORDEN DEL BORRADO (importa): primero los ARCHIVOS y al final las FILAS. Si
 * algo falla a medias, quedan filas apuntando a archivos que ya no están —
 * molesto pero visible y recuperable. Al revés quedarían archivos huérfanos sin
 * índice: imposibles de encontrar y de cobrar espacio.
 *
 * Se despliega PÚBLICA (`--no-verify-jwt`) porque ella misma verifica quién
 * llama, con dos llaves distintas según la operación.
 * Runbook: docs/CIERRE-DE-EVENTO.md
 */

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET = "media";
const ROLES_QUE_PUEDEN_BORRAR = ["owner", "admin"];

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-evento-pase, x-evento-anfitrion",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const cabecerasServicio = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
};

async function rest<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/${ruta}`, {
    ...init,
    headers: { ...cabecerasServicio, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`rest ${ruta} → ${res.status}`);
  return (res.status === 204 ? null : await res.json()) as T;
}

async function rpc(nombre: string, cuerpo: Record<string, unknown>): Promise<unknown> {
  return await rest(`rpc/${nombre}`, { method: "POST", body: JSON.stringify(cuerpo) });
}

/* ================================================================== */
/* Quién llama                                                         */
/* ================================================================== */

type Evento = { id: string; codigo: string; nombre: string; tenant_id: string; estado: string };

async function buscarEvento(codigo: string): Promise<Evento | null> {
  const filas = await rest<Evento[]>(
    `events?codigo=eq.${encodeURIComponent(codigo)}&select=id,codigo,nombre,tenant_id,estado`,
  );
  return filas[0] ?? null;
}

/** El pase de anfitrión abre el inventario de SU evento y solo de ese. */
async function esAnfitrionDe(req: Request, codigo: string): Promise<boolean> {
  const pase = req.headers.get("x-evento-anfitrion") ?? "";
  if (!pase) return false;
  const evento = await rpc("evento_del_pase_anfitrion", { p_pase: pase });
  return typeof evento === "string" && evento === codigo;
}

/**
 * Quién es el staff que llama, según su sesión. Se verifica el token contra
 * Supabase y se lee la identidad de `app_metadata` (la convención que puso el
 * paso 1.1b y que usa la RLS de la 0008). Devuelve null si no hay sesión válida.
 *
 * OJO CON EL ORDEN: esto se comprueba ANTES de buscar el evento. Así una
 * petición de borrado sin sesión se rechaza sin llegar a mirar —ni mucho menos
 * tocar— ningún dato. También permite probar el rechazo sin arriesgar nada.
 */
async function identidadStaff(req: Request): Promise<{ tenantId: string; rol: string } | null> {
  const cabecera = req.headers.get("authorization") ?? "";
  const token = cabecera.toLowerCase().startsWith("bearer ") ? cabecera.slice(7) : "";
  // La llave publishable viaja en `Authorization` en algunos clientes: no es
  // una sesión y no debe confundirse con una.
  if (!token || token === SERVICE_ROLE || token.startsWith("sb_")) return null;

  const res = await fetch(`${URL_SUPABASE}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const usuario = (await res.json()) as { app_metadata?: { tenant_id?: string; rol?: string } };
  const tenantId = usuario.app_metadata?.tenant_id;
  if (!tenantId) return null;
  return { tenantId, rol: usuario.app_metadata?.rol ?? "" };
}

/* ================================================================== */
/* Inventario                                                          */
/* ================================================================== */

type Item = { id: string; coleccion: string; dato: Record<string, unknown>; creado: string };

/** Lista TODOS los archivos de la carpeta del evento, paginando. */
async function listarArchivos(codigo: string): Promise<{ nombre: string; tamano: number }[]> {
  const encontrados: { nombre: string; tamano: number }[] = [];
  const LIMITE = 100;
  for (let offset = 0; ; offset += LIMITE) {
    const res = await fetch(`${URL_SUPABASE}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: cabecerasServicio,
      body: JSON.stringify({ prefix: `${codigo}/`, limit: LIMITE, offset }),
    });
    if (!res.ok) throw new Error(`listar archivos → ${res.status}`);
    const lote = (await res.json()) as { name: string; metadata?: { size?: number } }[];
    for (const o of lote) {
      encontrados.push({ nombre: `${codigo}/${o.name}`, tamano: o.metadata?.size ?? 0 });
    }
    if (lote.length < LIMITE) return encontrados;
    // Tope de seguridad: 5000 archivos por evento.
    if (encontrados.length >= 5000) return encontrados;
  }
}

async function inventario(ev: Evento) {
  const [items, archivos] = await Promise.all([
    rest<Item[]>(
      `items?evento=eq.${encodeURIComponent(ev.codigo)}&select=id,coleccion,dato,creado&order=creado.asc`,
    ),
    listarArchivos(ev.codigo),
  ]);

  const porColeccion: Record<string, number> = {};
  for (const it of items) porColeccion[it.coleccion] = (porColeccion[it.coleccion] ?? 0) + 1;

  return {
    evento: { codigo: ev.codigo, nombre: ev.nombre, estado: ev.estado },
    generado: new Date().toISOString(),
    resumen: {
      registros: items.length,
      porColeccion,
      archivos: archivos.length,
      bytes: archivos.reduce((s, a) => s + a.tamano, 0),
    },
    registros: items,
    archivos: archivos.map((a) => ({
      ...a,
      url: `${URL_SUPABASE}/storage/v1/object/public/${BUCKET}/${a.nombre}`,
    })),
  };
}

/* ================================================================== */
/* Borrado                                                             */
/* ================================================================== */

async function borrarTodo(ev: Evento) {
  // 1) Los ARCHIVOS primero (incluidos los huérfanos que nadie referencia ya).
  const archivos = await listarArchivos(ev.codigo);
  let borrados = 0;
  const LOTE = 100;
  for (let i = 0; i < archivos.length; i += LOTE) {
    const prefixes = archivos.slice(i, i + LOTE).map((a) => a.nombre);
    const res = await fetch(`${URL_SUPABASE}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: cabecerasServicio,
      body: JSON.stringify({ prefixes }),
    });
    if (!res.ok) throw new Error(`borrar archivos → ${res.status}`);
    borrados += prefixes.length;
  }

  // 2) Las FILAS después: si algo falla arriba, el índice sigue existiendo.
  await rest(`items?evento=eq.${encodeURIComponent(ev.codigo)}`, { method: "DELETE" });

  // 3) El evento queda CERRADO: `emitir_pase` deja de dar pases, así que los
  //    enlaces que circulan por WhatsApp dejan de abrir nada.
  await rest(`events?id=eq.${ev.id}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "cerrado" }),
  });

  return { archivosBorrados: borrados, evento: ev.codigo };
}

/* ================================================================== */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!URL_SUPABASE || !SERVICE_ROLE) return json({ error: "función sin configurar" }, 500);

  try {
    /* ---- INVENTARIO (pase de anfitrión) --------------------------------- */
    if (req.method === "GET") {
      const codigo = new URL(req.url).searchParams.get("e") ?? "";
      if (!CODIGO_VALIDO.test(codigo)) return json({ error: "código inválido" }, 400);

      const ev = await buscarEvento(codigo);
      if (!ev) return json({ error: "evento no encontrado" }, 404);

      let permitido = await esAnfitrionDe(req, codigo);
      if (!permitido) {
        // El staff del salón también puede ver el inventario de SUS eventos.
        const staff = await identidadStaff(req);
        permitido = staff !== null && staff.tenantId === ev.tenant_id;
      }
      if (!permitido) return json({ error: "sin permiso para este evento" }, 403);

      return json(await inventario(ev));
    }

    /* ---- BORRADO (sesión del staff, dueño o administrador) --------------- */
    if (req.method === "POST") {
      let cuerpo: { e?: unknown; confirmar?: unknown };
      try {
        cuerpo = await req.json();
      } catch {
        return json({ error: "cuerpo inválido" }, 400);
      }

      const codigo = typeof cuerpo.e === "string" ? cuerpo.e : "";
      if (!CODIGO_VALIDO.test(codigo)) return json({ error: "código inválido" }, 400);

      // Confirmación explícita: hay que repetir el código del evento. Evita el
      // borrado por un clic accidental o por una petición mal formada.
      if (cuerpo.confirmar !== codigo) {
        return json({ error: "falta confirmar con el código del evento" }, 400);
      }

      // LA SESIÓN, ANTES QUE NADA. Sin ella no se mira ni se toca ningún dato.
      const staff = await identidadStaff(req);
      if (!staff) {
        return json({ error: "hace falta iniciar sesión como staff del salón" }, 403);
      }
      if (!ROLES_QUE_PUEDEN_BORRAR.includes(staff.rol)) {
        return json({ error: "hace falta ser dueño o administrador del salón" }, 403);
      }

      const ev = await buscarEvento(codigo);
      if (!ev) return json({ error: "evento no encontrado" }, 404);
      if (ev.tenant_id !== staff.tenantId) {
        return json({ error: "este evento no es de tu salón" }, 403);
      }

      return json(await borrarTodo(ev));
    }

    return json({ error: "método no permitido" }, 405);
  } catch (e) {
    console.error("evento-cierre:", e instanceof Error ? e.message : e);
    return json({ error: "la operación no se pudo completar" }, 500);
  }
});
