/**
 * @salones/core — CARACTERÍSTICAS: los detalles vendibles DENTRO de un módulo.
 *
 * Un módulo es una experiencia entera ("el álbum"); una característica es algo
 * que se enciende o apaga dentro de ella ("el álbum, pero sin descargas"). Eso
 * es lo que permite armar planes de verdad —Básico, Plus, Premium— sin tener
 * dos álbumes distintos en el código.
 *
 * CÓMO SE NOMBRAN: `modulo.caracteristica` (`album.descargas`, `muro.fotos`).
 * No hace falta esquema nuevo: las claves de `features` son texto, así que una
 * característica es una fila más y el motor de siempre (plan → salón → evento)
 * la resuelve igual.
 *
 * LA REGLA QUE LO HACE USABLE — HERENCIA:
 *   · Si hay fila para la clave fina, esa manda.
 *   · Si NO la hay, hereda de su módulo.
 * Sin esa herencia habría que sembrar las cuatro claves en todos los planes y
 * en todos los eventos existentes el día que se añade una; olvidar uno solo
 * apagaría en silencio algo que hoy funciona. Con ella, "no consta" significa
 * "lo que traiga el álbum", que es lo que cualquiera espera.
 *
 * ⚠️ SOLO SE DAN DE ALTA CARACTERÍSTICAS QUE EXISTEN DE VERDAD. Un interruptor
 * sobre algo que la app no sabe hacer no apaga nada y no enciende nada: es una
 * promesa rota esperando a la primera demostración. Las cuatro de abajo se
 * corresponden con un control real en pantalla.
 */
import { tieneFuncion, type Entitlements, type FeatureClave } from "./entitlements";

/**
 * Las características vendibles de hoy. Cada una apunta a algo que el invitado
 * ve o deja de ver.
 */
export const CARACTERISTICAS_CONOCIDAS = {
  /** El botón "Descargar todo" del álbum. */
  AlbumDescargas: "album.descargas",
  /** Adjuntar una foto al firmar el muro. */
  MuroFotos: "muro.fotos",
  /** Votar las canciones de la playlist (sin esto, solo se piden). */
  PlaylistVotos: "playlist.votos",
  /** El ranking de las dinámicas. */
  DinamicasRanking: "dinamicas.ranking",
} as const;

/** El módulo al que pertenece una característica: "album.descargas" → "album". */
export function moduloDe(clave: FeatureClave): FeatureClave {
  const punto = clave.indexOf(".");
  return punto === -1 ? clave : clave.slice(0, punto);
}

/** ¿Es una clave fina (lleva punto) o un módulo entero? */
export function esCaracteristica(clave: FeatureClave): boolean {
  return clave.includes(".");
}

/**
 * ¿Está habilitada esta característica para el evento?
 *
 * Con fila propia manda esa; sin fila, hereda de su módulo. Para una clave sin
 * punto se comporta igual que `tieneFuncion`, así que sirve para preguntar por
 * cualquiera de las dos cosas sin saber cuál es.
 */
export function tieneCaracteristica(
  entitlements: Entitlements,
  clave: FeatureClave,
): boolean {
  if (clave in entitlements) return entitlements[clave] === true;
  return tieneFuncion(entitlements, moduloDe(clave));
}
