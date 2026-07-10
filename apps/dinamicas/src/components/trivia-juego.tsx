"use client";

import * as React from "react";
import { Check, X, Trophy, ArrowRight, RefreshCw } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { useRanking } from "@/lib/use-ranking";
import { triviaPreguntas, porPuntaje } from "@/lib/dinamicas";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function TriviaJuego() {
  const { ranking, agregar } = useRanking();
  const [fase, setFase] = React.useState<"nombre" | "jugando" | "fin">("nombre");
  const [nombre, setNombre] = React.useState("");
  const [idx, setIdx] = React.useState(0);
  const [elegida, setElegida] = React.useState<number | null>(null);
  const [aciertos, setAciertos] = React.useState(0);
  const [miId, setMiId] = React.useState<string | null>(null);

  const total = triviaPreguntas.length;
  const pregunta = triviaPreguntas[idx];

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
    } else {
      const id = agregar(nombre.trim(), aciertos, total);
      setMiId(id);
      setFase("fin");
    }
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
          {total} preguntas sobre Ana y Rodrigo. ¿Cuánto los conoces?
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
              {mostrar && !esCorrecta && i === elegida ? (
                <X className="size-4 shrink-0" />
              ) : null}
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
