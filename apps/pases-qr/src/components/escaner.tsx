"use client";

import * as React from "react";
import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@salones/ui";

/** Escáner de códigos QR con la cámara del dispositivo. */
export function Escaner({ onDetectar }: { onDetectar: (texto: string) => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rafRef = React.useRef(0);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [activo, setActivo] = React.useState(false);
  const [error, setError] = React.useState("");

  const detener = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActivo(false);
  }, []);

  const iniciar = React.useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setActivo(true);

      const tick = () => {
        const canvas = canvasRef.current;
        const v = videoRef.current;
        if (canvas && v && v.readyState === v.HAVE_ENOUGH_DATA) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code && code.data) onDetectar(code.data);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("No se pudo abrir la cámara. Revisa los permisos o usa la lista manual de abajo.");
      setActivo(false);
    }
  }, [onDetectar]);

  React.useEffect(() => () => detener(), [detener]);

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[var(--radius)] border border-border bg-muted">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${activo ? "" : "invisible"}`}
        />
        {!activo ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
            La cámara está apagada. Enciéndela para escanear los pases en la entrada.
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-[3px] border-white/90 shadow-[0_0_0_100vmax_rgba(0,0,0,0.15)]" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}

      <div className="mt-3">
        {activo ? (
          <Button variant="outline" onClick={detener}>
            <CameraOff className="size-4" /> Apagar cámara
          </Button>
        ) : (
          <Button onClick={iniciar}>
            <Camera className="size-4" /> Encender cámara y escanear
          </Button>
        )}
      </div>
    </div>
  );
}
