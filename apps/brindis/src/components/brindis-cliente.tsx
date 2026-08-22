"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  UploadCloud,
} from "lucide-react";
import { Button, Card, cn, AvisoParticipacion, Confirmar } from "@salones/ui";
import { estaConectado, eventoActual, sufijoEvento } from "@salones/sync";
import { QR } from "@/components/qr";
import {
  evento,
  MAX_SEGUNDOS,
  VIDEO_BPS,
  AUDIO_BPS,
  VIDEO_ANCHO,
  VIDEO_ALTO,
  marcosBrindis,
  dibujarMarcoBrindis,
  elegirMime,
  formatoTiempo,
  descargarVideo,
  compartirVideo,
  guardarVideoLocal,
  listarVideosLocales,
  borrarVideoLocal,
  type VideoGuardado,
  type MarcoBrindis,
} from "@/lib/brindis";
import { subirBrindis } from "@/lib/nube";

type Fase = "inicio" | "preview" | "grabando" | "listo";

type ItemGaleria = { id: string; url: string; blob: Blob; mime: string };

/**
 * ¿Podemos "quemar" el marco dentro del video en este navegador?
 * En Safari/iOS (WebKit) grabar un canvas + el micrófono suele salir SIN audio,
 * así que ahí grabamos el video directo (con su sonido) y sin marco. En Chrome,
 * Android y demás sí quemamos el marco.
 */
function puedeQuemarMarco(): boolean {
  if (typeof document === "undefined" || typeof navigator === "undefined") return false;
  const proto = HTMLCanvasElement.prototype as unknown as { captureStream?: unknown };
  if (typeof proto.captureStream !== "function") return false;
  const ua = navigator.userAgent;
  const esIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const esSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  return !esIOS && !esSafari;
}

/** Dibuja el video cubriendo (cover) todo el lienzo, sin deformar. */
function dibujarCoverVideo(
  ctx: CanvasRenderingContext2D,
  v: HTMLVideoElement,
  W: number,
  H: number,
) {
  const iw = v.videoWidth || W;
  const ih = v.videoHeight || H;
  const escala = Math.max(W / iw, H / ih);
  const w = iw * escala;
  const h = ih * escala;
  ctx.drawImage(v, (W - w) / 2, (H - h) / 2, w, h);
}

