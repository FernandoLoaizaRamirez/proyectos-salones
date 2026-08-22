"use client";

/**
 * Ranking de la trivia, compartido por `@salones/sync` con el código del evento
 * que trae el portal: en local se sincroniza entre pestañas del mismo teléfono;
 * con el servicio gestionado, entre los teléfonos de TODOS los invitados (y con
 * el tablero del anfitrión, que sigue en la app `dinamicas`). Mismo código.
 */
import * as React from "react";
import { obtenerSync, esVitrina, esVitrinaPropia, idDeEjemplo } from "@salones/sync";
import { COLECCION_RANKING, nuevoIdJugador, rankingDemo, type Jugador } from "./lib";

export function useRanking(evento: string) {
  const [ranking, setRanking] = React.useState<Jugador[]>([]);

  React.useEffect(() => {
    const sync = obtenerSync();
    const cancelar = sync.suscribir<Jugador>(evento, COLECCION_RANKING, setRanking);

    /*
     * Solo en la vitrina: si el tablero está vacío, se siembra con jugadores de
     * ejemplo. Un evento REAL nunca los ve.
     *
     * Los ids VAN CON EL SUFIJO DE LA VITRINA. Se sembraban tal cual —J-DEMO1…
     * J-DEMO5— y `items.id` es llave primaria GLOBAL: dos visitantes con
     * vitrinas distintas escribían las MISMAS cinco filas, así que el segundo
     * pisaba el tablero del primero. Con el sufijo, cada quien tiene el suyo.
     * Es el mismo patrón que ya usan el muro, la playlist y el acomodo de mesas.
     */
    if (esVitrina(evento) && (sync.nombre === "local" || esVitrinaPropia(evento))) {
      void sync.listar<Jugador>(evento, COLECCION_RANKING).then((items) => {
        if (items.length === 0) {
          for (const j of rankingDemo()) {
            void sync.guardar(evento, COLECCION_RANKING, {
              ...j,
              id: idDeEjemplo(j.id, evento),
            });
          }
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
