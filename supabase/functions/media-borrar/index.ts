/**
 * Edge Function `media-borrar` — quitar una foto o video del álbum.
 *
 * QUÉ RESUELVE, Y POR QUÉ HACEN FALTA LAS DOS COSAS:
 *
 *   1. QUE EL INVITADO PUEDA QUITAR LO SUYO. Desde el corte de la 0009, borrar
 *      exige el pase de ANFITRIÓN, así que quien subía una foto por error tenía
 *      que buscar a los novios en mitad de su boda para pedírselo. El aviso de
 *      participación promete que puedes retirar lo que subes; esto lo cumple.
 *
 *      No hay cuentas ni contraseñas, así que la prueba de "esto es mío" es una
 *      LLAVE DE AUTOR: un secreto aleatorio que se inventa el propio teléfono la
 *      primera vez que sube algo. En la foto se guarda solo su **huella**
 *      (sha-256) — la colección la lee cualquiera, así que ahí no puede viajar
 *      nada que sirva para borrar. Quien presente la llave entera es quien la
 *      subió, y nadie más la tiene.
 *
 *   2. QUE BORRAR LIBERE EL ESPACIO. Hasta ahora se borraba la FILA y el archivo
 *      se quedaba en el almacén para siempre. Con los cupos de la 0018/0019 eso
 *      es grave: la foto desaparece del álbum pero sigue ocupando, así que un
 *      evento se puede quedar sin sitio por recuerdos que ya nadie ve. Aquí se
 *      borran los dos, y en ese orden: primero la fila (lo que ve la gente) y
 *      después el archivo.
 *
 * POR QUÉ ES UNA FUNCIÓN Y NO UNA REGLA EN LA BASE:
 *   La comprobación es "¿el sha-256 de lo que traes coincide con lo guardado?".
 *   Una política de RLS no puede hacer eso sin que la llave viaje en la petición
 *   a la vista de la propia base. Y además hay que tocar el ALMACÉN, que la RLS
 *   de `items` no alcanza. Con la llave de servicio aquí dentro, las dos cosas
 *   pasan juntas o no pasa ninguna.
 *
 * QUIÉN PUEDE BORRAR, en orden:
 *   · el ANFITRIÓN, con su pase — cualquier recuerdo, como hasta ahora;
 *   · el AUTOR, con su llave — solo los suyos.
 *   Cualquier otro caso: 403, sin decir por qué (no se confirma si el id existe).
 *
 * Se despliega PÚBLICA (`--no-verify-jwt`): el pase firmado es la llave.
 */

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET = "media";

/**
 * De qué colecciones se puede quitar lo propio. Corta a propósito: en `fotos` el
 * autor firma su recuerdo desde hoy. El muro tiene el mismo problema y podrá
 * entrar aquí en cuanto sus mensajes lleven huella; hasta entonces, dejarlo
 * abierto sería prometer algo que no se puede comprobar.
 */
const COLECCIONES = new Set(["fotos"]);

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-evento-pase, x-evento-anfitrion",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const cabeceras = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
};

async function rpc(nombre: string, cuerpo: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(`rpc ${nombre} → ${res.status}`);
  return await res.json();
}

