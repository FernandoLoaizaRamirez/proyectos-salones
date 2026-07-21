"use client";

/**
 * ROMPEHIELOS "encuentra a alguien que…": el invitado habla con la gente y anota
 * quién cumple cada reto. Personal de cada teléfono y guardado POR EVENTO.
 */
import * as React from "react";
import { Check, PartyPopper, RefreshCw } from "lucide-react";
import { Card, cn } from "@salones/ui";
import { ROMPEHIELOS_RETOS, claveRompehielos } from "./lib";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function Rompehielos({ evento }: { evento: string }) {
  const [respuestas, setRespuestas] = React.useState<Record<string, string>>({});

  // Lo anotado en ESTE teléfono para ESTE evento.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(claveRompehielos(evento));
      setRespuestas(raw ? (JSON.parse(raw) as Record<string, string>) : {});
    } catch {
      setRespuestas({});
    }
  }, [evento]);

  // Se guarda al escribir (no en un efecto), para no mezclar eventos.
  const guardar = (siguiente: Record<string, string>) => {
    setRespuestas(siguiente);
    try {
      localStorage.setItem(claveRompehielos(evento), JSON.stringify(siguiente));
    } catch {
      /* sin espacio: los retos siguen funcionando en esta pantalla */
    }
  };

  const anotar = (id: string, valor: string) => guardar({ ...respuestas, [id]: valor });
  const reiniciar = () => guardar({});

  const completados = ROMPEHIELOS_RETOS.filter((r) => (respuestas[r.id] ?? "").trim()).length;
  const todo = completados === ROMPEHIELOS_RETOS.length;

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
          aria-label="Reiniciar retos"
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
        {ROMPEHIELOS_RETOS.map((r) => {
          const hecho = (respuestas[r.id] ?? "").trim().length > 0;
          return (
            <div key={r.id}>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium" htmlFor={r.id}>
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
              </label>
              <input
                id={r.id}
                className={campo}
                value={respuestas[r.id] ?? ""}
                onChange={(e) => anotar(r.id, e.target.value)}
                placeholder="¿Quién?"
                maxLength={40}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {completados} de {ROMPEHIELOS_RETOS.length} retos completados
      </p>
    </Card>
  );
}
