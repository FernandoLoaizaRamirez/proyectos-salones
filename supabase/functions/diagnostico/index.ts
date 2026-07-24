/**
 * Edge Function `diagnostico` — que los fallos dejen rastro, y poder comprobar
 * que un evento funciona ANTES de la boda.
 *
 * DOS COSAS:
 *
 *   POST  → REGISTRAR un fallo. La llaman las apps cuando algo va mal. Es
 *           publica (cualquier invitado puede fallar) y por eso desconfia de
 *           todo lo que recibe: recorta, valida y tira lo que no reconoce.
 *
 *   GET ?e=<codigo> → REVISION del evento + ultimos fallos. Exige sesion de
 *           staff. Comprueba de verdad, de punta a punta, lo mismo que hara el
 *           telefono de un invitado: pedir pase, leer contenido, pedir permiso
 *           de subida. Sirve para mirarlo la manana del evento en vez de
 *           enterarse por un WhatsApp enfadado a las once de la noche.
 *
 * ⚠️ LO QUE NUNCA SE GUARDA: contenido de invitados (nombres, mensajes, fotos)
 *    ni la QUERY de la direccion. Esto ultimo importa mucho: la llave de
 *    anfitrion viaja como `?a=<clave>`, asi que guardar direcciones completas
 *    convertiria este registro en una lista de llaves para borrar bodas. El
 *    cliente manda la ruta ya recortada y AQUI SE RECORTA OTRA VEZ.
 *
 * Se despliega PUBLICA (`--no-verify-jwt`): ella verifica quien llama.
 * Runbook: docs/DIAGNOSTICO.md
 */

// `texto` y `soloRuta` viven en `_shared/` para que se puedan PROBAR sin Deno ni
// Supabase (este archivo arranca un servidor al cargarse y no se puede importar
// desde una prueba). `soloRuta` es la defensa que impide que la llave de
// anfitrión acabe guardada. Ver tests/seguridad/validar.test.ts.
import { soloRuta, texto } from "../_shared/validar.ts";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// La revisión se hace con la llave PÚBLICA a propósito: para comprobar lo mismo
// que verá el teléfono de un invitado, no lo que ve un administrador. Supabase
// la inyecta en la función, así que no hace falta pasarla por la dirección.
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  // OJO: no basta con mirar el 204. Cuando se pide `Prefer: return=minimal`,
  // PostgREST responde **201 con el cuerpo VACÍO**, y `res.json()` sobre un
  // cuerpo vacío lanza — el registro de fallos moría con 500 justo por esto.
  // Se lee como texto y solo se parsea si vino algo.
  const cuerpo = await res.text();
  return (cuerpo ? JSON.parse(cuerpo) : null) as T;
}

/* ================================================================== */
/* POST — registrar un fallo                                           */
/* ================================================================== */

async function registrar(cuerpo: Record<string, unknown>): Promise<Response> {
  const app = texto(cuerpo.app, 40);
  const tipo = texto(cuerpo.tipo, 40);
  if (!app || !tipo) return json({ error: "faltan app y tipo" }, 400);

  const evento = texto(cuerpo.evento, 60);
  const repeticiones = Number(cuerpo.repeticiones);

  await rest("app_errores", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      app,
      tipo,
      evento: evento && CODIGO_VALIDO.test(evento) ? evento : null,
      mensaje: texto(cuerpo.mensaje, 500),
      ruta: soloRuta(cuerpo.ruta),
      navegador: texto(cuerpo.navegador, 200),
      repeticiones:
        Number.isFinite(repeticiones) && repeticiones > 0 ? Math.min(repeticiones, 10000) : 1,
    }),
  });

  return json({ registrado: true });
}

/* ================================================================== */
/* GET — revision del evento (sesion de staff)                         */
/* ================================================================== */

