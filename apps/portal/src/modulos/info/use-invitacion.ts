"use client";

/**
 * La invitación del evento, viva para los componentes de información.
 *
 * Una sola lectura al montar (la información del evento no cambia mientras el
 * invitado la mira; sondear gastaría sus datos para nada). Arranca en
 * "cargando" para que los módulos no parpadeen su aviso de "en preparación"
 * antes de saber si de verdad no hay nada.
 */
import * as React from "react";
import { cargarInvitacion, type Invitacion } from "./lib";

export function useInvitacion(evento: string): Invitacion | null | "cargando" {
  const [inv, setInv] = React.useState<Invitacion | null | "cargando">("cargando");

  React.useEffect(() => {
    let vivo = true;
    cargarInvitacion(evento).then((resultado) => {
      if (vivo) setInv(resultado);
    });
    return () => {
      vivo = false;
    };
  }, [evento]);

  return inv;
}
