/**
 * Edge Function `media-subir` — permiso de subida para fotos y videos.
 *
 * EL AGUJERO QUE TAPA:
 *   Hasta ahora el almacén tenía UNA sola regla: "cualquiera puede subir al
 *   bucket media" (ver `0001_estado_actual.sql`). Como la llave pública viaja
 *   dentro del JavaScript de cada app (es pública por diseño), cualquiera podía
 *   sacarla y subir archivos a la carpeta de CUALQUIER evento: meter imágenes
 *   ajenas en el álbum de una boda, o llenar el almacén hasta reventar la cuota.
 *
 * CÓMO LO TAPA:
 *   La app ya no sube directo. Primero pide permiso aquí presentando su PASE
 *   FIRMADO (el de invitado, `x-evento-pase`, o el de anfitrión,
 *   `x-evento-anfitrion`). Esta función:
 *     1. verifica el pase contra la base (no se puede forjar, caduca a 30 min),
 *     2. **decide ella misma la ruta**: `<evento>/<marca>-<azar>.<ext>`, y
 *     3. devuelve una URL de subida FIRMADA y de un solo uso (vale 2 horas).
 *
 *   La clave está en el punto 2: **el cliente no elige dónde escribe**. La
 *   carpeta sale del evento que la propia base reconoció en el pase, así que no
 *   hay forma de escribir en la burbuja de otro evento aunque se manipule la
 *   petición.
 *
 * POR QUÉ ASÍ Y NO CON UNA REGLA EN EL ALMACÉN (decisión de diseño, 2026-07-20):
 *   Lo natural habría sido copiar el truco de `items`: una política de RLS que
 *   lea el encabezado del pase. NO se hizo porque en el almacén ese camino es
 *   arena: leer encabezados con `current_setting('request.headers')` dentro de
 *   políticas de `storage.objects` **no está documentado**, y en las de SELECT
 *   está roto desde 2024 (supabase/supabase#29908, todavía abierto). Ya nos pasó
 *   una vez con el JWT HS256 de la 0006: construir sobre comportamiento no
 *   documentado costó rehacer el trabajo. Las URL firmadas sí son la vía
 *   soportada y estable.
 *
 * EL ARCHIVO NO PASA POR AQUÍ: esta función solo firma el permiso; el navegador
 * sube el archivo directo al almacén. Así no hay límite de tamaño de la función
 * ni coste por megabyte transferido.
 *
 * Se despliega PÚBLICA (`--no-verify-jwt`): el pase firmado es la llave.
 * Runbook: docs/CANDADO-FOTOS.md
 */

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET = "media";

/**
 * Tope por ARCHIVO. No es un numero inventado aqui: es exactamente el
 * `file_size_limit` del bucket (migracion 0001). Se repite en este lado para
 * poder decir que pasa ANTES de que el telefono suba 25 MB por una red de boda
 * y se encuentre con un error seco del almacen al terminar.
 *
 * Quien lo hace valer de verdad sigue siendo el bucket: aqui solo llega el
 * tamano DECLARADO, y eso lo elige quien manda la peticion.
 */
const TOPE_ARCHIVO = 25 * 1024 * 1024;

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

/** Llama a una función de la base con la llave de servicio. */
async function rpc(nombre: string, cuerpo: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(`rpc ${nombre} → ${res.status}`);
  return await res.json();
}

/**
 * ¿De qué evento es este pase? Acepta el de invitado y el de anfitrión: los dos
 * pueden aportar contenido. Devuelve también QUÉ pase valió, para poder llevarle
 * la cuenta sin volver a preguntar.
 */
async function eventoDelPase(
  pase: string,
  paseAnfitrion: string,
): Promise<{ evento: string; usado: string; esAnfitrion: boolean } | null> {
  if (paseAnfitrion) {
    const e = await rpc("evento_del_pase_anfitrion", { p_pase: paseAnfitrion });
    if (typeof e === "string" && e) return { evento: e, usado: paseAnfitrion, esAnfitrion: true };
  }
  if (pase) {
    const e = await rpc("evento_del_pase", { p_pase: pase });
    if (typeof e === "string" && e) return { evento: e, usado: pase, esAnfitrion: false };
  }
  return null;
}

/**
 * La huella del pase (sha-256). Se lleva la cuenta con esto y NUNCA con el pase
 * en claro: si algún día alguien lee la tabla, no se lleva llaves de nadie.
 */
