"use client";

/**
 * MODO PANTALLA — el muro proyectado en el salón.
 *
 * Ocupa toda la pantalla y va pasando los mensajes uno por uno, grandes, con un
 * QR fijo para que la gente siga firmando. Se sale con Esc o con la X.
 *
 * Detalles pensados para una pantalla que nadie va a estar cuidando:
 *   • Los mensajes NUEVOS aparecen solos (la lista llega en vivo desde arriba).
 *   • Con las flechas ← → se puede detener a leer uno; el turno se reinicia solo
 *     desde ahí, sin pelearse con quien está manejando la pantalla.
 *   • Si el muro está vacío, invita a firmar en vez de quedarse en negro.
 */
import * as React from "react";
import { QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { tiempoRelativo, type Mensaje } from "@/lib/muro";

/** Cuánto dura cada mensaje en pantalla. */
const TURNO_MS = 6000;

export function ModoPantalla({
  mensajes,
  nombreEvento,
  urlFirmar,
  onClose,
}: {
  mensajes: Mensaje[];
  nombreEvento: string;
  urlFirmar: string;
  onClose: () => void;
}) {
  const [i, setI] = React.useState(0);

  // Pantalla completa de verdad, si el navegador deja.
  React.useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const mover = React.useCallback(
    (d: number) => {
      setI((n) => (mensajes.length ? (n + d + mensajes.length) % mensajes.length : 0));
    },
    [mensajes.length],
  );

  // Salir con Esc; navegar con las flechas.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") mover(1);
      else if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, mover]);

  // El turno se programa DESPUÉS de cada cambio (no con un intervalo fijo): así,
  // al mover con las flechas, el siguiente salto vuelve a contar desde cero.
  React.useEffect(() => {
    if (mensajes.length <= 1) return;
    const t = window.setTimeout(() => mover(1), TURNO_MS);
    return () => window.clearTimeout(t);
  }, [i, mensajes.length, mover]);

  // Si se borran mensajes mientras se proyecta, el índice no puede quedar fuera.
  React.useEffect(() => {
    if (i >= mensajes.length) setI(0);
  }, [mensajes.length, i]);

  const actual = mensajes[i];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-8 py-6">
        <div>
          <div className="text-sm font-medium text-primary">Muro de mensajes</div>
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

      <div className="flex flex-1 items-center justify-center px-8 pb-8">
        {actual ? (
          <div
            key={actual.id}
            className="flex w-full max-w-4xl flex-col items-center gap-8 text-center md:flex-row md:text-left"
          >
            {actual.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={actual.foto}
                alt=""
                className="max-h-[46vh] w-full rounded-2xl object-cover shadow-lg md:w-2/5"
              />
            ) : null}
            <div className={actual.foto ? "md:flex-1" : "mx-auto max-w-3xl"}>
              <p className="text-2xl font-medium leading-snug sm:text-3xl md:text-[2.2rem]">
                “{actual.texto}”
              </p>
              <p className="mt-6 text-xl font-semibold text-primary sm:text-2xl">— {actual.nombre}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tiempoRelativo(actual.fecha)}</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-3xl font-semibold tracking-tight">Aún no hay mensajes</p>
            <p className="mt-3 text-muted-foreground">
              Escanea el código para ser el primero en firmar.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG
              value={urlFirmar || " "}
              size={72}
              level="M"
              marginSize={0}
              fgColor="#111111"
              bgColor="#ffffff"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 font-medium">
              <QrCode className="size-4 text-primary" /> Escanea para dejar tu mensaje
            </div>
            <div className="text-sm text-muted-foreground">
              Tus palabras se verán en esta pantalla.
            </div>
          </div>
        </div>
        {mensajes.length > 0 ? (
          <div className="hidden text-sm text-muted-foreground sm:block">
            {i + 1} / {mensajes.length}
          </div>
        ) : null}
      </div>
    </div>
  );
}
