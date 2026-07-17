"use client";

import * as React from "react";
import { obtenerSync, eventoActual } from "@salones/sync";
import {
  rankingInicial,
  nuevoId,
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
    const eventoId = eventoActual();
    const sync = obtenerSync();
    const cancelar = sync.suscribir<Jugador>(eventoId, COLECCION_RANKING, setRanking);
    setCargado(true);

    // Solo en la demo local: si el ranking está vacío, lo sembramos con ejemplos.
    if (sync.nombre === "local") {
      sync.listar<Jugador>(eventoId, COLECCION_RANKING).then((items) => {
        if (items.length === 0) {
          for (const j of rankingInicial()) {
            void sync.guardar(eventoId, COLECCION_RANKING, j);
          }
        }
      });
    }
    return cancelar;
  }, []);

  const agregar = React.useCallback((nombre: string, aciertos: number, total: number): string => {
    const id = nuevoId("J");
    void obtenerSync().guardar(eventoActual(), COLECCION_RANKING, {
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
