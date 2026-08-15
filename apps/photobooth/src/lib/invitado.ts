"use client";

/**
 * QUIÉN SE ESTÁ TOMANDO LA FOTO — el invitado del enlace personal.
 *
 * El anfitrión reparte a cada invitado un enlace con su nombre y sus lugares
 * empaquetados en el FRAGMENTO (`#`). El fragmento NUNCA viaja al servidor —es
 * el mismo truco del RSVP del portal y de la invitación—, así que la identidad
 * del invitado se queda en su teléfono.
 *
 * Y como al volver a abrir el enlace muchas veces ya no viene el `#` (se pierde
 * al copiarlo a medias o al llegar por otra puerta), lo leído se guarda en
 * localStorage: quien llegó una vez con su enlace sigue siendo él aunque
 * regrese por el QR de las mesas.
 *
 * Sin hash y sin nada guardado, el hook devuelve `null` y el photobooth sigue
 * igual que siempre: la foto se guarda sin nombre. Aquí NO se pide el nombre a
 * mano a propósito — el photobooth es un juego rápido, no un formulario.
 */
import * as React from "react";
import {
  codificarInvitadoEnlace,
  decodificarInvitadoEnlace,
  leerInvitadoDeHash,
  type InvitadoEnlace,
} from "@salones/core";

/** Una llave por evento: el mismo teléfono puede estar invitado a dos bodas. */
const clave = (codigo: string) => `photobooth:invitado:${codigo}`;

export function useInvitadoPersonal(codigo: string | null): InvitadoEnlace | null {
  const [invitado, setInvitado] = React.useState<InvitadoEnlace | null>(null);

  React.useEffect(() => {
    // Sin código todavía (el evento sigue cargando) no hay dónde buscar.
    if (!codigo) return;

    const leer = () => {
      const delHash = leerInvitadoDeHash(window.location.hash);
      if (delHash) {
        // Se guarda EMPAQUETADO, en el mismo formato del enlace: al leerlo de
        // vuelta lo valida `decodificarInvitadoEnlace` gratis, en vez de
        // confiar en un JSON propio que habría que revisar a mano.
        try {
          localStorage.setItem(clave(codigo), codificarInvitadoEnlace(delHash));
        } catch {
          /* sin almacenamiento: el invitado vale mientras dure esta visita */
        }
        setInvitado(delHash);
        return;
      }
      // Sin hash (o con uno roto): cae a lo persistido de una visita anterior.
      let guardado: InvitadoEnlace | null = null;
      try {
        const crudo = localStorage.getItem(clave(codigo));
        if (crudo) guardado = decodificarInvitadoEnlace(crudo);
      } catch {
        /* modo privado o storage bloqueado: simplemente no hay invitado */
      }
      setInvitado(guardado);
    };

    leer();
    // Si sobre la misma pestaña se pega OTRO enlace personal, se reconoce sin
    // recargar la página.
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, [codigo]);

  return invitado;
}
