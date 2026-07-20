"use client";

/**
 * Ranking de la trivia, compartido por `@salones/sync` con el código del evento
 * que trae el portal: en local se sincroniza entre pestañas del mismo teléfono;
 * con el servicio gestionado, entre los teléfonos de TODOS los invitados (y con
 * el tablero del anfitrión, que sigue en la app `dinamicas`). Mismo código.
 */
import * as React from "react";
import { obtenerSync } from "@salones/sync";
import { COLECCION_RANKING, nuevoIdJugador, rankingDemo, type Jugador } from "./lib";

export function useRanking(evento: string) {
  const [ranking, setRanking] = React.useState<Jugador[]>([]);

  React.useEffect(() => {
    const sync = obtenerSync();
    const cancelar = sync.suscribir<Jugador>(evento, COLECCION_RANKING, setRanking);

    // Solo en la vitrina (evento "demo" sin servidor): si el tablero está vacío,
    // se siembra con jugadores de ejemplo. Un evento REAL nunca los ve.
    if (evento === "demo" && sync.nombre === "local") {
      void sync.listar<Jugador>(evento, COLECCION_RANKING).then((items) => {
        if (items.length === 0) {
          for (const j of rankingDemo()) void sync.guardar(evento, COLECCION_RANKING, j);
        }
      });
    }
    return cancelar;
  }, [evento]);

  const agregar = React.useCallback(
    (nombre: string, aciertos: number, total: number): string => {
      const id = nuevoIdJugador();
      void obtenerSync().guardar(evento, COLECCION_RANKING, {
        id,
        nombre,
        aciertos,
        total,
        fecha: Date.now(),
      });
      return id;
    },
    [evento],
  );

  return { ranking, agregar };
}
