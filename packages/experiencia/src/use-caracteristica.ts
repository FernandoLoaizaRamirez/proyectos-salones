"use client";

/**
 * ¿ESTE EVENTO TIENE ENCENDIDO ESTE DETALLE? (`album.descargas`, `muro.fotos`…)
 *
 * Es el hermano de `useTieneVideo` del álbum, pero con la duda resuelta al
 * revés: el video CUESTA dinero y ante la duda se esconde; estas
 * características vienen INCLUIDAS en su módulo salvo que el salón las venda
 * aparte, así que ante la duda se enseñan. Esconderlas mientras carga —o en la
 * demo, o con la red floja— le quitaría al invitado algo que su evento sí
 * incluye.
 *
 * Por eso arranca en `true`: en la inmensa mayoría de los eventos la respuesta
 * es que sí (la hereda de su módulo), y así no parpadea. Cuando un salón la
 * haya vendido aparte, el control desaparece en cuanto llega la respuesta.
 *
 * ⚠️ Esto NO es el candado, solo decide qué se dibuja.
 */
import * as React from "react";
import { eventoActual, eventoTieneCaracteristica } from "@salones/sync";

export function useCaracteristica(clave: string): boolean {
  const [tiene, setTiene] = React.useState(true);

  React.useEffect(() => {
    let vivo = true;
    void eventoTieneCaracteristica(eventoActual(), clave).then((si) => {
      if (vivo) setTiene(si);
    });
    return () => {
      vivo = false;
    };
  }, [clave]);

  return tiene;
}
