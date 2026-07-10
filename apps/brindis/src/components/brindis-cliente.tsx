"use client";

import * as React from "react";
import {
  Video,
  Circle,
  Square,
  Download,
  Share2,
  RefreshCw,
  Trash2,
  Loader2,
  X,
  Copy,
  Check,
  QrCode,
  Film,
} from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { QR } from "@/components/qr";
import {
  evento,
  MAX_SEGUNDOS,
  elegirMime,
  formatoTiempo,
  descargarVideo,
  compartirVideo,
  guardarVideoLocal,
  listarVideosLocales,
  borrarVideoLocal,
  type VideoGuardado,
} from "@/lib/brindis";

type Fase = "inicio" | "preview" | "grabando" | "listo";

type ItemGaleria = { id: string; url: string; blob: Blob; mime: string };

export function BrindisCliente() {
  const [fase, setFase] = React.useState<Fase>("inicio");
  const [error, setError] = React.useState("");
  const [aviso, setAviso] = React.useState("");
  const [elapsed, setElapsed] = React.useState(0);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [galeria, setGaleria] = React.useState<ItemGaleria[]>([]);
  const [compartiendo, setCompartiendo] = React.useState(false);

  const liveRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const mimeRef = React.useRef<string>("");
  const blobRef = React.useRef<Blob | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const cargarGaleria = React.useCallback(async () => {
    try {
      const videos = await listarVideosLocales();
      setGaleria((prev) => {
        prev.forEach((it) => URL.revokeObjectURL(it.url));
        return videos.map((v: VideoGuardado) => ({
          id: v.id,
          url: URL.createObjectURL(v.blob),
          blob: v.blob,
          mime: v.mime,
        }));
      });
    } catch {
      /* IndexedDB no disponible: sin galería persistente */
    }
  }, []);

  React.useEffect(() => {
    cargarGaleria();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detenerCamara = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const abrirCamara = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite grabar video aquí.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      setFase("preview");
      requestAnimationFrame(() => {
        if (liveRef.current) {
          liveRef.current.srcObject = stream;
          liveRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError(
        "No pudimos usar la cámara y el micrófono (permiso denegado o no disponibles).",
      );
    }
  };

  const empezarGrabar = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mime = elegirMime();
    mimeRef.current = mime;
    chunksRef.current = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      setError("No se pudo iniciar la grabación en este navegador.");
      return;
    }
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const tipo = mimeRef.current || "video/webm";
      const blob = new Blob(chunksRef.current, { type: tipo });
      blobRef.current = blob;
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      detenerCamara();
      setFase("listo");
      try {
        await guardarVideoLocal(blob, tipo);
        cargarGaleria();
      } catch {
        /* sin almacenamiento local */
      }
    };
    rec.start();
    setElapsed(0);
    setFase("grabando");
    timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const detenerGrabar = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  // Corta solo al llegar al máximo.
  React.useEffect(() => {
    if (fase === "grabando" && elapsed >= MAX_SEGUNDOS) detenerGrabar();
  }, [fase, elapsed, detenerGrabar]);

  const reiniciar = () => {
    detenerCamara();
    if (timerRef.current) window.clearInterval(timerRef.current);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    blobRef.current = null;
    setElapsed(0);
    setError("");
    setAviso("");
    setFase("inicio");
  };

  const alDescargar = () => {
    if (blobRef.current) descargarVideo(blobRef.current, mimeRef.current);
  };
  const alCompartir = async () => {
    if (!blobRef.current) return;
    setCompartiendo(true);
    const ok = await compartirVideo(blobRef.current, mimeRef.current);
    setCompartiendo(false);
    if (!ok) {
      descargarVideo(blobRef.current, mimeRef.current);
      const msg = `¡Grabé un brindis para ${evento.nombre}! 🥂 Te lo mando por aquí (adjunto el video que se acaba de descargar).`;
      window.open(
        `https://wa.me/${evento.organizador.whatsapp}?text=${encodeURIComponent(msg)}`,
        "_blank",
        "noopener,noreferrer",
      );
      setAviso("Descargamos tu video y abrimos WhatsApp: adjunta el archivo para enviarlo.");
      setTimeout(() => setAviso(""), 5000);
    }
  };

  const compartirGaleria = async (it: ItemGaleria) => {
    const ok = await compartirVideo(it.blob, it.mime);
    if (!ok) descargarVideo(it.blob, it.mime);
  };
  const borrarGaleria = async (id: string) => {
    try {
      await borrarVideoLocal(id);
      await cargarGaleria();
    } catch {
      /* noop */
    }
  };

  return (
    <div className="w-full max-w-md">
      {error ? (
        <div className="mb-4 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          {error}
        </div>
      ) : null}

      {/* INICIO */}
      {fase === "inicio" ? (
        <>
          <Card className="p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Video className="size-7" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Brindis en video</h1>
            <p className="mt-1 text-muted-foreground">
              Graba un mensaje corto (máx. {MAX_SEGUNDOS}s) para {evento.nombre} y compártelo.
            </p>
            <Button onClick={abrirCamara} size="lg" className="mt-6 w-full">
              <Video className="size-5" /> Grabar mi brindis
            </Button>
          </Card>

          {galeria.length > 0 ? (
            <div className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Film className="size-4" /> Tus brindis en este dispositivo
              </h2>
              <div className="space-y-3">
                {galeria.map((it) => (
                  <Card key={it.id} className="overflow-hidden p-3">
                    <video
                      src={it.url}
                      controls
                      playsInline
                      className="w-full rounded-[calc(var(--radius)-0.25rem)] bg-black"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => compartirGaleria(it)}
                      >
                        <Share2 className="size-4" /> Compartir
                      </Button>
                      <button
                        onClick={() => borrarGaleria(it.id)}
                        aria-label="Eliminar video"
                        className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* PREVIEW / GRABANDO */}
      {fase === "preview" || fase === "grabando" ? (
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-[3/4] w-full bg-black">
            <video
              ref={liveRef}
              autoPlay
              playsInline
              muted
              className="size-full -scale-x-100 object-cover"
            />
            {fase === "grabando" ? (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white">
                <span className="size-2.5 animate-pulse rounded-full bg-red-500" />
                {formatoTiempo(elapsed)} / {formatoTiempo(MAX_SEGUNDOS)}
              </div>
            ) : null}
            <button
              onClick={reiniciar}
              aria-label="Cancelar"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="p-4">
            {fase === "preview" ? (
              <Button onClick={empezarGrabar} size="lg" className="w-full">
                <Circle className="size-5 fill-current" /> Empezar a grabar
              </Button>
            ) : (
              <Button onClick={detenerGrabar} size="lg" variant="outline" className="w-full">
                <Square className="size-5 fill-current" /> Detener
              </Button>
            )}
          </div>
        </Card>
      ) : null}

      {/* LISTO */}
      {fase === "listo" ? (
        <div>
          <Card className="overflow-hidden p-0">
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                playsInline
                className="aspect-[3/4] w-full bg-black object-contain"
              />
            ) : (
              <div className="grid aspect-[3/4] w-full place-items-center bg-muted">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </Card>

          {aviso ? (
            <div className="mt-4 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              {aviso}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={alCompartir} className="flex-1" disabled={compartiendo}>
                {compartiendo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4" />
                )}
                Enviar al anfitrión
              </Button>
              <Button onClick={alDescargar} variant="outline" className="flex-1">
                <Download className="size-4" /> Descargar
              </Button>
            </div>
            <Button onClick={reiniciar} variant="ghost">
              <RefreshCw className="size-4" /> Grabar otro
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Tu video se queda en este teléfono. Para reunir los brindis de todos los invitados en un
            solo lugar se usa el servicio gestionado.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Botón + modal con QR para que el organizador comparta el enlace de grabar. */
export function CompartirBrindis() {
  const [abierto, setAbierto] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);

  React.useEffect(() => setUrl(window.location.origin), []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <QrCode className="size-4" /> Compartir
      </Button>
      {abierto ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
          onClick={() => setAbierto(false)}
        >
          <Card className="w-full max-w-md p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <QrCode className="size-5 text-primary" /> Comparte el brindis
              </h2>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Los invitados escanean el código y graban su brindis desde el teléfono.
            </p>
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
              <QR value={url || " "} size={132} />
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {url}
                </p>
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
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
