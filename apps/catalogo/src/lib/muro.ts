/**
 * MURO DEL EVENTO — lo que necesita el panel del anfitrión.
 *
 * Los mensajes viven en el "lugar central", en la colección "mensajes": la
 * MISMA que escriben el portal del invitado y la app `muro`. Aquí solo se leen
 * (para proyectarlos y moderarlos), nunca se escriben mensajes nuevos: eso es
 * cosa de los invitados.
 */

/** Colección compartida (la misma que usan el portal y `apps/muro`). */
export const COLECCION_MENSAJES = "mensajes";

/** Un mensaje del libro de firmas. Misma forma en todas las apps. */
export type Mensaje = {
  id: string;
  nombre: string;
  texto: string;
  /** Foto opcional, ya comprimida (dataURL o URL del almacenamiento). */
  foto?: string;
  fecha: number;
};

/** Texto tipo "hace un momento / hace 2 h / ayer". */
export function tiempoRelativo(fecha: number, ahora = Date.now()): string {
  const seg = Math.max(0, Math.round((ahora - fecha) / 1000));
  if (seg < 60) return "hace un momento";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.round(hrs / 24);
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/**
 * Enlace que se comparte (QR incluido) para que los invitados firmen.
 * Preferimos el PORTAL, donde ya vive el muro del invitado; si aún no está
 * configurado, la app `muro` de siempre, que entiende el mismo `?e=`.
 */
export function enlaceFirmar(codigo: string, baseMuro: string): string {
  const portal = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  const evento = `?e=${encodeURIComponent(codigo)}`;
  if (portal) return `${portal}/muro${evento}`;
  return baseMuro ? `${baseMuro}/firmar${evento}` : "";
}

/**
 * Descarga los mensajes como un recuerdo en texto, para guardar o imprimir.
 * Va ordenado del primero al último: se lee como la crónica de la fiesta.
 */
export function exportarRecuerdo(mensajes: Mensaje[], nombreEvento: string, codigo: string): void {
  const lineas: string[] = [
    `Muro de mensajes — ${nombreEvento}`,
    "",
    `${mensajes.length} mensaje${mensajes.length === 1 ? "" : "s"} de tus invitados`,
    "========================================",
    "",
  ];
  for (const m of [...mensajes].sort((a, b) => a.fecha - b.fecha)) {
    lineas.push(`— ${m.nombre}`);
    lineas.push(m.texto);
    if (m.foto) lineas.push("[foto adjunta]");
    lineas.push("");
  }

  const blob = new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `muro-${codigo}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
