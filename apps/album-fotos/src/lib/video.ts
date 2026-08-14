"use client";

/**
 * ¿Este evento tiene contratado el PAQUETE DE VIDEO? (migración 0017)
 *
 * Vive aquí, y no dentro de cada componente, porque hay TRES sitios de esta app
 * que tienen que decir lo mismo: el texto de la portada, la tarjeta de compartir
 * y la zona de subir. Si cada uno lo preguntara por su cuenta, tarde o temprano
 * uno se quedaría prometiendo videos que el servidor va a rechazar.
 *
 * ⚠️ Esto NO es el candado, solo decide qué se dibuja. Quien de verdad niega la
 * subida de un video es `media-subir` en el servidor, aunque alguien manipule
 * esta pantalla. Igual que pasa con `esAnfitrion` y el botón de borrar.
 */
import * as React from "react";
import { eventoActual, eventoTieneFuncion } from "@salones/sync";
import { FEATURES_CONOCIDAS as F } from "@salones/core";

export function useTieneVideo(): boolean {
  // Arranca en `false` a propósito: ante la duda se esconde. Enseñar un botón de
  // video que el servidor va a rechazar es peor que no enseñarlo, porque el
  // invitado graba el momento, lo intenta subir y lo pierde.
  const [tiene, setTiene] = React.useState(false);

  React.useEffect(() => {
    let vivo = true;
    void eventoTieneFuncion(eventoActual(), F.Video).then((si) => {
      if (vivo) setTiene(si);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return tiene;
}
