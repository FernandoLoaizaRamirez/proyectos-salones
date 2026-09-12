/**
 * LOS DATOS LEGALES DEL SALÓN: leerlos y guardarlos desde el panel
 * (`tenant_legal`, migración 0033).
 *
 * Es el lado del PANEL, con la sesión del staff — no con service-role. Quién
 * puede escribir NO lo decide este archivo: lo decide la base. La política
 * `tl_wr_admin` solo deja al dueño o a un admin de SU salón; al resto del staff
 * le deja mirar (`tl_sel_staff`). Si alguien fuerza la interfaz, el servidor
 * responde que no.
 *
 * Y hay una regla que la base hace cumplir y la interfaz solo explica: el CHECK
 * `tl_publicado_completo` impide marcar PUBLICADO un aviso sin razón social,
 * sin domicilio, sin un correo con forma de correo o sin la constancia de haber
 * asumido el borrador. Está en Postgres a propósito (la lección de la 0016):
 * PostgREST es público, y un `if` de React no es una regla.
 *
 * El invitado NO lee esta tabla: la recibe ya resuelta por `evento-config`.
 */
import { obtenerSupabase } from "./supabase";
import type { ResultadoGuardado } from "./branding";

/** La fila de `tenant_legal` con los nombres del panel. */
export type LegalSalon = {
  razonSocial?: string;
  domicilio?: string;
  contacto?: string;
  telefono?: string;
  diasConservacion?: number;
  publicado: boolean;
  aceptoBorradorEn?: string;
};

const COLUMNAS =
  "razon_social, domicilio, contacto, telefono, dias_conservacion, publicado, acepto_borrador_en";

type Fila = {
  razon_social: string | null;
  domicilio: string | null;
  contacto: string | null;
  telefono: string | null;
  dias_conservacion: number | null;
  publicado: boolean | null;
  acepto_borrador_en: string | null;
};

/**
 * Lee los datos legales del salón.
 *
 * `null` = todavía no hay fila; `"fallo"` = no se pudo leer. La diferencia
 * importa por la misma razón que en la marca del evento: ofrecer Guardar sobre
 * un formulario vacío porque la LECTURA tropezó pisaría con NULL unos datos que
 * sí existen — y aquí lo que se pisaría es el domicilio del responsable.
 */
export async function obtenerLegalSalon(
  tenantId: string,
): Promise<LegalSalon | null | "fallo"> {
  const supabase = obtenerSupabase();
  if (!supabase) return "fallo";
  const { data, error } = await supabase
    .from("tenant_legal")
    .select(COLUMNAS)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) return "fallo";
  if (!data) return null;
  const fila = data as Fila;
  return {
    razonSocial: fila.razon_social ?? undefined,
    domicilio: fila.domicilio ?? undefined,
    contacto: fila.contacto ?? undefined,
    telefono: fila.telefono ?? undefined,
    diasConservacion: fila.dias_conservacion ?? undefined,
    publicado: fila.publicado === true,
    aceptoBorradorEn: fila.acepto_borrador_en ?? undefined,
  };
}

/**
 * El traductor de fracasos de la marca, MÁS el del candado de publicación.
 *
 * El `23514` es el CHECK de la 0033: sin esto la pantalla enseñaría un número
 * de Postgres donde tiene que decir «te falta el domicilio».
 */
function traducir(error: { code?: string; message: string }): ResultadoGuardado {
  const codigo = error.code ?? "";
  // El 23514 lo dispara CUALQUIER check, y la 0033 tiene DOS. Sin mirar el
  // nombre, quien escribiera 4000 dias de conservacion leeria "faltan datos
  // para poder publicar", que no tiene nada que ver con lo que hizo.
  if (/tl_conservacion_razonable/.test(error.message)) {
    return {
      ok: false,
      motivo: "error",
      detalle: "el plazo tiene que estar entre 1 y 3650 dias",
    };
  }
  if (codigo === "23514" || /tl_publicado_completo/.test(error.message)) {
    return { ok: false, motivo: "error", detalle: "faltan datos para poder publicar" };
  }
  const sinPermiso =
    codigo === "42501" || codigo === "PGRST301" || /permission|policy/i.test(error.message);
  return { ok: false, motivo: sinPermiso ? "sin-permiso" : "error", detalle: error.message };
}

const oNulo = (v?: string) => (v && v.trim() ? v.trim() : null);

/**
 * Guarda los datos (upsert por `tenant_id`). Los campos vacíos van a NULL a
 * propósito: así el salón puede QUITAR un teléfono, en vez de quedarse con él
 * para siempre porque la interfaz no supo borrarlo.
 *
 * NO toca `publicado`: publicar es un acto aparte y con constancia.
 */
export async function guardarLegalSalon(
  tenantId: string,
  datos: Omit<LegalSalon, "publicado" | "aceptoBorradorEn">,
  userId?: string,
): Promise<ResultadoGuardado> {
  const supabase = obtenerSupabase();
  if (!supabase) return { ok: false, motivo: "sin-servidor" };

  const dias = datos.diasConservacion;
  const { error } = await supabase.from("tenant_legal").upsert(
    {
      tenant_id: tenantId,
      razon_social: oNulo(datos.razonSocial),
      domicilio: oNulo(datos.domicilio),
      contacto: oNulo(datos.contacto),
      telefono: oNulo(datos.telefono),
      dias_conservacion: typeof dias === "number" && dias > 0 ? dias : null,
      actualizado: new Date().toISOString(),
      ...(userId ? { actualizado_por: userId } : {}),
    },
    { onConflict: "tenant_id" },
  );
  return error ? traducir(error) : { ok: true };
}

/**
 * Publica (o retira) el aviso del salón.
 *
 * Al PUBLICAR graba la constancia: quién asumió que estos textos son un
 * borrador sin revisar por abogado, y cuándo. Sin esa constancia el CHECK de la
 * 0033 rechaza la publicación — y esa constancia es, además, lo que protege al
 * proveedor: queda escrito que fue el RESPONSABLE quien publicó, sabiendo qué
 * publicaba.
 */
export async function publicarLegalSalon(
  tenantId: string,
  userId: string,
  publicar: boolean,
): Promise<ResultadoGuardado> {
  const supabase = obtenerSupabase();
  if (!supabase) return { ok: false, motivo: "sin-servidor" };

  const { error } = await supabase
    .from("tenant_legal")
    .update({
      publicado: publicar,
      actualizado: new Date().toISOString(),
      actualizado_por: userId,
      ...(publicar ? { acepto_borrador_en: new Date().toISOString(), acepto_borrador_por: userId } : {}),
    })
    .eq("tenant_id", tenantId);
  return error ? traducir(error) : { ok: true };
}
