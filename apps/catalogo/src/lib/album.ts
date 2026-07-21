/**
 * ÁLBUM DEL EVENTO — lo que necesita el anfitrión.
 *
 * Las fotos y videos viven en el "lugar central", en la colección "fotos": la
 * MISMA que escriben el portal del invitado y la app `album-fotos`. Subirlas es
 * cosa de los invitados; desde aquí se ven, se proyectan, se moderan y —lo más
 * importante para el salón— se DESCARGAN todas para entregárselas al cliente.
 */

/** Colección compartida (la misma que usan el portal y `apps/album-fotos`). */
export const COLECCION_FOTOS = "fotos";

/** Una foto o video del álbum. Misma forma en todas las apps. */
export type Foto = {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  fecha?: number;
};

export function esVideo(tipo: string): boolean {
  return tipo.startsWith("video/");
}

/** Ordena de más reciente a más antigua. */
export function porFecha(a: Foto, b: Foto): number {
  return (b.fecha ?? 0) - (a.fecha ?? 0);
}

/**
 * Enlace que se comparte (QR incluido) para que los invitados suban sus fotos.
 * Preferimos el PORTAL, donde ya vive el álbum del invitado; si aún no está
 * configurado, la app `album-fotos` de siempre, que entiende el mismo `?e=`.
 */
export function enlaceSubir(codigo: string, baseAlbum: string): string {
  const portal = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/$/, "");
  const evento = `?e=${encodeURIComponent(codigo)}`;
  if (portal) return `${portal}/album${evento}`;
  return baseAlbum ? `${baseAlbum}/${evento}` : "";
}

/** Nombre de archivo numerado, para que no se pisen al guardarse en la carpeta. */
function nombreDeArchivo(foto: Foto, indice: number): string {
  const limpio = (foto.nombre || "recuerdo").replace(/[\\/:*?"<>|]/g, "-").slice(-60);
  return `${String(indice + 1).padStart(3, "0")}-${limpio}`;
}

/** Cómo terminó una descarga masiva. */
export type ResultadoDescarga = { guardadas: number; fallidas: number; cancelada: boolean };

/**
 * Descarga TODO el álbum, archivo por archivo.
 *
 * Se baja cada archivo de verdad (fetch → blob) en vez de apuntar el enlace al
 * almacenamiento: así el navegador lo GUARDA con su nombre en lugar de abrirlo
 * en una pestaña, que es lo que pasa con archivos de otro dominio.
 *
 * Va de uno en uno, avisando del avance y dejando cancelar: una boda pueden ser
 * cientos de fotos, y hacerlo todo de golpe tumba la pestaña.
 */
export async function descargarAlbum(
  fotos: Foto[],
  alAvanzar: (hechas: number, total: number) => void,
  seguir: () => boolean,
): Promise<ResultadoDescarga> {
  let guardadas = 0;
  let fallidas = 0;
  let cancelada = false;

  for (let i = 0; i < fotos.length; i++) {
    if (!seguir()) {
      cancelada = true;
      break;
    }
    const foto = fotos[i];
    if (!foto) continue;
    try {
      const res = await fetch(foto.url);
      if (!res.ok) throw new Error(`descarga ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreDeArchivo(foto, i);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      guardadas++;
    } catch {
      fallidas++;
    }
    alAvanzar(i + 1, fotos.length);
    // Un respiro entre archivos: el navegador encola mejor y no se atraganta.
    await new Promise((r) => setTimeout(r, 150));
  }

  return { guardadas, fallidas, cancelada };
}
