"use client";

import * as React from "react";
import {
  Camera,
  Upload,
  Download,
  Share2,
  RefreshCw,
  X,
  Aperture,
  Loader2,
  Copy,
  Check,
  QrCode,
} from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { QR } from "@/components/qr";
import {
  evento,
  marcos,
  componer,
  capturarDeVideo,
  descargar,
  compartir,
  type Marco,
} from "@/lib/photobooth";

type Modo = "inicio" | "camara" | "resultado";

export function PhotoboothCliente() {
  const [modo, setModo] = React.useState<Modo>("inicio");
  const [fotoBase, setFotoBase] = React.useState<string | null>(null);
  const [marcoId, setMarcoId] = React.useState<string>(marcos[0]?.id ?? "clasico");
  const [resultado, setResultado] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [aviso, setAviso] = React.useState("");
  const [compartiendo, setCompartiendo] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const marco: Marco = marcos.find((m) => m.id === marcoId) ?? marcos[0]!;

  const detenerCamara = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => detenerCamara, [detenerCamara]);

  // Recompone la foto cada vez que cambia el marco o la foto base.
  React.useEffect(() => {
    if (!fotoBase) return;
    let vivo = true;
    componer(fotoBase, marco)
      .then((url) => {
        if (vivo) setResultado(url);
      })
      .catch(() => setError("No se pudo preparar la foto."));
    return () => {
      vivo = false;
    };
  }, [fotoBase, marco]);

  const usarCamara = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setModo("camara");
      // Espera al render del <video> para asignar el stream.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError(
        "No pudimos abrir la cámara (permiso denegado o no disponible). Puedes subir una foto en su lugar.",
      );
    }
  };

  const tomarFoto = () => {
    if (!videoRef.current) return;
    const foto = capturarDeVideo(videoRef.current, true);
    detenerCamara();
    setResultado(null);
    setFotoBase(foto);
    setModo("resultado");
  };

  const subirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setResultado(null);
      setFotoBase(String(reader.result));
      setModo("resultado");
    };
    reader.onerror = () => setError("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  };

  const reiniciar = () => {
    detenerCamara();
    setFotoBase(null);
    setResultado(null);
    setError("");
    setAviso("");
    setModo("inicio");
  };

  const alDescargar = () => {
    if (resultado) descargar(resultado, `photobooth-${evento.hashtag}`);
  };
  const alCompartir = async () => {
    if (!resultado) return;
    setCompartiendo(true);
    const ok = await compartir(resultado);
    setCompartiendo(false);
    if (!ok) {
      descargar(resultado, `photobooth-${evento.hashtag}`);
      setAviso("Tu navegador no permite compartir directo; descargamos la foto para que la envíes.");
      setTimeout(() => setAviso(""), 4000);
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
      {modo === "inicio" ? (
        <Card className="p-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Aperture className="size-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Photobooth</h1>
          <p className="mt-1 text-muted-foreground">
            Tómate una foto con el marco de {evento.nombre} y descárgala o compártela al instante.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={usarCamara} size="lg">
              <Camera className="size-5" /> Usar la cámara
            </Button>
            <Button onClick={() => fileRef.current?.click()} variant="outline" size="lg">
              <Upload className="size-5" /> Subir una foto
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={subirFoto}
          />
        </Card>
      ) : null}

      {/* CÁMARA */}
      {modo === "camara" ? (
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-square w-full bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="size-full -scale-x-100 object-cover"
            />
            <button
              onClick={reiniciar}
              aria-label="Cerrar cámara"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="p-4">
            <Button onClick={tomarFoto} className="w-full" size="lg">
              <Camera className="size-5" /> Tomar foto
            </Button>
          </div>
        </Card>
      ) : null}

      {/* RESULTADO */}
      {modo === "resultado" ? (
        <div>
          <Card className="overflow-hidden p-0">
            <div className="grid aspect-square w-full place-items-center bg-muted">
              {resultado ? (
                <img src={resultado} alt="Tu foto con marco" className="size-full object-contain" />
              ) : (
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              )}
            </div>
          </Card>

          {/* Selector de marco */}
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium">Elige un marco</div>
            <div className="flex flex-wrap gap-2">
              {marcos.map((m) => (
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

          {aviso ? (
            <div className="mt-4 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              {aviso}
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={alCompartir} className="flex-1" disabled={!resultado || compartiendo}>
                {compartiendo ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4" />
                )}
                Compartir
              </Button>
              <Button
                onClick={alDescargar}
                variant="outline"
                className="flex-1"
                disabled={!resultado}
              >
                <Download className="size-4" /> Descargar
              </Button>
            </div>
            <Button onClick={reiniciar} variant="ghost">
              <RefreshCw className="size-4" /> Tomar otra
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Tarjeta con QR para que el organizador comparta el photobooth. */
export function CompartirBooth() {
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
        <QrCode className="size-4" /> Compartir booth
      </Button>
      {abierto ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
          onClick={() => setAbierto(false)}
        >
          <Card className="w-full max-w-md p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <QrCode className="size-5 text-primary" /> Comparte el photobooth
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
              Pon este código en las mesas: los invitados lo escanean y se toman su foto.
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
