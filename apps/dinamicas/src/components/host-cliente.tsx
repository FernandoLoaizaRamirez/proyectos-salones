"use client";

import * as React from "react";
import {
  Share2,
  Brain,
  LayoutGrid,
  Users,
  Trophy,
  Crown,
  X,
  Copy,
  Check,
  MessageCircle,
  QrCode,
} from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { sufijoEvento } from "@salones/sync";
import { QR } from "@/components/qr";
import { useRanking } from "@/lib/use-ranking";
import { evento, porPuntaje } from "@/lib/dinamicas";

const JUEGOS = [
  { nombre: "Trivia de los novios", desc: "Preguntas sobre la pareja + ranking.", icono: Brain },
  { nombre: "Bingo de boda", desc: "Cartón de momentos de la fiesta.", icono: LayoutGrid },
  { nombre: "Encuentra a alguien que…", desc: "Rompehielos para conocerse.", icono: Users },
];

const medalla = ["text-amber-500", "text-zinc-400", "text-amber-700"];

export function HostCliente() {
  const { ranking, cargado } = useRanking();
  const [compartir, setCompartir] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);

  // El enlace para jugar lleva el código del evento actual (?e=...).
  React.useEffect(() => setUrl(`${window.location.origin}/jugar${sufijoEvento()}`), []);

  const top = [...ranking].sort(porPuntaje).slice(0, 10);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* noop */
    }
  };
  const invitar = () => {
    const msg = `¡A jugar en ${evento.nombre}! Trivia, bingo y más desde tu teléfono:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setCompartir(true)}>
          <Share2 className="size-4" /> Compartir para jugar
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
        {/* Los juegos */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Los juegos</h2>
          <div className="space-y-3">
            {JUEGOS.map((j) => {
              const Icono = j.icono;
              return (
                <Card key={j.nombre} className="flex items-center gap-4 p-5">
                  <div className="grid size-12 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
                    <Icono className="size-6" />
                  </div>
                  <div>
                    <div className="font-semibold">{j.nombre}</div>
                    <div className="text-sm text-muted-foreground">{j.desc}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Ranking en vivo */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-5 text-primary" /> Ranking de la trivia
          </h2>
          <Card className="p-4">
            {!cargado ? null : top.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún nadie juega. Comparte el código para empezar.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {top.map((j, i) => (
                  <li
                    key={j.id}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2",
                      i < 3 ? "bg-muted" : "",
                    )}
                  >
                    <span className="grid w-6 shrink-0 place-items-center">
                      {i < 3 ? (
                        <Crown className={cn("size-4", medalla[i])} />
                      ) : (
                        <span className="text-sm text-muted-foreground">{i + 1}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{j.nombre}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {j.aciertos}/{j.total}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">
            Se actualiza en vivo con lo que juegan los invitados desde sus teléfonos.
          </p>
        </div>
      </div>

      {/* Modal de compartir */}
      {compartir ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
          onClick={() => setCompartir(false)}
        >
          <Card className="w-full max-w-md p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <QrCode className="size-5 text-primary" /> Comparte los juegos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los invitados escanean el código y juegan desde su teléfono.
                </p>
              </div>
              <button
                onClick={() => setCompartir(false)}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
              <QR value={url || " "} size={132} />
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {url}
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={copiar} variant="outline" className="w-full">
                    {copiado ? (
                      <>
                        <Check className="size-4" /> ¡Enlace copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" /> Copiar enlace
                      </>
                    )}
                  </Button>
                  <Button onClick={invitar} className="w-full">
                    <MessageCircle className="size-4" /> Invitar por WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
