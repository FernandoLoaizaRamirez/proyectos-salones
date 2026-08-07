"use client";

import * as React from "react";
import { Check, RefreshCw, PartyPopper } from "lucide-react";
import { Button, Card, cn, guardarLocal } from "@salones/ui";
import { bingoCasillas, BINGO_LADO, hayLineaBingo, bingoCompleto } from "@/lib/dinamicas";

const K_BINGO = "dinamicas-bingo";

export function BingoJuego() {
  const [marcadas, setMarcadas] = React.useState<boolean[]>(() =>
    bingoCasillas.map(() => false),
  );
  const [cargado, setCargado] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(K_BINGO);
      const guardado = raw ? (JSON.parse(raw) as boolean[]) : null;
      if (guardado && guardado.length === bingoCasillas.length) setMarcadas(guardado);
    } catch {
      /* noop */
    }
    setCargado(true);
  }, []);

  React.useEffect(() => {
    if (cargado) guardarLocal(K_BINGO, JSON.stringify(marcadas));
  }, [marcadas, cargado]);

  const alternar = (i: number) =>
    setMarcadas((m) => m.map((v, j) => (j === i ? !v : v)));
  const reiniciar = () => setMarcadas(bingoCasillas.map(() => false));

  const completo = bingoCompleto(marcadas);
  const linea = hayLineaBingo(marcadas);
  const cuantas = marcadas.filter(Boolean).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bingo de boda</h2>
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
            completo
              ? "bg-primary/15 text-primary"
              : "bg-green-500/10 text-green-600",
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
        {bingoCasillas.map((c, i) => {
          const on = marcadas[i] ?? false;
          return (
            <button
              key={c.id}
              onClick={() => alternar(i)}
              className={cn(
                "relative aspect-square rounded-[var(--radius)] border p-1.5 text-center text-[11px] leading-tight transition-colors sm:text-xs",
                on
                  ? "border-primary bg-primary/15 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="flex size-full items-center justify-center">{c.texto}</span>
              {on ? (
                <Check className="absolute right-1 top-1 size-3.5 text-primary" />
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {cuantas} de {bingoCasillas.length} momentos marcados
      </p>
    </Card>
  );
}