async function huellaDe(pase: string): Promise<string> {
  const bytes = new TextEncoder().encode(pase);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ¿Cabe una subida más? La cuenta la lleva la BASE (migración 0015), no esta
 * función: hay varias instancias de ella y un contador en memoria no serviría.
 *
 * SI LA MIGRACIÓN TODAVÍA NO ESTÁ APLICADA la base responde 404 (la función no
 * existe) y aquí se DEJA PASAR. Es el mismo patrón no-fatal que el pase firmado
 * y las direcciones firmadas: así esta versión se puede desplegar ANTES de tocar
 * la base sin dejar a nadie sin subir fotos en plena boda.
 *
 * Cualquier OTRO fallo sí corta: si la base está ahí pero no contesta bien, es
 * mejor no firmar que firmar a ciegas.
 */
async function cabeUnaSubidaMas(evento: string, pase: string): Promise<boolean> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/permitir_subida`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_evento: evento, p_huella: await huellaDe(pase) }),
  });
  if (res.status === 404) return true; // migración 0015 pendiente
  if (!res.ok) return false;
  return (await res.json()) === true;
}

/**
 * ¿Tiene este evento contratado el PAQUETE DE VIDEO? (migración 0017)
 *
 * ESTE ES EL CANDADO DE VERDAD. Los dos álbumes esconden el botón de subir video
 * cuando el evento no lo tiene, pero esconder un botón no es cerrar una puerta:
 * quien manipule la petición la manda igual. Como es una función que se COBRA,
 * la respuesta tiene que darla el servidor.
 *
 * La pregunta se la hace a `evento_tiene_funcion`, la MISMA función de la base
 * que consulta el navegador para dibujarse. Así el candado y la interfaz no
 * pueden desalinearse: no hay dos motores comerciales, hay uno.
 *
 * SI LA MIGRACIÓN 0017 TODAVÍA NO ESTÁ APLICADA la base responde 404 y aquí se
 * DEJA PASAR, igual que hacen el pase firmado y el tope de subidas. Es lo que
 * permite desplegar esto ANTES de tocar la base sin cortarle el video a nadie a
 * media boda; en cuanto la migración corra, el candado empieza a valer. Cualquier
 * OTRO fallo sí niega: con la base delante, no se regala una función de pago
 * porque una consulta salga mal.
 */
async function tienePaqueteDeVideo(evento: string): Promise<boolean> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/evento_tiene_funcion`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_codigo: evento, p_clave: "video" }),
  });
  if (res.status === 404) return true; // migración 0017 pendiente
  if (!res.ok) return false;
  return (await res.json()) === true;
}

/**
 * ¿Le queda espacio a este evento? (migración 0018)
 *
 * El video ya se cobra desde la 0017, pero cobrar sin medir deja el costo
 * abierto: el almacenamiento se paga mientras el archivo exista. Y el almacén es
 * UNO para todas las bodas, así que llenarlo deja sin subir una foto a la que se
 * esté celebrando esa noche.
 *
 * La cuenta la lleva la base sumando los BYTES REALES de `storage.objects`, no
 * los que declare el navegador: si se fiara de lo declarado, bastaría con decir
 * "1 byte" para saltarse el cupo. Lo declarado solo se suma para saber si el
 * archivo que viene AHORA todavía cabe.
 *
 * Mismo trato no-fatal que el resto: si la migración 0018 no está aplicada, la
 * base responde 404 y se deja pasar, para poder desplegar esto antes de tocar la
 * base. Cualquier otro fallo niega: es mejor no firmar que llenar el almacén a
 * ciegas.
 */
