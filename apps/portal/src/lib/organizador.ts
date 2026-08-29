/**
 * EL PORTAL DEL ORGANIZADOR — datos y utilidades (la última pieza del mapa).
 *
 * La identidad del organizador en esta casa NUNCA fue una cuenta: es la LLAVE
 * DE ANFITRIÓN (0009) que el salón le entrega en su enlace privado. Lo que no
 * existía era una CASA para esa llave: los novios brincaban entre pantallas de
 * invitado con poderes extra. Este módulo les da la suya: un solo enlace
 * (`/organizador?e=CODIGO&a=LLAVE`), sin cuentas ni contraseñas, vestido con
 * la marca de su propia boda.
 *
 * QUÉ PUEDE VER: lo mismo que los tableros de anfitrión que ya existían
 * (respuestas, contadores) — se lee con el código, y los PODERES de verdad
 * (borrar, moderar, cerrar el álbum) los sigue haciendo valer el SERVIDOR con
 * la llave (0009/0016): una llave inventada pinta pantallas pero no puede
 * tocar nada.
 *
 * La llave la lee y la recuerda `claveAnfitrion` de @salones/sync (viene en
 * `?a=` y queda en el navegador): con aterrizar aquí UNA vez, la moderación
 * se enciende en el álbum y el muro del portal para este dispositivo.
 */
import { EstadoRSVP } from "@salones/core";
import { URLS } from "@salones/directorio";
import { obtenerSync } from "@salones/sync";

export { EstadoRSVP };

/** Una respuesta del tablero, ya normalizada para pintarse. */
export type RespuestaOrganizador = {
  id: string;
  estado: string;
  personas: number;
  /** Presente cuando respondieron por el enlace general (dijeron su nombre). */
  nombre: string;
  /** Marca de tiempo (ms) si la respuesta la trae. */
  fecha: number | null;
};

/** Los números del evento que le importan al organizador. */
export type ResumenOrganizador = {
  confirmados: number;
  personas: number;
  rechazados: number;
  fotos: number;
  mensajes: number;
  canciones: number;
  jugadores: number;
  respuestas: RespuestaOrganizador[];
};

export const RESUMEN_ORGANIZADOR_VACIO: ResumenOrganizador = {
  confirmados: 0,
  personas: 0,
  rechazados: 0,
  fotos: 0,
  mensajes: 0,
  canciones: 0,
  jugadores: 0,
  respuestas: [],
};

/**
 * Lee de una pasada lo que el organizador quiere saber. Igual que el puesto
 * de mando del salón: `listar` (una consulta por colección), sin suscripción —
 * y si una colección falla, cuenta 0 en vez de tumbar la pantalla.
 */
export async function medirParaOrganizador(codigo: string): Promise<ResumenOrganizador> {
  const sync = obtenerSync();
  const leer = async (coleccion: string) => {
    try {
      return await sync.listar(codigo, coleccion);
    } catch {
      return [];
    }
  };

  const [respuestasCrudas, mensajes, canciones, fotos, ranking] = await Promise.all([
    leer("respuestas"),
    leer("mensajes"),
    leer("canciones"),
    leer("fotos"),
    leer("ranking"),
  ]);

  const respuestas: RespuestaOrganizador[] = respuestasCrudas
    .filter((r) => typeof (r as { estado?: unknown }).estado === "string")
    .map((r) => {
      const fila = r as { id: string; estado: string; personas?: unknown; nombre?: unknown; fecha?: unknown };
      return {
        id: fila.id,
        estado: fila.estado,
        personas:
          typeof fila.personas === "number" && fila.personas > 0 ? Math.floor(fila.personas) : 1,
        nombre: typeof fila.nombre === "string" ? fila.nombre : "",
        fecha: typeof fila.fecha === "number" ? fila.fecha : null,
      };
    })
    // Las más recientes arriba; las sin fecha, al final (son las más viejas).
    .sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0));

  const sies = respuestas.filter((r) => r.estado === EstadoRSVP.Confirmado);
  return {
    confirmados: sies.length,
    personas: sies.reduce((suma, r) => suma + r.personas, 0),
    rechazados: respuestas.filter((r) => r.estado === EstadoRSVP.Rechazado).length,
    fotos: fotos.length,
    mensajes: mensajes.length,
    canciones: canciones.length,
    jugadores: ranking.length,
    respuestas,
  };
}

/** Una herramienta del organizador: a dónde va y si sale del portal. */
export type Herramienta = {
  nombre: string;
  descripcion: string;
  href: string;
  externa: boolean;
};

/**
 * Las herramientas, con la llave puesta donde hace falta. Las internas
 * (álbum, muro) no la llevan en el enlace: `claveAnfitrion` ya la dejó en el
 * navegador al aterrizar y los módulos la encuentran solos. Las externas van
 * con `&a=` porque viven en otro dominio (otro almacén del navegador).
 */
export function herramientasDelOrganizador(codigo: string, llave: string): Herramienta[] {
  const e = `?e=${encodeURIComponent(codigo)}`;
  const ea = `${e}&a=${encodeURIComponent(llave)}`;
  return [
    {
      nombre: "Álbum del evento",
      descripcion: "Todas las fotos; puedes quitar la que sobre y cerrar el álbum.",
      href: `/album${e}`,
      externa: false,
    },
    {
      nombre: "Muro de mensajes",
      descripcion: "El libro de firmas; puedes quitar mensajes.",
      href: `/muro${e}`,
      externa: false,
    },
    {
      nombre: "Acomodo de mesas",
      descripcion: "Arma las mesas y sienta a tus invitados.",
      href: `${URLS.mesas}/${ea}`,
      externa: true,
    },
    {
      nombre: "Pases y puerta (QR)",
      descripcion: "Los pases de entrada y el escáner del día del evento.",
      href: `${URLS["pases-qr"]}/${ea}`,
      externa: true,
    },
    {
      nombre: "Panel del DJ",
      descripcion: "La cola de canciones pedidas, ordenada por votos.",
      href: `${URLS.playlist}/${e}`,
      externa: true,
    },
    {
      nombre: "Tablero de juegos",
      descripcion: "El ranking de la trivia, en vivo.",
      href: `${URLS.dinamicas}/${e}`,
      externa: true,
    },
  ];
}
