"use client";

import * as React from "react";
import { Brain, LayoutGrid, Users, ArrowLeft, ChevronRight } from "lucide-react";
import { Card, cn } from "@salones/ui";
import { TriviaJuego } from "@/components/trivia-juego";
import { BingoJuego } from "@/components/bingo-juego";
import { RompehielosJuego } from "@/components/rompehielos-juego";

type Juego = "hub" | "trivia" | "bingo" | "rompehielos";

const JUEGOS: {
  id: Exclude<Juego, "hub">;
  nombre: string;
  descripcion: string;
  icono: React.ComponentType<{ className?: string }>;
  acento: string;
}[] = [
  {
    id: "trivia",
    nombre: "Trivia de los novios",
    descripcion: "¿Cuánto conoces a Ana y Rodrigo? Responde y sube al ranking.",
    icono: Brain,
    acento: "text-primary",
  },
  {
    id: "bingo",
    nombre: "Bingo de boda",
    descripcion: "Marca los momentos de la fiesta y grita “bingo”.",
    icono: LayoutGrid,
    acento: "text-green-600",
  },
  {
    id: "rompehielos",
    nombre: "Encuentra a alguien que…",
    descripcion: "Conoce a otros invitados completando los retos.",
    icono: Users,
    acento: "text-amber-600",
  },
];

export function JugarCliente() {
  const [juego, setJuego] = React.useState<Juego>("hub");

  if (juego !== "hub") {
    return (
      <div className="w-full max-w-lg">
        <button
          onClick={() => setJuego("hub")}
          /* `-ml-2 px-2 py-2`: este boton medía 20 px de alto y es el unico camino
             de vuelta; con una copa en la otra mano no se le atinaba. El texto
             queda en el mismo sitio. */
          className="-ml-2 mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius)] px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Elegir otro juego
        </button>
        {juego === "trivia" ? <TriviaJuego /> : null}
        {juego === "bingo" ? <BingoJuego /> : null}
        {juego === "rompehielos" ? <RompehielosJuego /> : null}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      <div className="text-center">
        <p className="text-sm font-medium text-primary">Dinámicas y juegos</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">¡A jugar!</h1>
        <p className="mt-1 text-muted-foreground">Elige un juego para animar la fiesta.</p>
      </div>
      <div className="mt-8 space-y-3">
        {JUEGOS.map((j) => {
          const Icono = j.icono;
          return (
            <button key={j.id} onClick={() => setJuego(j.id)} className="w-full text-left">
              <Card className="flex items-center gap-4 p-5 transition-colors hover:border-ring">
                <div
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-[var(--radius)] bg-muted",
                    j.acento,
                  )}
                >
                  <Icono className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{j.nombre}</div>
                  <div className="text-sm text-muted-foreground">{j.descripcion}</div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
