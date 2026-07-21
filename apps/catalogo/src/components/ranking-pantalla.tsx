"use client";

/**
 * RANKING PROYECTADO — el marcador de la trivia en la pantalla del salón.
 *
 * Es el momento que la gente disfruta: ver su nombre subir mientras juegan. La
 * lista llega en vivo desde arriba, así que la pantalla se actualiza sola cada
 * vez que alguien termina su partida. Se sale con Esc o con la X.
 */
import * as React from "react";
import { Crown, QrCode, Trophy, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { porPuntaje, type Jugador } from "@/lib/dinamicas";

const MEDALLA = ["text-amber-500", "text-zinc-400", "text-amber-700"];

export function RankingPantalla({
  jugadores,
  nombreEvento,
  urlJugar,
  onClose,
}: {
  jugadores: Jugador[];
  nombreEvento: string;
  urlJugar: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const top = [...jugadores].sort(porPuntaje).slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-8 py-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Trophy className="size-4" /> Trivia de los novios
          </div>
          <div className="text-2xl font-semibold tracking-tight">{nombreEvento}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Salir del modo pantalla"
          className="grid size-11 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-8 pb-4">
        {top.length === 0 ? (
          <div className="text-center">
            <p className="text-3xl font-semibold tracking-tight">Aún nadie juega</p>
            <p className="mt-3 text-muted-foreground">
              Escanea el código y sé el primero en el marcador.
            </p>
          </div>
        ) : (
          <ol className="w-full max-w-3xl space-y-2">
            {top.map((j, i) => (
              <li
                key={j.id}
                className={`flex items-center gap-5 rounded-2xl px-6 py-3 ${
                  i < 3 ? "bg-muted" : ""
                }`}
              >
                <span className="grid w-10 shrink-0 place-items-center">
                  {i < 3 ? (
                    <Crown className={`size-7 ${MEDALLA[i]}`} />
                  ) : (
                    <span className="text-2xl text-muted-foreground">{i + 1}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-2xl font-medium sm:text-3xl">
                  {j.nombre}
                </span>
                <span className="shrink-0 text-2xl font-semibold text-primary sm:text-3xl">
                  {j.aciertos}
                  <span className="text-lg text-muted-foreground">/{j.total}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG
              value={urlJugar || " "}
              size={72}
              level="M"
              marginSize={0}
              fgColor="#111111"
              bgColor="#ffffff"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 font-medium">
              <QrCode className="size-4 text-primary" /> Escanea para jugar
            </div>
            <div className="text-sm text-muted-foreground">
              Tu nombre puede aparecer en esta pantalla.
            </div>
          </div>
        </div>
        {jugadores.length > 0 ? (
          <div className="hidden text-sm text-muted-foreground sm:block">
            {jugadores.length} {jugadores.length === 1 ? "jugador" : "jugadores"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
