"use client";

/**
 * TRIVIA de los novios. El invitado responde y su puntaje entra al ranking
 * compartido del evento; al terminar ve su lugar y el podio en vivo.
 */
import * as React from "react";
import { ArrowRight, Check, RefreshCw, Trophy, X } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { TRIVIA_PREGUNTAS, porPuntaje } from "./lib";
import { useRanking } from "./use-ranking";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function Trivia({ evento }: { evento: string }) {
  const { ranking, agregar } = useRanking(evento);
  const [fase, setFase] = React.useState<"nombre" | "jugando" | "fin">("nombre");
  const [nombre, setNombre] = React.useState("");
  const [idx, setIdx] = React.useState(0);
  const [elegida, setElegida] = React.useState<number | null>(null);
  const [aciertos, setAciertos] = React.useState(0);
  const [miId, setMiId] = React.useState<string | null>(null);

  const total = TRIVIA_PREGUNTAS.length;
  const pregunta = TRIVIA_PREGUNTAS[idx];

  const empezar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setFase("jugando");
  };

  const responder = (opcion: number) => {
    if (elegida !== null || !pregunta) return;
    setElegida(opcion);
    if (opcion === pregunta.correcta) setAciertos((a) => a + 1);
  };

  const siguiente = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setElegida(null);
      return;
    }
    setMiId(agregar(nombre.trim(), aciertos, total));
    setFase("fin");
  };

  const otraVez = () => {
    setFase("nombre");
    setNombre("");
    setIdx(0);
    setElegida(null);
    setAciertos(0);
    setMiId(null);
  };

  if (fase === "nombre") {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Trivia de los novios</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} preguntas sobre la pareja. ¿Cuánto los conoces?
        </p>
        <form onSubmit={empezar} className="mt-4 space-y-3">
          <input
            className={campo}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            maxLength={40}
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={!nombre.trim()}>
            Empezar
          </Button>
        </form>
      </Card>
    );
  }

  if (fase === "fin") {
    const ordenado = [...ranking].sort(porPuntaje);
    const posicion = ordenado.findIndex((j) => j.id === miId) + 1;
    const podio = ordenado.slice(0, 5);
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Trophy className="size-7" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">
          {aciertos} de {total} correctas
        </h2>
        <p className="mt-1 text-muted-foreground">
          {aciertos === total
            ? "¡Perfecto! Conoces a los novios mejor que nadie."
            : aciertos >= total / 2
              ? "¡Muy bien! Se nota que los quieres."
              : "¡Gracias por jugar! Ya habrá revancha."}
        </p>
        {posicion > 0 ? (
          <p className="mt-3 text-sm">
            Vas en el lugar <span className="font-semibold text-primary">#{posicion}</span> del
            ranking.
          </p>
        ) : null}

        {podio.length > 0 ? (
          <div className="mt-6 text-left">
            <h3 className="mb-2 text-sm font-semibold">Los que más saben</h3>
            <ol className="space-y-1">
              {podio.map((j, i) => (
                <li
                  key={j.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-2 text-sm",
                    j.id === miId ? "bg-primary/10 font-medium text-primary" : "bg-muted/50",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 text-muted-foreground">{i + 1}</span>
                    <span className="truncate">{j.nombre}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {j.aciertos}/{j.total}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <Button onClick={otraVez} variant="outline" className="mt-6">
          <RefreshCw className="size-4" /> Jugar otra vez
        </Button>
      </Card>
    );
  }

  // fase === "jugando"
  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Pregunta {idx + 1} de {total}
        </span>
        <span>{aciertos} aciertos</span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((idx + (elegida !== null ? 1 : 0)) / total) * 100}%` }}
        />
      </div>
      <h2 className="text-lg font-semibold">{pregunta?.pregunta}</h2>
      <div className="mt-4 space-y-2">
        {pregunta?.opciones.map((op, i) => {
          const esCorrecta = i === pregunta.correcta;
          const mostrar = elegida !== null;
          return (
            <button
              key={i}
              onClick={() => responder(i)}
              disabled={mostrar}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-[var(--radius)] border px-4 py-3 text-left text-sm transition-colors",
                !mostrar && "border-border hover:border-ring hover:bg-muted",
                mostrar && esCorrecta && "border-green-500/50 bg-green-500/10 text-green-600",
                mostrar &&
                  !esCorrecta &&
                  i === elegida &&
                  "border-red-500/50 bg-red-500/10 text-red-600",
                mostrar && !esCorrecta && i !== elegida && "border-border opacity-60",
              )}
            >
              <span>{op}</span>
              {mostrar && esCorrecta ? <Check className="size-4 shrink-0" /> : null}
              {mostrar && !esCorrecta && i === elegida ? <X className="size-4 shrink-0" /> : null}
            </button>
          );
        })}
      </div>
      {elegida !== null ? (
        <Button onClick={siguiente} className="mt-4 w-full">
          {idx + 1 < total ? (
            <>
              Siguiente <ArrowRight className="size-4" />
            </>
          ) : (
            <>Ver resultado</>
          )}
        </Button>
      ) : null}
    </Card>
  );
}
