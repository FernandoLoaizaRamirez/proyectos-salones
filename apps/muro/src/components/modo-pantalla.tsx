"use client";

import * as React from "react";
import { X, QrCode, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { evento, tiempoRelativo, type Mensaje } from "@/lib/muro";

/**
 * Modo pantalla: ocupa toda la pantalla y va pasando los mensajes uno por uno,
 * ideal para proyectar en la fiesta. Muestra un QR para que los invitados
 * sigan firmando. Se cierra con la X o con la tecla Esc.
 *
 * MODERAR DESDE AQUÍ (añadido el 6 ago 2026): es la pantalla donde un mensaje
 * subido de tono se ve GIGANTE delante de todos, y hasta ahora era la única sin
 * forma de quitarlo — había que salir del proyector, buscar la tarjeta y
 * borrarla ahí, con el mensaje en la pared todo ese rato.
 */
export function ModoPantalla({
  mensajes,
  urlFirmar,
  onClose,
  onQuitar,
  pausado = false,
}: {
  mensajes: Mensaje[];
  urlFirmar: string;
  onClose: () => void;
  /** Si se pasa, aparece el botón de quitar. Solo el anfitrión lo recibe. */
  onQuitar?: (m: Mensaje) => void;
  /** Con la confirmación abierta el turno se detiene: si no, el mensaje cambia
   *  debajo de quien está confirmando y se acaba borrando otro. */
  pausado?: boolean;
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

  // Avanzar automáticamente cada 6 segundos. En pausa mientras se confirma un
  // borrado: el turno no puede cambiar el mensaje debajo de quien lo está
  // quitando.
  React.useEffect(() => {
    if (mensajes.length <= 1 || pausado) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % mensajes.length), 6000);
    return () => window.clearInterval(t);
  }, [mensajes.length, pausado]);

  // Si cambia la cantidad de mensajes, mantener el índice dentro de rango.
  React.useEffect(() => {
    if (i >= mensajes.length) setI(0);
  }, [mensajes.length, i]);

  const actual = mensajes[i];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 px-8 py-6">
        {/* `min-w-0`: que ceda el titulo, no los botones. Sin esto flexbox
            aplastaba la X hasta dejarla ovalada y el boton de quitar partia su
            texto en dos renglones pegados al borde. */}
        <div className="min-w-0">
          <div className="text-sm font-medium text-primary">Muro de mensajes</div>
          {/* Dos renglones antes que puntos suspensivos: en el proyector el
              nombre de la boda es lo que tiene que lucir, y salía "Boda Ana &
              Rodri…". */}
          <div className="line-clamp-2 text-2xl font-semibold tracking-tight">{evento.nombre}</div>
        </div>
        <div className="flex items-center gap-3">
          {onQuitar && actual ? (
            <button
              onClick={() => onQuitar(actual)}
              aria-label={`Quitar el mensaje de ${actual.nombre} que está en pantalla`}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-red-500/50 hover:text-red-500"
            >
              <Trash2 className="size-4" />{" "}
              <span className="hidden sm:inline">Quitar este mensaje</span>
            </button>
          ) : null}
          <button
            onClick={onClose}
            aria-label="Salir del modo pantalla"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
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
                className="max-h-[32vh] w-full rounded-2xl object-cover shadow-lg sm:max-h-[46vh] md:w-2/5"
              />
            ) : null}
            {/* `min-w-0` + `break-words`: si un invitado pega una liga o
                escribe una palabra kilométrica, sin esto el mensaje se salía
                por la derecha y se proyectaba cortado a media palabra delante
                de toda la fiesta. */}
            <div className={actual.foto ? "min-w-0 md:flex-1" : "mx-auto min-w-0 max-w-3xl"}>
              <p className="break-words text-2xl font-medium leading-snug sm:text-3xl md:text-[2.2rem]">
                “{actual.texto}”
              </p>
              <p className="mt-6 break-words text-xl font-semibold text-primary sm:text-2xl">
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
