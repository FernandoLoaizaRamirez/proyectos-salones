"use client";

/**
 * EL LATIDO DE ACTIVIDAD de la invitación (migración 0031) — contar, jamás
 * espiar. Gemelo del de apps/portal/src/lib/actividad.ts, a propósito en dos
 * copias de 20 líneas: meterlo a un paquete compartido dispararía 14
 * reconstrucciones por un contador. Si cambias uno, cambia el otro.
 *
 * No viaja NINGUNA identidad; los fallos se tragan (un contador jamás tumba
 * la invitación de nadie); y las vitrinas se saltan aquí para no gastar una
 * petición que el servidor va a ignorar de todos modos.
 */
export function apuntarActividad(evento: string, tipo: "invitacion"): void {
  try {
    if (!evento || /^demo-/.test(evento)) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;
    void fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/apuntar_actividad`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: anon,
        "Content-Type": "application/json",
        ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
      },
      body: JSON.stringify({ p_evento: evento, p_tipo: tipo }),
    }).catch(() => {});
  } catch {
    /* nunca: ver arriba */
  }
}
