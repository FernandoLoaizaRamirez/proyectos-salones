"use client";

/**
 * BINGO de la fiesta: un cartón 4×4 de momentos que el invitado va marcando.
 * Es personal de cada teléfono (no se comparte), y se guarda POR EVENTO para
 * que quien va a dos bodas no encuentre el cartón de la otra a medio marcar.
 */
import * as React from "react";
import { Check, PartyPopper, RefreshCw } from "lucide-react";
import { Card, cn } from "@salones/ui";
import {
  BINGO_CASILLAS,
  BINGO_LADO,
  bingoCompleto,
  claveBingo,
  hayLineaBingo,
} from "./lib";

const VACIO = () => BINGO_CASILLAS.map(() => false);

export function Bingo({ evento }: { evento: string }) {
  const [marcadas, setMarcadas] = React.useState<boolean[]>(VACIO);

  // El cartón guardado en ESTE teléfono para ESTE evento.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(claveBingo(evento));
      const guardado = raw ? (JSON.parse(raw) as boolean[]) : null;
      setMarcadas(guardado?.length === BINGO_CASILLAS.length ? guardado : VACIO());
    } catch {
      setMarcadas(VACIO());
    }
  }, [evento]);

  // Se guarda al marcar (no en un efecto), para no escribir nunca el cartón de
  // un evento bajo la clave de otro.
  const guardar = (siguiente: boolean[]) => {
    setMarcadas(siguiente);
    try {
      localStorage.setItem(claveBingo(evento), JSON.stringify(siguiente));
    } catch {
      /* sin espacio: el cartón sigue funcionando en esta pantalla */
    }
  };

  const alternar = (i: number) => guardar(marcadas.map((v, j) => (j === i ? !v : v)));
  const reiniciar = () => guardar(VACIO());

  const completo = bingoCompleto(marcadas);
  const linea = hayLineaBingo(marcadas);
  const cuantas = marcadas.filter(Boolean).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bingo de la fiesta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Marca cada momento cuando ocurra. ¡Grita “bingo” al hacer una línea!
          </p>
        </div>
        <button
          onClick={reiniciar}
          aria-label="Reiniciar cartón"
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {completo || linea ? (
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium",
            completo ? "bg-primary/15 text-primary" : "bg-green-500/10 text-green-600",
          )}
        >
          <PartyPopper className="size-4" />
          {completo ? "¡Bingo completo! Cartón lleno 🎉" : "¡Línea! Ya casi lo tienes."}
        </div>
      ) : null}

      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${BINGO_LADO}, minmax(0, 1fr))` }}
      >
        {BINGO_CASILLAS.map((c, i) => {
          const on = marcadas[i] ?? false;
          return (
            <button
              key={c.id}
              onClick={() => alternar(i)}
              aria-pressed={on}
              className={cn(
                // `font-medium` siempre y palomita abajo: si no, el texto
                // engordaba al marcar y brincaba de renglon, y la palomita se
                // montaba sobre la ultima letra.
                "relative aspect-square rounded-[var(--radius)] border p-1.5 text-center text-xs font-medium leading-tight transition-colors",
                on
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {/* El mismo relleno esté marcada o no: con `pb-3` solo al marcar,
                  la casilla más larga ("Zapatos fuera para bailar") perdía 12 px
                  justo cuando aparecía la palomita y la última palabra se le
                  montaba encima. */}
              <span className="flex size-full items-center justify-center pb-3">
                {c.texto}
              </span>
              {on ? <Check className="absolute bottom-1 right-1 size-3.5 text-primary" /> : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {cuantas} de {BINGO_CASILLAS.length} momentos marcados
      </p>
    </Card>
  );
}
