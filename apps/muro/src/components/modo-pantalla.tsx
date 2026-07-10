"use client";

import * as React from "react";
import { X, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { evento, tiempoRelativo, type Mensaje } from "@/lib/muro";

/**
 * Modo pantalla: ocupa toda la pantalla y va pasando los mensajes uno por uno,
 * ideal para proyectar en la fiesta. Muestra un QR para que los invitados
 * sigan firmando. Se cierra con la X o con la tecla Esc.
 */
export function ModoPantalla({
  mensajes,
  urlFirmar,
  onClose,
}: {
  mensajes: Mensaje[];
  urlFirmar: string;
  onClose: () => void;
}) {
  const [i, setI] = React.useState(0);

  // Intento de pantalla completa real (si el navegador lo permite).
  React.useEffect(() => {
    const el = document.documentElement;
    el.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // Cerrar con Esc.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Avanzar automáticamente cada 6 segundos.
  React.useEffect(() => {
    if (mensajes.length <= 1) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % mensajes.length), 6000);
    return () => window.clearInterval(t);
  }, [mensajes.length]);

  // Si cambia la cantidad de mensajes, mantener el índice dentro de rango.
  React.useEffect(() => {
    if (i >= mensajes.length) setI(0);
  }, [mensajes.length, i]);

  const actual = mensajes[i];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-8 py-6">
        <div>
          <div className="text-sm font-medium text-primary">Muro de mensajes</div>
          <div className="text-2xl font-semibold tracking-tight">{evento.nombre}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Salir del modo pantalla"
          className="grid size-11 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Mensaje grande al centro */}
      <div className="flex flex-1 items-center justify-center px-8 pb-8">
        {actual ? (
          <div
            key={actual.id}
            className="flex w-full max-w-4xl flex-col items-center gap-8 text-center md:flex-row md:text-left"
          >
            {actual.foto ? (
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
              <p className="mt-6 text-xl font-semibold text-primary sm:text-2xl">
                — {actual.nombre}
              </p>
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

      {/* Pie: QR para firmar + progreso */}
      <div className="flex items-center justify-between gap-4 border-t border-border px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG value={urlFirmar} size={72} level="M" marginSize={0} fgColor="#111111" bgColor="#ffffff" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-medium">
              <QrCode className="size-4 text-primary" /> Escanea para dejar tu mensaje
            </div>
            <div className="text-sm text-muted-foreground">{evento.invitacion}</div>
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
