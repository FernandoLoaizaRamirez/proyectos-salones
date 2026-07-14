"use client";

import * as React from "react";
import { obtenerSync } from "@salones/sync";
import {
  rankingInicial,
  nuevoId,
  EVENTO_ID,
  COLECCION_RANKING,
  type Jugador,
} from "@/lib/dinamicas";

/**
 * Ranking de la trivia compartido a través del "lugar central" (@salones/sync):
 * la trivia agrega puntajes y el tablero del anfitrión los muestra. En local se
 * sincroniza entre pestañas del mismo dispositivo; con el servicio gestionado,
 * entre los teléfonos de todos los invitados. Mismo código.
 */
export function useRanking() {
  const [ranking, setRanking] = React.useState<Jugador[]>([]);
  const [cargado, setCargado] = React.useState(false);

  React.useEffect(() => {
    const sync = obtenerSync();
    const cancelar = sync.suscribir<Jugador>(EVENTO_ID, COLECCION_RANKING, setRanking);
    setCargado(true);

    // Solo en la demo local: si el ranking está vacío, lo sembramos con ejemplos.
    if (sync.nombre === "local") {
      sync.listar<Jugador>(EVENTO_ID, COLECCION_RANKING).then((items) => {
        if (items.length === 0) {
          for (const j of rankingInicial()) {
            void sync.guardar(EVENTO_ID, COLECCION_RANKING, j);
          }
        }
      });
    }
    return cancelar;
  }, []);

  const agregar = React.useCallback((nombre: string, aciertos: number, total: number): string => {
    const id = nuevoId("J");
    void obtenerSync().guardar(EVENTO_ID, COLECCION_RANKING, {
      id,
      nombre,
      aciertos,
      total,
      fecha: Date.now(),
    });
    return id;
  }, []);

  return { ranking, cargado, agregar };
}
