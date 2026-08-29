/**
 * EL LATIDO DE ACTIVIDAD del portal (migración 0031) — contar, jamás espiar.
 *
 * Un aviso de "esto se abrió" hacia la función `apuntar_actividad` de la
 * base: UNA fila por evento + tipo + día con un contador. No viaja NINGUNA
 * identidad — ni nombre, ni id de invitado, ni nada del perfil — y la función
 * ignora en silencio las vitrinas (`demo-xxxxxx` no existen en `events`), así
 * que el tráfico de la demo pública no ensucia los números del salón.
 *
 * Es fuego-y-olvido a propósito: `keepalive` para que sobreviva al cambio de
 * página, y CUALQUIER fallo se traga — un contador jamás puede tumbar ni
 * retrasar la pantalla de un invitado.
 *
 * (El gemelo de apps/invitaciones vive en su propio lib: dos copias de 20
 * líneas a propósito, para no meter esto a un paquete compartido y disparar
 * 14 reconstrucciones por un contador.)
 */
export type TipoActividad = "portal" | "invitacion" | "rsvp" | "pase";

export function apuntarActividad(evento: string, tipo: TipoActividad): void {
  try {
    /*
     * Las vitrinas por visitante (`demo-xxxxxx`) se saltan aquí para no gastar
     * una petición que el servidor va a ignorar (no existen en `events`). El
     * evento `demo` compartido SÍ cuenta a propósito: es un evento real y sus
     * números hacen que la pantalla de reportes de la demo se vea viva.
     */
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
