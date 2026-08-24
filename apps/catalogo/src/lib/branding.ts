/**
 * LA MARCA DEL SALÓN: leerla y GUARDARLA desde el panel (`tenant_branding`).
 *
 * El branding (nombre, logo, colores, tipografía, redondeo) es PÚBLICO por
 * diseño —el invitado ve la marca del salón—, así que la tabla tiene lectura
 * abierta y se consulta con la misma llave pública del navegador.
 *
 * ESCRIBIR es nuevo (migración 0025). Hasta hoy el panel solo enseñaba una
 * vista previa y su propio comentario lo admitía: "todavía NO se guardan".
 * Poner el logo y los colores de un salón era escribir a mano en la base, o
 * sea llamar a Fernando. Ahora lo hace el salón.
 *
 * QUIÉN PUEDE ESCRIBIR NO LO DECIDE ESTE ARCHIVO: lo decide la base. La RLS de
 * la 0025 (`tb_ins_admin` / `tb_upd_admin`) solo deja al dueño o a un admin de
 * SU salón; al resto del staff le deja mirar. Si alguien fuerza la interfaz, el
 * servidor responde que no.
 *
 * DEGRADACIÓN ELEGANTE al leer: si Supabase no está configurado, si la tabla
 * aún no existe o si el salón no tiene marca, devuelve `null` y la UI cae a
 * valores de ejemplo. Nunca lanza.
 */
import type { TemaSalon } from "@salones/ui";
import { obtenerSupabase } from "./supabase";

/**
 * Salón demo: UUID fijo y conocido (semilla de la migración 0002).
 *
 * ⚠️ SOLO como respaldo para pantallas sin sesión. Cuando hay staff dentro, el
 * salón sale de SU token (`leerIdentidad`): antes esta constante se usaba
 * siempre, así que un cliente real habría visto la marca de Hacienda Santa
 * Renata en su propio panel.
 */
export const TENANT_DEMO = "d0000000-0000-4000-8000-000000000001";

/** Las columnas de `tenant_branding` (snake_case, como en la base). */
const COLUMNAS =
  "nombre, logo_url, sitio_url, primario, primario_texto, acento, radio, fondo, tinta, fuentes, esquema";

type FilaBranding = {
  nombre: string | null;
  logo_url: string | null;
  sitio_url: string | null;
  primario: string | null;
  primario_texto: string | null;
  acento: string | null;
  radio: string | null;
  fondo: string | null;
  tinta: string | null;
  fuentes: string | null;
  esquema: string | null;
};

/** Lee la marca de un salón. Devuelve `null` si no se puede (ver arriba). */
export async function obtenerBrandingSalon(
  tenantId: string = TENANT_DEMO,
): Promise<TemaSalon | null> {
  const supabase = obtenerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tenant_branding")
    .select(COLUMNAS)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) return null;
  const fila = data as FilaBranding;

  return {
    nombre: fila.nombre ?? "Salón",
    logoUrl: fila.logo_url ?? undefined,
    sitioUrl: fila.sitio_url ?? undefined,
    primario: fila.primario ?? undefined,
    primarioTexto: fila.primario_texto ?? undefined,
    acento: fila.acento ?? undefined,
    radio: fila.radio ?? undefined,
    fondo: fila.fondo ?? undefined,
    tinta: fila.tinta ?? undefined,
    fuentes: fila.fuentes ?? undefined,
    esquema: fila.esquema ?? undefined,
  };
}

/** Lo que puede fallar al guardar, ya traducido a algo que un salón entienda. */
export type ResultadoGuardado =
  | { ok: true }
  | { ok: false; motivo: "sin-servidor" | "sin-permiso" | "error"; detalle?: string };

/**
 * Guarda la marca del salón. Es un upsert: la fila puede no existir todavía
 * (un salón nuevo no tiene marca hasta que la captura).
 *
 * Los campos vacíos se guardan como NULL a propósito: así el salón puede
 * QUITAR un color y volver al tema base, en vez de quedarse con él para
 * siempre porque la interfaz no supo borrarlo.
 */
export async function guardarBrandingSalon(
  tenantId: string,
  tema: TemaSalon,
): Promise<ResultadoGuardado> {
  const supabase = obtenerSupabase();
  if (!supabase) return { ok: false, motivo: "sin-servidor" };

  const oNulo = (v?: string) => (v && v.trim() ? v.trim() : null);

  const { error } = await supabase.from("tenant_branding").upsert(
    {
      tenant_id: tenantId,
      nombre: oNulo(tema.nombre),
      logo_url: oNulo(tema.logoUrl),
      sitio_url: oNulo(tema.sitioUrl),
      primario: oNulo(tema.primario),
      primario_texto: oNulo(tema.primarioTexto),
      acento: oNulo(tema.acento),
      radio: oNulo(tema.radio),
      fondo: oNulo(tema.fondo),
      tinta: oNulo(tema.tinta),
      fuentes: oNulo(tema.fuentes),
      esquema: oNulo(tema.esquema),
      actualizado: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );

  if (!error) return { ok: true };

  /*
   * La RLS no contesta "no tienes permiso": contesta 401 o 42501 según por
   * dónde entre. Se traducen los dos, porque para el salón es la misma cosa y
   * lo que necesita leer es "pídeselo a tu administrador", no un número.
   */
  const codigo = (error as { code?: string }).code ?? "";
  const sinPermiso = codigo === "42501" || codigo === "PGRST301" || /permission|policy/i.test(error.message);
  return {
    ok: false,
    motivo: sinPermiso ? "sin-permiso" : "error",
    detalle: error.message,
  };
}