async function cabeEnElEvento(evento: string, bytes: number): Promise<boolean> {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/cabe_en_el_evento`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_codigo: evento, p_bytes: bytes }),
  });
  if (res.status === 404) return true; // migración 0018 pendiente
  if (!res.ok) return false;
  return (await res.json()) === true;
}

/**
 * ¿Está cerrado el álbum de este evento? (migración 0021)
 *
 * Cuando la boda termina, quien organiza puede cerrar el álbum: se sigue viendo
 * y descargando, pero ya no entra nada nuevo. Sin esto, cualquiera con el QR
 * —o con una foto del QR hecha en la fiesta— podía seguir subiendo semanas
 * después, gastando el cupo del evento.
 *
 * Mismo trato no-fatal que el resto: si la migración no está aplicada, la base
 * responde 404 y se deja pasar (o sea, abierto). Cualquier otro fallo también
 * deja pasar, y aquí eso es deliberado: al contrario que el paquete de video,
 * equivocarse hacia el lado abierto solo cuesta una foto de más, mientras que
 * equivocarse hacia el cerrado deja a una boda sin poder subir en plena fiesta.
 */
async function albumCerrado(evento: string): Promise<boolean> {
  try {
    const res = await fetch(`${URL_SUPABASE}/rest/v1/rpc/album_esta_cerrado`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_codigo: evento }),
    });
    if (!res.ok) return false;
    return (await res.json()) === true;
  } catch {
    return false;
  }
}

/**
 * Deja constancia en el diagnóstico si el almacén va por encima del 80%
 * (migración 0019).
 *
 * POR QUÉ EXISTE: el plan gratis de Supabase da 1 GB para TODAS las bodas. Sin
 * esto, la forma de enterarse de que se está llenando sería que una novia llame
 * enfadada porque sus invitados no pueden subir fotos. La función de la base
 * escribe como mucho una fila por hora, así que llamarla en cada subida no
 * inunda nada.
 *
 * NUNCA rompe una subida: si falla, se ignora. Avisar de un problema no puede
 * provocar otro — la misma regla que el diagnóstico del cliente.
 */
async function avisarSiAlmacenLleno(): Promise<void> {
  try {
    await fetch(`${URL_SUPABASE}/rest/v1/rpc/avisar_si_almacen_lleno`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch {
    /* la migración 0019 todavía no está, o no hay red: da igual */
  }
}

/** Extensión razonable a partir del nombre o del tipo MIME (igual que @salones/sync). */
function extensionDe(nombre: string, tipo: string): string {
  const porNombre = /\.([a-z0-9]{1,5})$/i.exec(nombre)?.[1];
  if (porNombre) return porNombre.toLowerCase();
  const porTipo = tipo.split("/")[1]?.replace(/[^a-z0-9]/gi, "");
  return (porTipo || "bin").toLowerCase();
}

/**
 * Pide al almacén una URL de subida firmada para una ruta concreta.
 * Responde `{ url: "/object/upload/sign/<bucket>/<ruta>?token=..." }`.
 */
async function firmarSubida(ruta: string): Promise<string> {
  const res = await fetch(`${URL_SUPABASE}/storage/v1/object/upload/sign/${BUCKET}/${ruta}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`firmar → ${res.status}`);
  const data = (await res.json()) as { url?: string; signedUrl?: string };
  const relativa = data.url ?? data.signedUrl;
  if (!relativa) throw new Error("firmar → respuesta sin url");
  // Puede venir relativa ("/object/upload/sign/...") o absoluta.
  return relativa.startsWith("http") ? relativa : `${URL_SUPABASE}/storage/v1${relativa}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);
  if (!URL_SUPABASE || !SERVICE_ROLE) return json({ error: "función sin configurar" }, 500);

  let cuerpo: { nombre?: unknown; tipo?: unknown; bytes?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "cuerpo inválido" }, 400);
  }

  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre : "";
  const tipo = typeof cuerpo.tipo === "string" ? cuerpo.tipo : "";
  /**
   * Tamaño DECLARADO por el navegador. Es opcional a propósito: las versiones
   * de las apps que ya están en la calle no lo mandan, y quedarse sin subir
   * fotos por eso sería mucho peor que contar de menos durante un despliegue.
   * Cuando falta se cuenta como 0, y el cupo sigue valiendo igual porque lo ya
   * subido se mide del almacén, no de aquí.
   */
  const bytes =
    typeof cuerpo.bytes === "number" && Number.isFinite(cuerpo.bytes) && cuerpo.bytes > 0
      ? Math.floor(cuerpo.bytes)
      : 0;

  // Mismo candado que el bucket: solo fotos y videos.
  if (!tipo.startsWith("image/") && !tipo.startsWith("video/")) {
    return json({ error: "solo se admiten fotos y videos" }, 400);
  }

  // Tope por archivo, el mismo del bucket. Se avisa AQUÍ para no hacerle subir
  // 25 MB por la red de una boda antes de decirle que no cabía.
  if (bytes > TOPE_ARCHIVO) {
    return json(
      {
        error: "archivo demasiado grande",
        detalle: `El tope por archivo es de ${Math.round(TOPE_ARCHIVO / (1024 * 1024))} MB.`,
        topeBytes: TOPE_ARCHIVO,
      },
      413,
    );
  }

  try {
    const quien = await eventoDelPase(
      req.headers.get("x-evento-pase") ?? "",
      req.headers.get("x-evento-anfitrion") ?? "",
    );
    // Sin pase válido no se firma nada. No se dice por qué falló.
    if (!quien) return json({ error: "sin permiso para este evento" }, 403);
    const { evento, usado, esAnfitrion } = quien;

    /* ---- El álbum cerrado (migración 0021) --------------------------------
     * Quien organiza SÍ puede seguir subiendo con el álbum cerrado: se cierra a
     * los invitados para que no entre nada de fuera, y después se agregan las
     * fotos del fotógrafo. Cerrar no es atarse las manos. */
    if (!esAnfitrion && (await albumCerrado(evento))) {
      return json(
        {
          error: "álbum cerrado",
          detalle: "Este álbum ya no admite fotos nuevas. Puedes seguir viéndolo y descargándolo.",
        },
        423, // "cerrado con llave": ni un permiso roto ni un fallo de red
      );
    }

    /* ---- El paquete de video (migración 0017) ------------------------------
     * Va ANTES del tope a propósito: una subida que se va a negar no debe
     * gastarle cupo al evento. */
    /* ---- El álbum cerrado (migración 0021) --------------------------------
     * Quien organiza SÍ puede seguir subiendo con el álbum cerrado: se cierra a
     * los invitados para que no entre nada de fuera, y después se agregan las
     * fotos del fotógrafo. Cerrar no es atarse las manos. */
    if (!esAnfitrion && (await albumCerrado(evento))) {
      return json(
        {
          error: "álbum cerrado",
          detalle: "Este álbum ya no admite fotos nuevas. Puedes seguir viéndolo y descargándolo.",
        },
        423, // "cerrado con llave": ni un permiso roto ni un fallo de red
      );
    }

    /* ---- El paquete de video (migración 0017) ------------------------------
     * Va ANTES del tope a propósito: una subida que se va a negar no debe
     * gastarle cupo al evento. */
    if (tipo.startsWith("video/") && !(await tienePaqueteDeVideo(evento))) {
      return json(
        {
          error: "video no incluido",
          detalle: "Este evento tiene el álbum de fotos. El video se contrata aparte.",
        },
        402, // "hace falta pagar": no es un fallo del invitado ni un permiso roto
      );
    }

    /* ---- El cupo de espacio (migración 0018) -------------------------------
     * También antes del tope por hora, por lo mismo: lo que se va a negar no
     * gasta cupo de subidas. */
    if (!(await cabeEnElEvento(evento, bytes))) {
      return json(
        {
          error: "sin espacio en el evento",
          detalle: "Este evento alcanzó su límite de almacenamiento.",
        },
        507, // "no queda sitio": no es culpa de quien sube ni un fallo de red
      );
    }

    // Va aquí, con la subida ya concedida: si se está llenando, que quede
    // constancia ANTES de que alguien se quede fuera (migración 0019).
    await avisarSiAlmacenLleno();

    /* ---- El tope (migración 0015) -----------------------------------------
     * Antes esto no llevaba ninguna cuenta, y como la llave pública viaja
     * dentro del JavaScript de las apps, cualquiera podía pedirse pases del
     * evento "demo" y con ellos permisos ILIMITADOS. Todos los eventos comparten
     * el mismo almacén, así que llenarlo dejaba sin subir una sola foto a TODAS
     * las bodas, incluida la que se estuviera celebrando esa noche.
     *
     * La cuenta la lleva la base (`permitir_subida`), no esta función: hay
     * varias instancias de ella y un contador en memoria no serviría de nada. */
    if (!(await cabeUnaSubidaMas(evento, usado))) {
      return json(
        {
          error: "demasiadas subidas seguidas",
          detalle: "Espera un momento antes de subir más archivos.",
        },
        429,
      );
    }

    // LA RUTA LA DECIDE EL SERVIDOR, a partir del evento que la base reconoció
    // en el pase. El cliente no puede escribir en la carpeta de otro evento.
    const azar = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const ruta = `${encodeURIComponent(evento)}/${Date.now()}-${azar}.${extensionDe(nombre, tipo)}`;

    return json({
      subirUrl: await firmarSubida(ruta),
      ruta,
      urlPublica: `${URL_SUPABASE}/storage/v1/object/public/${BUCKET}/${ruta}`,
    });
  } catch (e) {
    console.error("media-subir:", e instanceof Error ? e.message : e);
    return json({ error: "no se pudo preparar la subida" }, 500);
  }
});
