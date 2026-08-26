"use client";

/**
 * MÓDULO DINÁMICAS montado DENTRO del portal (cuarto módulo migrado).
 *
 * Es un pequeño "hub": el invitado elige juego y juega sin salir del portal.
 * La trivia comparte ranking por `@salones/sync` con el código del evento que
 * trae el portal; el bingo y el rompehielos son personales de cada teléfono.
 */
import * as React from "react";
import { ArrowLeft, Brain, ChevronRight, LayoutGrid, Users } from "lucide-react";
import { Card, cn } from "@salones/ui";
import { Trivia } from "./trivia";
import { Bingo } from "./bingo";
import { Rompehielos } from "./rompehielos";

type Juego = "trivia" | "bingo" | "rompehielos";

const JUEGOS: {
  id: Juego;
  nombre: string;
  descripcion: string;
  icono: React.ComponentType<{ className?: string }>;
  acento: string;
}[] = [
  {
    id: "trivia",
    nombre: "Trivia de los novios",
    descripcion: "¿Cuánto conoces a la pareja? Responde y sube al ranking.",
    icono: Brain,
    acento: "text-primary",
  },
  {
    id: "bingo",
    nombre: "Bingo de la fiesta",
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

export function DinamicasModulo({
  evento,
  nombreEvento,
}: {
  evento: string;
  nombreEvento: string;
}) {
  const [juego, setJuego] = React.useState<Juego | null>(null);

  if (juego) {
    return (
      <div>
        <button
          onClick={() => setJuego(null)}
          className="-ml-2 min-h-9 rounded-[var(--radius)] px-2 py-2 mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Elegir otro juego
        </button>
        {juego === "trivia" ? <Trivia evento={evento} /> : null}
        {juego === "bingo" ? <Bingo evento={evento} /> : null}
        {juego === "rompehielos" ? <Rompehielos evento={evento} /> : null}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Elige un juego para animar {nombreEvento}.
      </p>
      <div className="mt-4 space-y-3">
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
