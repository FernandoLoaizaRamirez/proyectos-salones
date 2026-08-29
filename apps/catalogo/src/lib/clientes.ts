/**
 * LOS CLIENTES DEL SALÓN — la ficha de quien contrata (migración 0030).
 *
 * El CRM mínimo que faltaba: hasta hoy "el cliente" era una llave de
 * anfitrión, no una persona con nombre y teléfono. Aquí se lee y escribe la
 * tabla `clients`, acotada por salón con la RLS de siempre: este archivo no
 * decide permisos, la base sí (cualquier miembro del salón captura clientes,
 * igual que eventos e invitados — es trabajo de mostrador).
 *
 * Todo degrada elegante: sin red o sin permiso, las lecturas devuelven vacío
 * y las escrituras contestan que no se pudo, sin tumbar la pantalla.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClienteFila = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  creado: string;
};

const COLUMNAS = "id,nombre,telefono,email,notas,creado";

/** Los clientes del salón, alfabéticamente. La RLS acota por tenant. */
export async function listarClientes(supabase: SupabaseClient): Promise<ClienteFila[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(COLUMNAS)
    .order("nombre", { ascending: true });
  if (error) return [];
  return (data ?? []) as ClienteFila[];
}

export type DatosCliente = {
  nombre: string;
  telefono?: string;
  email?: string;
  notas?: string;
};

const oNulo = (v?: string) => (v && v.trim() ? v.trim() : null);

/** Da de alta un cliente del salón. Devuelve la fila creada, o null si no se pudo. */
export async function crearCliente(
  supabase: SupabaseClient,
  tenantId: string,
  datos: DatosCliente,
): Promise<ClienteFila | null> {
  const nombre = datos.nombre.trim();
  if (!nombre) return null;
  const { data, error } = await supabase
    .from("clients")
    .insert({
      tenant_id: tenantId,
      nombre,
      telefono: oNulo(datos.telefono),
      email: oNulo(datos.email),
      notas: oNulo(datos.notas),
    })
    .select(COLUMNAS)
    .single();
  if (error) return null;
  return data as ClienteFila;
}

/** Corrige la ficha. Devuelve si la base lo aceptó. */
export async function actualizarCliente(
  supabase: SupabaseClient,
  id: string,
  datos: DatosCliente,
): Promise<boolean> {
  const nombre = datos.nombre.trim();
  if (!nombre) return false;
  const { error } = await supabase
    .from("clients")
    .update({
      nombre,
      telefono: oNulo(datos.telefono),
      email: oNulo(datos.email),
      notas: oNulo(datos.notas),
    })
    .eq("id", id);
  return !error;
}

/**
 * Borra la ficha. Sus eventos NO se borran (la base pone `client_id` en null:
 * `on delete set null` de la 0030). Se relee para confirmar — la RLS niega en
 * silencio y un "borré cero" no puede pintarse como borrado.
 */
export async function borrarCliente(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return false;
  const { data } = await supabase.from("clients").select("id").eq("id", id);
  return (data ?? []).length === 0;
}

/** Los eventos ligados a cada cliente: { client_id → [nombres de evento] }. */
export async function eventosPorCliente(
  supabase: SupabaseClient,
): Promise<Map<string, { codigo: string; nombre: string }[]>> {
  const { data, error } = await supabase
    .from("events")
    .select("codigo,nombre,client_id")
    .not("client_id", "is", null);
  const mapa = new Map<string, { codigo: string; nombre: string }[]>();
  if (error) return mapa;
  for (const fila of (data ?? []) as { codigo: string; nombre: string; client_id: string }[]) {
    const lista = mapa.get(fila.client_id) ?? [];
    lista.push({ codigo: fila.codigo, nombre: fila.nombre });
    mapa.set(fila.client_id, lista);
  }
  return mapa;
}

/** Liga (o desliga, con null) un evento a su cliente. */
export async function asignarClienteAEvento(
  supabase: SupabaseClient,
  eventId: string,
  clientId: string | null,
): Promise<boolean> {
  const { error } = await supabase
    .from("events")
    .update({ client_id: clientId })
    .eq("id", eventId);
  return !error;
}

/** El enlace de WhatsApp de un teléfono capturado a la mexicana (10 dígitos). */
export function enlaceWhatsApp(telefono: string | null): string {
  const digitos = (telefono ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return "";
  const conLada = digitos.length === 10 ? `52${digitos}` : digitos;
  return `https://wa.me/${conLada}`;
}