/** sha-256 en hexadecimal, igual que lo calcula el navegador. */
async function huella(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compara sin delatar en cuánto se parecen. Con un `===` normal, el tiempo que
 * tarda depende de cuántos caracteres coinciden, y eso se puede medir para ir
 * adivinando la llave carácter a carácter. Aquí siempre cuesta lo mismo.
 */
function igualesSiempreEnLoMismo(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distintos = 0;
  for (let i = 0; i < a.length; i++) distintos |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return distintos === 0;
}

/** La ruta dentro del almacén, sacada de la dirección guardada (igual que @salones/sync). */
function rutaDe(direccion: unknown): string | null {
  if (typeof direccion !== "string") return null;
  return /\/storage\/v1\/object\/public\/media\/(.+)$/.exec(direccion)?.[1] ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);
  if (!URL_SUPABASE || !SERVICE_ROLE) return json({ error: "función sin configurar" }, 500);

  let cuerpo: { id?: unknown; coleccion?: unknown; llave?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "cuerpo inválido" }, 400);
  }

  const id = typeof cuerpo.id === "string" ? cuerpo.id : "";
  const coleccion = typeof cuerpo.coleccion === "string" ? cuerpo.coleccion : "";
  const llave = typeof cuerpo.llave === "string" ? cuerpo.llave : "";
  if (!id || !COLECCIONES.has(coleccion)) return json({ error: "petición inválida" }, 400);

  try {
    /* ---- 1. ¿De qué evento hablamos? ---------------------------------------
     * Sale del PASE, nunca del cuerpo de la petición: si el evento lo eligiera
     * quien llama, con un pase de su propia boda podría borrar en otra. */
    const paseAnfitrion = req.headers.get("x-evento-anfitrion") ?? "";
    const pase = req.headers.get("x-evento-pase") ?? "";

    let evento = "";
    let esAnfitrion = false;
    if (paseAnfitrion) {
      const e = await rpc("evento_del_pase_anfitrion", { p_pase: paseAnfitrion });
      if (typeof e === "string" && e) {
        evento = e;
        esAnfitrion = true;
      }
    }
    if (!evento && pase) {
      const e = await rpc("evento_del_pase", { p_pase: pase });
      if (typeof e === "string" && e) evento = e;
    }
    if (!evento) return json({ error: "sin permiso para este evento" }, 403);

    /* ---- 2. La fila, tal y como está guardada ---------------------------- */
    const q =
      `${URL_SUPABASE}/rest/v1/items?evento=eq.${encodeURIComponent(evento)}` +
      `&coleccion=eq.${encodeURIComponent(coleccion)}&id=eq.${encodeURIComponent(id)}`;
    const res = await fetch(`${q}&select=id,dato`, { headers: cabeceras });
    if (!res.ok) return json({ error: "no se pudo leer" }, 502);
    const filas = (await res.json()) as { id: string; dato: Record<string, unknown> }[];
    const fila = filas[0];

    // Ya no está: se responde OK. Si dos toques seguidos borran la misma foto,
    // el segundo no tiene por qué parecer un fallo.
    if (!fila) return json({ ok: true, yaNoEstaba: true });

    /* ---- 3. ¿Puede quitarla? -------------------------------------------- */
    if (!esAnfitrion) {
      const guardada = typeof fila.dato?.autorHuella === "string" ? fila.dato.autorHuella : "";
      // Sin huella guardada (fotos de antes de esto) no hay forma de comprobar
      // de quién es: solo el anfitrión puede quitarlas.
      if (!guardada || !llave) return json({ error: "no se puede quitar" }, 403);
      if (!igualesSiempreEnLoMismo(guardada, await huella(llave))) {
        return json({ error: "no se puede quitar" }, 403);
      }
    }

    /* ---- 4. Borrar: primero la fila, después el archivo ------------------
     * En ese orden a propósito. Si falla lo segundo, queda un archivo huérfano
     * ocupando cupo —molesto, arreglable—. Al revés quedaría una foto en el
     * álbum cuyo archivo ya no existe: un hueco roto en la pantalla de la boda. */
    const borrado = await fetch(q, { method: "DELETE", headers: cabeceras });
    if (!borrado.ok) return json({ error: "no se pudo quitar" }, 502);

    const ruta = rutaDe(fila.dato?.url);
    let archivoBorrado = false;
    if (ruta) {
      const delArchivo = await fetch(`${URL_SUPABASE}/storage/v1/object/${BUCKET}/${ruta}`, {
        method: "DELETE",
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
      });
      archivoBorrado = delArchivo.ok;
      if (!archivoBorrado) {
        // No se le cuenta como fallo a quien borró —su foto YA no está en el
        // álbum—, pero tiene que quedar rastro: son bytes que siguen gastando
        // cupo sin que nadie los vea.
        console.error("media-borrar: la fila se borró pero el archivo no:", ruta);
      }
    }

    return json({ ok: true, archivoBorrado });
  } catch (e) {
    console.error("media-borrar:", e instanceof Error ? e.message : e);
    return json({ error: "no se pudo quitar" }, 500);
  }
});
