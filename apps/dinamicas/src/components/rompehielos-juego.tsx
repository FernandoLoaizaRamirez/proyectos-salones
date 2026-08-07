"use client";

import * as React from "react";
import { Check, RefreshCw, PartyPopper } from "lucide-react";
import { Card, cn, guardarLocal } from "@salones/ui";
import { rompehielosRetos } from "@/lib/dinamicas";

const K_ROMPE = "dinamicas-rompehielos";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function RompehielosJuego() {
  const [respuestas, setRespuestas] = React.useState<Record<string, string>>({});
  const [cargado, setCargado] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(K_ROMPE);
      setRespuestas(raw ? JSON.parse(raw) : {});
    } catch {
      setRespuestas({});
    }
    setCargado(true);
  }, []);

  React.useEffect(() => {
    if (cargado) guardarLocal(K_ROMPE, JSON.stringify(respuestas));
  }, [respuestas, cargado]);

  const set = (id: string, valor: string) => setRespuestas((r) => ({ ...r, [id]: valor }));
  const reiniciar = () => setRespuestas({});

  const completados = rompehielosRetos.filter((r) => (respuestas[r.id] ?? "").trim()).length;
  const todo = completados === rompehielosRetos.length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Encuentra a alguien que…</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Habla con los invitados y anota el nombre de quien cumple cada reto.
          </p>
        </div>
        <button
          onClick={reiniciar}
          aria-label="Reiniciar"
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {todo ? (
        <div className="mt-4 flex items-center gap-2 rounded-[var(--radius)] bg-primary/15 px-4 py-2.5 text-sm font-medium text-primary">
          <PartyPopper className="size-4" /> ¡Completaste todos los retos! 🎉
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {rompehielosRetos.map((r) => {
          const hecho = (respuestas[r.id] ?? "").trim().length > 0;
          return (
            <div key={r.id}>
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                    hecho
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="size-3" />
                </span>
                {r.texto}
              </div>
              <input
                className={campo}
                value={respuestas[r.id] ?? ""}
                onChange={(e) => set(r.id, e.target.value)}
                placeholder="¿Quién?"
                maxLength={40}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {completados} de {rompehielosRetos.length} retos completados
      </p>
    </Card>
  );
}