async function identidadStaff(req: Request): Promise<{ tenantId: string } | null> {
  const cabecera = req.headers.get("authorization") ?? "";
  const token = cabecera.toLowerCase().startsWith("bearer ") ? cabecera.slice(7) : "";
  if (!token || token === SERVICE_ROLE || token.startsWith("sb_")) return null;

  const res = await fetch(`${URL_SUPABASE}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const usuario = (await res.json()) as { app_metadata?: { tenant_id?: string } };
  const tenantId = usuario.app_metadata?.tenant_id;
  return tenantId ? { tenantId } : null;
}

type Prueba = { nombre: string; ok: boolean; detalle: string };

/**
 * La revision de verdad: hace lo mismo que hara el telefono de un invitado, con
 * la llave publica, y cuenta que pasa en cada paso.
 */
async function revisar(codigo: string): Promise<Prueba[]> {
  const pruebas: Prueba[] = [];
  const authPublica: Record<string, string> = {
    apikey: ANON,
    ...(ANON.startsWith("eyJ") ? { Authorization: `Bearer ${ANON}` } : {}),
  };

  // 1) El evento existe y esta activo
  const eventos = await rest<{ estado: string; nombre: string }[]>(
    `events?codigo=eq.${encodeURIComponent(codigo)}&select=estado,nombre`,
  );
  const evento = eventos[0];
  pruebas.push({
    nombre: "El evento existe y está activo",
    ok: Boolean(evento) && evento.estado === "activo",
    detalle: !evento
      ? "no existe ningún evento con ese código"
      : evento.estado === "activo"
        ? evento.nombre
        : `el evento está ${evento.estado}: no emitirá pases`,
  });

  // 2) La base emite pase de invitado
  let pase: string | null = null;
  try {
    const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/emitir_pase`, {
      method: "POST",
      headers: { ...authPublica, "Content-Type": "application/json" },
      body: JSON.stringify({ p_codigo: codigo }),
    });
    const dato = res.ok ? await res.json() : null;
    pase = typeof dato === "string" ? dato : null;
  } catch {
    pase = null;
  }
  pruebas.push({
    nombre: "Los invitados pueden obtener su pase",
    ok: Boolean(pase),
    detalle: pase ? "la base emite el pase correctamente" : "la base NO emite pase para este evento",
  });

  // 3) Con ese pase se puede leer el contenido
  if (pase) {
    try {
      const res = await fetch(
        `${URL_SUPABASE}/rest/v1/items?evento=eq.${encodeURIComponent(codigo)}&select=id&limit=1`,
        { headers: { ...authPublica, "x-evento-pase": pase } },
      );
      pruebas.push({
        nombre: "El contenido del evento se puede leer",
        ok: res.ok,
        detalle: res.ok ? "el candado deja pasar el pase" : `el servidor respondió ${res.status}`,
      });
    } catch {
      pruebas.push({
        nombre: "El contenido del evento se puede leer",
        ok: false,
        detalle: "no se pudo conectar",
      });
    }
  }

  // 4) Se puede pedir permiso de subida (si la funcion esta desplegada)
  if (pase) {
    try {
      const res = await fetch(`${URL_SUPABASE}/functions/v1/media-subir`, {
        method: "POST",
        headers: { ...authPublica, "x-evento-pase": pase, "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: "revision.jpg", tipo: "image/jpeg" }),
      });
      pruebas.push({
        nombre: "Se pueden subir fotos y videos",
        ok: res.ok,
        detalle: res.ok
          ? "el permiso de subida se concede"
          : res.status === 404
            ? "la función media-subir no está desplegada (se sube por el camino viejo)"
            : `el servidor respondió ${res.status}`,
      });
    } catch {
      pruebas.push({
        nombre: "Se pueden subir fotos y videos",
        ok: false,
        detalle: "no se pudo conectar",
      });
    }
  }

  return pruebas;
}

/* ================================================================== */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!URL_SUPABASE || !SERVICE_ROLE) return json({ error: "función sin configurar" }, 500);

  try {
    if (req.method === "POST") {
      let cuerpo: Record<string, unknown>;
      try {
        cuerpo = await req.json();
      } catch {
        return json({ error: "cuerpo inválido" }, 400);
      }
      return await registrar(cuerpo);
    }

    if (req.method === "GET") {
      const staff = await identidadStaff(req);
      if (!staff) return json({ error: "hace falta iniciar sesión como staff" }, 403);

      const params = new URL(req.url).searchParams;
      const codigo = params.get("e") ?? "";

      // Los eventos de SU salón. Los fallos se acotan a esos: un salón no ve
      // los problemas de otro.
      const suyos = await rest<{ codigo: string }[]>(
        `events?tenant_id=eq.${staff.tenantId}&select=codigo`,
      );
      const codigos = suyos.map((e) => e.codigo);

      if (codigo && !codigos.includes(codigo)) {
        return json({ error: "ese evento no es de tu salón" }, 403);
      }

      const filtro = codigo
        ? `evento=eq.${encodeURIComponent(codigo)}`
        : codigos.length > 0
          ? `evento=in.(${codigos.map((c) => encodeURIComponent(c)).join(",")})`
          : "evento=is.null&id=is.null"; // sin eventos: sin errores que enseñar

      const [errores, pruebas] = await Promise.all([
        rest<unknown[]>(`app_errores?${filtro}&select=*&order=creado.desc&limit=50`),
        codigo ? revisar(codigo) : Promise.resolve([]),
      ]);

      // Aprovechamos la visita para tirar lo viejo: no hace falta programar
      // ninguna tarea (que el plan gratis tampoco tiene).
      rest("rpc/limpiar_errores_viejos", { method: "POST", body: "{}" }).catch(() => {});

      return json({ evento: codigo || null, pruebas, errores });
    }

    return json({ error: "método no permitido" }, 405);
  } catch (e) {
    console.error("diagnostico:", e instanceof Error ? e.message : e);
    return json({ error: "no se pudo completar" }, 500);
  }
});
