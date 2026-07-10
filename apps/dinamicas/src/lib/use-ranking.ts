"use client";

import * as React from "react";
import { rankingInicial, nuevoId, type Jugador } from "@/lib/dinamicas";

const K_RANKING = "dinamicas-ranking";

/**
 * Ranking de la trivia compartido: la trivia agrega puntajes y el tablero del
 * anfitrión los muestra. Se guarda en localStorage y se sincroniza en vivo
 * entre pestañas del mismo navegador.
 */
export function useRanking() {
  const [ranking, setRanking] = React.useState<Jugador[]>([]);
  const [cargado, setCargado] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(K_RANKING);
      setRanking(raw ? JSON.parse(raw) : rankingInicial());
    } catch {
      setRanking(rankingInicial());
    }
    setCargado(true);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === K_RANKING && ev.newValue) {
        try {
          setRanking(JSON.parse(ev.newValue));
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (cargado) localStorage.setItem(K_RANKING, JSON.stringify(ranking));
  }, [ranking, cargado]);

  const agregar = React.useCallback((nombre: string, aciertos: number, total: number): string => {
    const id = nuevoId("J");
    setRanking((l) => [...l, { id, nombre, aciertos, total, fecha: Date.now() }]);
    return id;
  }, []);

  return { ranking, cargado, agregar };
}