export function BrindisCliente() {
  // Con el Servicio gestionado el brindis viaja a la galería del anfitrión; sin
  // él se queda en este teléfono y se comparte por WhatsApp (ver src/lib/nube.ts).
  const conectado = estaConectado();
  const [fase, setFase] = React.useState<Fase>("inicio");
  const [error, setError] = React.useState("");
  const [aviso, setAviso] = React.useState("");
  const [elapsed, setElapsed] = React.useState(0);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [galeria, setGaleria] = React.useState<ItemGaleria[]>([]);
  const [compartiendo, setCompartiendo] = React.useState(false);
  const [subiendo, setSubiendo] = React.useState(false);
  const [subido, setSubido] = React.useState(false);
  const [marcoId, setMarcoId] = React.useState<string>(marcosBrindis[0]!.id);
  // ¿Este navegador puede grabar el marco dentro del video? (Chrome sí, iPhone no)
  const [modoMarco, setModoMarco] = React.useState(false);

  const liveRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recStreamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const mimeRef = React.useRef<string>("");
  const blobRef = React.useRef<Blob | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const rafRef = React.useRef(0);
  const marcoRef = React.useRef<MarcoBrindis>(marcosBrindis[0]!);
  // Marca que la grabación se está CANCELANDO, para que onstop no guarde el parcial.
  const cancelandoRef = React.useRef(false);
  // Espejos de los valores actuales, para poder liberar sus object URLs al salir.
  const videoUrlRef = React.useRef<string | null>(null);
  const galeriaRef = React.useRef<ItemGaleria[]>([]);
  // ¿El componente sigue montado? (para no dejar la cámara viva si se sale durante el permiso)
  const montadoRef = React.useRef(true);

  const marco = marcosBrindis.find((m) => m.id === marcoId) ?? marcosBrindis[0]!;
  React.useEffect(() => {
    marcoRef.current = marco;
  }, [marco]);

  React.useEffect(() => {
    videoUrlRef.current = videoUrl;
  }, [videoUrl]);
  React.useEffect(() => {
    galeriaRef.current = galeria;
  }, [galeria]);

  React.useEffect(() => {
    setModoMarco(puedeQuemarMarco());
  }, []);

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
    montadoRef.current = true;
    cargarGaleria();
    return () => {
      montadoRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      galeriaRef.current.forEach((it) => URL.revokeObjectURL(it.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bucle de dibujo (solo cuando quemamos marco): pinta el video (espejado) + el
  // marco en el lienzo. Es lo que se ve en pantalla y lo que se graba.
  const dibujar = React.useCallback(() => {
    const v = liveRef.current;
    const canvas = canvasRef.current;
    if (canvas && v && v.readyState >= 2 && v.videoWidth > 0) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        dibujarCoverVideo(ctx, v, canvas.width, canvas.height);
        ctx.restore();
        dibujarMarcoBrindis(ctx, canvas.width, canvas.height, marcoRef.current);
      }
    }
    rafRef.current = requestAnimationFrame(dibujar);
  }, []);

  React.useEffect(() => {
    if (modoMarco && (fase === "preview" || fase === "grabando")) {
      rafRef.current = requestAnimationFrame(dibujar);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [modoMarco, fase, dibujar]);

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
      // Si se salió de la pantalla mientras se pedía el permiso, no dejes la cámara viva.
      if (!montadoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
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
    cancelandoRef.current = false;

    // Por defecto se graba el stream directo (video + audio del micrófono).
    // Si quemamos marco, grabamos el lienzo y le añadimos el audio del micrófono.
    let grabStream: MediaStream = stream;
    recStreamRef.current = null;
    if (modoMarco && canvasRef.current) {
      try {
        const cs = (
          canvasRef.current as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }
        ).captureStream(30);
        const audio = stream.getAudioTracks()[0];
        if (audio) cs.addTrack(audio);
        grabStream = cs;
        recStreamRef.current = cs;
      } catch {
        grabStream = stream; // si el lienzo no se puede grabar, grabamos directo
      }
    }

    // La calidad se fija en un solo sitio (ver VIDEO_BPS en @/lib/brindis), con
    // las cuentas de por qué. Ojo: es una SUGERENCIA — hay navegadores (Safari
    // en iPhone) que la ignoran, por eso `subirBrindis` revisa el peso final.
    const opciones: MediaRecorderOptions = {
      videoBitsPerSecond: VIDEO_BPS,
      audioBitsPerSecond: AUDIO_BPS,
    };
    if (mime) opciones.mimeType = mime;
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(grabStream, opciones);
    } catch {
      // Si ya estábamos capturando el lienzo, detén esa captura para no dejarla viva.
      recStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      recStreamRef.current = null;
      setError("No se pudo iniciar la grabación en este navegador.");
      return;
    }
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      detenerCamara();
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
      recStreamRef.current = null;
      // Si se canceló, no guardamos ni mostramos el video parcial.
      if (cancelandoRef.current) {
        cancelandoRef.current = false;
        chunksRef.current = [];
        return;
      }
      const tipo = mimeRef.current || "video/webm";
      const blob = new Blob(chunksRef.current, { type: tipo });
      blobRef.current = blob;
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
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
    // Si veníamos de grabar (aunque ya se haya pulsado Detener y el video se esté
    // "cerrando"), cancelamos de verdad para que onstop NO guarde el parcial.
    if (fase === "grabando") {
      cancelandoRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
    }
    detenerCamara();
    recStreamRef.current?.getTracks().forEach((t) => t.stop());
    recStreamRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    blobRef.current = null;
    setElapsed(0);
    setError("");
    setAviso("");
    setSubido(false);
    setFase("inicio");
  };

  const alDescargar = () => {
    if (blobRef.current) descargarVideo(blobRef.current, mimeRef.current);
  };
  const alEnviarNube = async () => {
    if (!blobRef.current || subido) return;
    setSubiendo(true);
    setAviso("");
    // El brindis entra en la burbuja de SU evento (?e=...): no se mezcla con el
    // de otra boda.
    const r = await subirBrindis(eventoActual(), blobRef.current, mimeRef.current);
    setSubiendo(false);
    if (r.ok) {
      setSubido(true);
    } else {
      setAviso(
        `No se pudo enviar (${r.error ?? "revisa tu internet"}). Puedes descargarlo y mandarlo por WhatsApp.`,
      );
      setTimeout(() => setAviso(""), 6000);
    }
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
  const [porQuitar, setPorQuitar] = React.useState<ItemGaleria | null>(null);

  const borrarGaleria = async (id: string) => {
    try {
      await borrarVideoLocal(id);
      await cargarGaleria();
    } catch {
      // Ya no en silencio: un brindis borrado a medias tiene que notarse.
      setError("No pudimos borrar ese video. Inténtalo de nuevo.");
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
              Graba un mensaje corto en video (máx. {MAX_SEGUNDOS}s) para {evento.nombre} y
              compártelo.
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
                        onClick={() => setPorQuitar(it)}
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
        <>
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-[3/4] w-full bg-black">
              {/* Video de la cámara. Con marco: oculto (alimenta el lienzo).
                  Sin marco: visible y en espejo (es lo que se graba). */}
              <video
                ref={liveRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "absolute inset-0 size-full object-cover",
                  modoMarco ? "opacity-0" : "-scale-x-100",
                )}
              />
              {/* Lienzo con el marco (solo cuando se puede quemar en el video). */}
              {modoMarco ? (
                <canvas
                  ref={canvasRef}
                  width={VIDEO_ANCHO}
                  height={VIDEO_ALTO}
                  className="absolute inset-0 size-full"
                />
              ) : null}
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

          {/* Selector de marco (solo antes de grabar y si se puede quemar) */}
          {fase === "preview" && modoMarco ? (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">Elige un marco</div>
              <div className="flex flex-wrap gap-2">
                {marcosBrindis.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMarcoId(m.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      m.id === marcoId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
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
            {/* "Enviar a los novios" junta los videos de todos los teléfonos:
                eso es el Servicio gestionado. Sin él, quedan Compartir y
                Descargar, que no necesitan servidor. */}
            {!conectado ? null : subido ? (
              <div className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400">
                <Check className="size-5" /> ¡Enviado! Ya está con los demás brindis 🎉
              </div>
            ) : (
              <Button onClick={alEnviarNube} size="lg" disabled={subiendo}>
                {subiendo ? (
                  <>
                    <Loader2 className="size-5 animate-spin" /> Enviando…
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-5" /> Enviar a los novios
                  </>
                )}
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                onClick={alCompartir}
                variant="outline"
                className="flex-1"
                disabled={compartiendo}
              >
                {compartiendo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4" />
                )}
                Compartir
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
            {conectado
              ? `Al enviarlo, tu brindis se guarda junto con los de todos para que ${evento.nombre} los vea en un solo lugar.`
              : `Tu brindis se quedó en este teléfono. Compártelo para que llegue a ${evento.nombre}.`}
          </p>
          <AvisoParticipacion accion="enviar tu brindis" imagen className="mt-2 text-center" />
        </div>
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo="¿Borrar este brindis?"
        descripcion={
          <>
            Se borra el video de este dispositivo. Si no se ha enviado a los novios,{" "}
            <strong>se pierde para siempre</strong>: es la grabación de esa persona.
          </>
        }
        textoConfirmar="Sí, borrarlo"
        onConfirmar={() => {
          const it = porQuitar;
          setPorQuitar(null);
          if (it) void borrarGaleria(it.id);
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}

/** Botón + modal con QR para que el organizador comparta el enlace de grabar. */
export function CompartirBrindis() {
  const [abierto, setAbierto] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);

  // El enlace/QR que reparte el anfitrión lleva el código del evento actual
  // (?e=...), para que los brindis de esta boda caigan en su propia burbuja.
  React.useEffect(() => setUrl(`${window.location.origin}/${sufijoEvento()}`), []);

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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAbierto(true)}
        aria-label="Compartir el brindis con un codigo QR"
      >
        <QrCode className="size-4" /> <span className="hidden sm:inline">Compartir</span>
      </Button>
      {abierto
        ? /* Este dialogo cuelga del <header>, que lleva `backdrop-blur`: eso crea
             un lienzo propio y el `fixed` se anclaba al encabezado en vez de a la
             pantalla, asi que la tarjeta salia pegada arriba y el resto quedaba
             sin oscurecer, como a medio abrir. `createPortal` lo saca al <body>,
             que es donde debe vivir un dialogo. */
          createPortal(
        <div
          className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/50 p-4"
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
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
