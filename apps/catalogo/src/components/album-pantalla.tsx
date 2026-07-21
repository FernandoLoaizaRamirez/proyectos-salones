"use client";

/**
 * ÁLBUM PROYECTADO — las fotos de los invitados en la pantalla del salón.
 *
 * Va pasando las fotos solas, con el QR fijo para que la gente siga subiendo.
 * Las que llegan nuevas entran a la rotación sin tocar nada (la lista viene en
 * vivo desde arriba). Se sale con Esc o con la X; las flechas ← → dejan
 * detenerse en una foto y reinician el turno desde ahí.
 *
 * Los videos se saltan a propósito: en una proyección de fondo, un video mudo a
 * medias distrae más que suma. Se ven desde el álbum, no desde aquí.
 */
import * as React from "react";
import { Camera, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { esVideo, type Foto } from "@/lib/album";

/** Cuánto dura cada foto en pantalla. */
const TURNO_MS = 8000;

export function AlbumPantalla({
  fotos,
  nombreEvento,
  urlSubir,
  onClose,
}: {
  fotos: Foto[];
  nombreEvento: string;
  urlSubir: string;
  onClose: () => void;
}) {
  const soloFotos = React.useMemo(() => fotos.filter((f) => !esVideo(f.tipo)), [fotos]);
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const mover = React.useCallback(
    (d: number) => {
      setI((n) => (soloFotos.length ? (n + d + soloFotos.length) % soloFotos.length : 0));
    },
    [soloFotos.length],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") mover(1);
      else if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, mover]);

  // El turno se programa tras cada cambio: al usar las flechas, vuelve a contar.
  React.useEffect(() => {
    if (soloFotos.length <= 1) return;
    const t = window.setTimeout(() => mover(1), TURNO_MS);
    return () => window.clearTimeout(t);
  }, [i, soloFotos.length, mover]);

  React.useEffect(() => {
    if (i >= soloFotos.length) setI(0);
  }, [soloFotos.length, i]);

  const actual = soloFotos[i];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-8 py-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Camera className="size-4" /> Álbum del evento
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
        {actual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={actual.id}
            src={actual.url}
            alt=""
            className="max-h-[70vh] w-auto rounded-2xl object-contain shadow-lg"
          />
        ) : (
          <div className="text-center">
            <p className="text-3xl font-semibold tracking-tight">Aún no hay fotos</p>
            <p className="mt-3 text-muted-foreground">
              Escanea el código y sé el primero en subir un recuerdo.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG
              value={urlSubir || " "}
              size={72}
              level="M"
              marginSize={0}
              fgColor="#111111"
              bgColor="#ffffff"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 font-medium">
              <QrCode className="size-4 text-primary" /> Escanea para subir tus fotos
            </div>
            <div className="text-sm text-muted-foreground">
              Aparecerán aquí, con las de todos.
            </div>
          </div>
        </div>
        {soloFotos.length > 0 ? (
          <div className="hidden text-sm text-muted-foreground sm:block">
            {i + 1} / {soloFotos.length}
          </div>
        ) : null}
      </div>
    </div>
  );
}
