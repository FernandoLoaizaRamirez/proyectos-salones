"use client";

/**
 * DE DÓNDE SALEN LOS DATOS DE ESTA INVITACIÓN.
 *
 * La app se abre de tres maneras y las tres tienen que verse bien:
 *
 *   1. Sin código (`/`) → la MUESTRA. Es la demo del catálogo: nombres de
 *      ejemplo, para enseñar el producto. Igual que antes.
 *   2. Con código (`/?e=boda-garcia-x7k2`) y con datos capturados → la
 *      invitación DE VERDAD, tal como la dejó el salón en su panel.
 *   3. Con código pero sin capturar nada todavía → una portada sobria que dice
 *      que se está preparando. **No la muestra**: enseñar "Ana & Rodrigo" a los
 *      invitados de otra boda sería peor que no enseñar nada.
 *
 * Se lee con `listar` (la colección entera) y no con `suscribir`: una invitación
 * no cambia mientras el invitado la tiene abierta, así que sondear cada pocos
 * segundos sería gastar batería y datos del teléfono de un invitado para nada.
 */
import * as React from "react";
import {
  COLECCION_INVITACION,
  invitacionDe,
  invitacionTieneContenido,
  type Invitacion,
} from "@salones/core";
import { eventoActual, obtenerSync } from "@salones/sync";
import { INVITACION_DEMO } from "./invitacion";

export type EstadoInvitacion =
  | { fase: "cargando" }
  /** La muestra del catálogo (sin código, o el evento "demo"). */
  | { fase: "muestra"; inv: Invitacion; codigo: string }
  /** La invitación de un evento real. */
  | { fase: "lista"; inv: Invitacion; codigo: string }
  /** Hay evento, pero el salón todavía no ha capturado nada. */
  | { fase: "preparando"; codigo: string };

export function useInvitacion(): EstadoInvitacion {
  const [estado, setEstado] = React.useState<EstadoInvitacion>({ fase: "cargando" });

  React.useEffect(() => {
    let vivo = true;
    const codigo = eventoActual();

    (async () => {
      let inv: Invitacion | null = null;
      try {
        const items = await obtenerSync().listar(codigo, COLECCION_INVITACION);
        inv = invitacionDe(codigo, items);
      } catch {
        // Sin red o sin servidor: se sigue al plan B de abajo, que para la
        // vitrina es la muestra y para un evento real es "preparando".
        inv = null;
      }
      if (!vivo) return;

      if (inv && invitacionTieneContenido(inv)) {
        setEstado({ fase: "lista", inv, codigo });
      } else if (codigo === "demo") {
        setEstado({ fase: "muestra", inv: INVITACION_DEMO, codigo });
      } else {
        setEstado({ fase: "preparando", codigo });
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  return estado;
}
