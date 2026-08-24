import * as React from "react";
import { hrefFuentes } from "../tema/fuentes";

/**
 * Carga la pareja tipográfica de una clave EN RUNTIME (para las claves que no
 * vienen compiladas en la app).
 *
 * · "sistema" y las parejas autoalojadas ("clasica") no emiten nada: o no hay
 *   nada que descargar, o la app ya trae la letra compilada.
 * · El resto emite los preconnect y UN <link> a Google Fonts construido SOLO
 *   desde la allowlist (`hrefFuentes`) — jamás desde datos de la base.
 * · `precedence` es obligatorio: React 19 solo hoistea al <head> y deduplica
 *   por href las hojas que lo llevan; un <link> pelado se quedaría donde cayó
 *   y se repetiría por render.
 * · `display=swap` va en la URL: el texto se pinta al instante con la pila de
 *   respaldo y la letra buena entra cuando llega — nunca texto invisible.
 */
export function FuentesTema({ clave }: { clave?: string }) {
  const href = hrefFuentes(clave);
  if (!href) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={href} precedence="default" />
    </>
  );
}
