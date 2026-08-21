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
  ImagePlus,
  Loader2,
  Copy,
  Check,
  QrCode,
} from "lucide-react";
import { AvisoParticipacion, Button, Card, cn } from "@salones/ui";
import {
  estaConectado,
  huellaDeAutor,
  mensajeDeSubida,
  obtenerSync,
  sufijoEvento,
} from "@salones/sync";
import { QR } from "@/components/qr";
import {
  evento,
  crearMarcos,
  componer,
  capturarDeVideo,
  descargar,
  nombreDescarga,
  compartir,
  aBlobJpeg,
  type Marco,
} from "@/lib/photobooth";
import { useEventoReal } from "@/lib/evento-real";
import { useInvitadoPersonal } from "@/lib/invitado";

type Modo = "inicio" | "camara" | "resultado";

/** El viaje del botón de guardar: quieto → guardando → ya en el álbum. */
type EstadoGuardar = "nada" | "guardando" | "guardada";

export function PhotoboothCliente() {
  // De qué evento es el booth y quién es este invitado (si llegó con su
  // enlace personal). En la vitrina, los dos caen a la muestra sin más.
  const { codigo, textos } = useEventoReal();
  const invitado = useInvitadoPersonal(codigo);

  const [modo, setModo] = React.useState<Modo>("inicio");
  const [fotoBase, setFotoBase] = React.useState<string | null>(null);
  const [marcoId, setMarcoId] = React.useState<string>("clasico");
  const [resultado, setResultado] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [aviso, setAviso] = React.useState("");
  const [compartiendo, setCompartiendo] = React.useState(false);
  const [guardar, setGuardar] = React.useState<EstadoGuardar>("nada");
  const [errorGuardar, setErrorGuardar] = React.useState("");
  // Se calcula tras montar para no desincronizar el render del servidor.
  const [conectado, setConectado] = React.useState<boolean | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => setConectado(estaConectado()), []);

  // Los mismos marcos de siempre, con los textos del evento real (o los de la
  // muestra mientras no haya otros).
  const marcos = React.useMemo(() => crearMarcos(textos), [textos]);
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

  // Cada composición nueva (otra foto, otro marco) es una foto DISTINTA de la
  // que ya se guardó: el botón de guardar vuelve a empezar de cero.
  React.useEffect(() => {
    setGuardar("nada");
    setErrorGuardar("");
  }, [resultado]);

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
    if (resultado) descargar(resultado, nombreDescarga(marcoId, textos.hashtag));
  };
  const alCompartir = async () => {
    if (!resultado) return;
    setCompartiendo(true);
    const ok = await compartir(resultado, textos);
    setCompartiendo(false);
    if (!ok) {
      descargar(resultado, nombreDescarga(marcoId, textos.hashtag));
      setAviso("Tu navegador no permite compartir directo; descargamos la foto para que la envíes.");
      setTimeout(() => setAviso(""), 4000);
    }
  };

  /**
   * Guarda la foto compuesta en el ÁLBUM DEL EVENTO — el mismo álbum al que
   * los invitados suben sus fotos desde el portal. Hasta hoy el photobooth era
   * un callejón: la foto se descargaba al teléfono y jamás llegaba al recuerdo
   * común de la fiesta.
   */
  const alGuardarEnAlbum = async () => {
    if (!resultado || guardar !== "nada") return;
    setGuardar("guardando");
    setErrorGuardar("");
    try {
      // En JPEG, para que pese como las demás fotos del álbum (el PNG del
      // photobooth pesa varias veces más y se comería el cupo del evento).
      const blob = await aBlobJpeg(resultado);
      const nombre = `photobooth-${Date.now()}.jpg`;
      const sync = obtenerSync();
      const url = await sync.subirArchivo(codigo, nombre, blob, "image/jpeg");
      // La firma de este teléfono: es lo que le permitirá quitar SU foto del
      // álbum después (el nombre no vale como credencial, la huella sí).
      const huella = await huellaDeAutor(codigo);
      // La colección "fotos" es la del álbum del evento, con el mismo formato
      // de id que usa el portal. Los campos que aquí no aplican (autor,
      // invitadoId, autorHuella) simplemente no van; las apps que no los
      // conocen los ignoran.
      await sync.guardar(codigo, "fotos", {
        id: "F-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        nombre,
        url,
        tipo: "image/jpeg",
        fecha: Date.now(),
        // Sin enlace personal NO se pide el nombre: el photobooth es un juego
        // rápido y la foto va anónima, solo con la huella.
        ...(invitado ? { autor: invitado.nombre } : {}),
        ...(invitado?.id ? { invitadoId: invitado.id } : {}),
        ...(huella ? { autorHuella: huella } : {}),
      });
      setGuardar("guardada");
    } catch (e) {
      setGuardar("nada");
      setErrorGuardar(mensajeDeSubida(e));
    }
  };

  return (
    /*
     * `min-w-0`: este bloque se monta dentro de un `grid place-items-center`, y
     * un hijo de grid se niega por defecto a encogerse por debajo de su
     * contenido más ancho. La fila de marcos mide 2000 px de contenido, así que
     * al elegir marco el celular ensanchaba TODA la página a 477 px: la foto se
     * salía de la pantalla, "Descargar" y el nombre del evento quedaban
     * cortados. Es el mismo mal que ya se curó en el encabezado.
     */
    <div className="w-full min-w-0 max-w-md">
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
            Tómate una foto con el marco de {textos.nombre} y descárgala o compártela al instante.
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
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">Elige un marco</span>
              <span className="text-xs text-muted-foreground">desliza para ver más</span>
            </div>
            {/* Una sola fila que se desliza: con 16 marcos, en rejilla ocupaban
                media pantalla y empujaban los botones de compartir fuera. */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {marcos.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMarcoId(m.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
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
            {/*
              El aviso va ANTES del botón, pegado a él: para que el
              consentimiento valga, la persona tiene que poder enterarse justo
              cuando entrega su foto — igual que en el álbum del portal.
            */}
            <AvisoParticipacion accion="subir tu foto al álbum" imagen className="text-center" />
            <Button
              onClick={() => void alGuardarEnAlbum()}
              variant="outline"
              disabled={!resultado || guardar !== "nada"}
            >
              {guardar === "guardando" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Guardando…
                </>
              ) : guardar === "guardada" ? (
                <>
                  <Check className="size-4" /> Ya está en el álbum del evento
                </>
              ) : (
                <>
                  <ImagePlus className="size-4" /> Guardar en el álbum del evento
                </>
              )}
            </Button>
            {errorGuardar ? (
              <p className="text-center text-sm text-red-600 dark:text-red-400">{errorGuardar}</p>
            ) : null}
            {conectado === false ? (
              <p className="text-center text-xs text-muted-foreground">
                En esta demostración la foto se queda en este teléfono; con el servicio del evento,
                cae al álbum de todos los invitados.
              </p>
            ) : null}
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

  // El enlace lleva el `?e=` del evento: sin él, el QR de las mesas de una
  // boda real mandaría a los invitados al photobooth de la muestra. En la
  // vitrina el sufijo es vacío y el enlace queda igual que siempre.
  React.useEffect(() => setUrl(window.location.origin + sufijoEvento()), []);

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
      {/* En el celular solo el icono: con el texto completo, este botón y el de
          tema se comían el ancho y el nombre del evento quedaba en "An…". */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAbierto(true)}
        aria-label="Compartir el booth con un código QR"
      >
        <QrCode className="size-4" /> <span className="hidden sm:inline">Compartir booth</span>
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

/**
 * El nombre del evento en el encabezado. Es un componente de cliente porque el
 * evento se sabe hasta leer el enlace: el servidor pinta la muestra y, si hay
 * evento real con datos, el nombre se corrige al montar.
 */
export function TituloBooth() {
  const { textos, conDatosReales } = useEventoReal();
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold leading-tight">{textos.nombre}</div>
      <div className="truncate text-xs text-muted-foreground">
        {/* El lugar de la muestra solo aplica a la muestra: un evento real no
            captura "lugar" para el photobooth, así que no se inventa uno. */}
        {conDatosReales ? "Photobooth del evento" : `Photobooth · ${evento.lugar}`}
      </div>
    </div>
  );
}

/** El pie de la página: el texto de la demo solo cuando ES la demo. */
export function PieBooth() {
  const { conDatosReales } = useEventoReal();
  // Se sabe hasta montar (mismo motivo que el título); mientras, se asume que
  // no hay servidor, que es lo que menos promete.
  const [conServidor, setConServidor] = React.useState(false);
  React.useEffect(() => setConServidor(estaConectado()), []);

  if (conDatosReales) {
    return (
      <>La foto se arma en tu propio teléfono y solo llega al álbum si tú decides guardarla.</>
    );
  }
  return (
    <>
      {evento.lugar} · Demo de {evento.organizador.nombre}. Tu foto se arma en tu propio
      dispositivo
      {conServidor
        ? // La vitrina desplegada SÍ tiene servidor: decir "nada se sube" sería
          // mentira en cuanto alguien use el botón de guardar.
          " y solo llega al álbum de demostración si tú decides guardarla."
        : "; nada se sube a ningún servidor en esta demostración."}
    </>
  );
}
