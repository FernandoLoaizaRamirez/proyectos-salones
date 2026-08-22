"use client";

import * as React from "react";
import { RefreshCw, Download, Loader2, Film, Sparkles } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { obtenerSync, estaConectado, eventoActual, resolverMedios } from "@salones/sync";
import {
  listarBrindis,
  ordenarBrindis,
  nombreArchivo,
  COLECCION_BRINDIS,
  type BrindisSubido,
} from "@/lib/nube";

/** Descarga un video (aunque esté en otro dominio) o lo abre si no se puede. */
async function descargar(url: string, nombre: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const TEXTO_ESTADO: Record<string, string> = {
  queued: "En cola…",
  fetching: "Reuniendo los brindis…",
  rendering: "Armando el video…",
  saving: "Guardando…",
};

export function GaleriaCliente() {
  // Sin servicio gestionado no hay galería común: los brindis se quedan en el
  // teléfono de cada invitado (ver src/lib/nube.ts).
  const conectado = estaConectado();
  const [videos, setVideos] = React.useState<BrindisSubido[]>([]);
  const [cargando, setCargando] = React.useState(conectado);
  // El código del evento se lee del enlace (?e=...), y solo hay enlace en el
  // navegador: por eso se resuelve ya montado, no al pintar.
  const eventoRef = React.useRef("demo");

  // Video recuerdo
  const [creando, setCreando] = React.useState(false);
  const [estado, setEstado] = React.useState<string | null>(null);
  const [recuerdoUrl, setRecuerdoUrl] = React.useState<string | null>(null);
  const [avisoRecuerdo, setAvisoRecuerdo] = React.useState("");
  const pollRef = React.useRef<number | null>(null);

  // Desde la migración 0013 el almacén es privado: lo guardado es una
  // REFERENCIA y el video solo se ve con una dirección FIRMADA que caduca en una
  // hora. Sin esto, tras el corte la galería se vería vacía.
  // Antes del corte `resolverMedios` devuelve las direcciones de siempre.
  const [vistas, setVistas] = React.useState<Record<string, string>>({});
  const ver = React.useCallback((u: string) => vistas[u] ?? u, [vistas]);
  const clavesVideos = videos.map((v) => v.url).join("|");
  React.useEffect(() => {
    if (!conectado || videos.length === 0) return;
    let vivo = true;
    void resolverMedios(
      eventoRef.current,
      videos.map((v) => v.url),
    ).then((mapa) => {
      if (vivo) setVistas((previas) => ({ ...previas, ...mapa }));
    });
    return () => {
      vivo = false;
    };
    // Depende de la LISTA, no de cada sondeo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavesVideos, conectado]);

  const cargar = React.useCallback(async () => {
    setCargando(true);
    try {
      setVideos(await listarBrindis(eventoRef.current));
    } catch {
      /* corte de red puntual: se queda lo que ya había y el sondeo reintenta */
    } finally {
      setCargando(false);
    }
  }, []);

  // Galería EN VIVO del evento: se suscribe al lugar central y se actualiza sola
  // conforme los invitados van enviando sus brindis.
  React.useEffect(() => {
    eventoRef.current = eventoActual();
    if (!conectado) {
      setCargando(false);
      return;
    }
    // Una primera lectura que SIEMPRE termina, aunque el servidor no conteste:
    // así la galería no se queda en "Cargando…" para siempre si se cae la red.
    // El sondeo de abajo sigue intentándolo por su cuenta.
    void cargar();
    return obtenerSync().suscribir<BrindisSubido>(
      eventoRef.current,
      COLECCION_BRINDIS,
      (items) => {
        setVideos(ordenarBrindis(items));
        setCargando(false);
      },
    );
  }, [conectado, cargar]);

  React.useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const consultar = React.useCallback((id: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/recuerdo?id=${encodeURIComponent(id)}`);
        const d = await r.json();
        if (d.status === "done" && d.url) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setRecuerdoUrl(d.url);
          setEstado(null);
          setCreando(false);
        } else if (d.status === "failed" || d.error) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setCreando(false);
          setEstado(null);
          setAvisoRecuerdo(d.error ?? "No se pudo crear el video. Intenta de nuevo.");
        } else {
          setEstado(d.status);
        }
      } catch {
        /* reintenta en el siguiente tick */
      }
    }, 5000);
  }, []);

  const crearRecuerdo = async () => {
    setCreando(true);
    setAvisoRecuerdo("");
    setRecuerdoUrl(null);
    setEstado("queued");
    try {
      // El servidor no ve el enlace del navegador: hay que decirle de qué evento
      // se juntan los brindis.
      const r = await fetch("/api/recuerdo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evento: eventoRef.current }),
      });
      const d = await r.json();
      if (!r.ok || !d.id) {
        setCreando(false);
        setEstado(null);
        setAvisoRecuerdo(d.error ?? "No se pudo iniciar el video recuerdo.");
        return;
      }
      consultar(d.id);
    } catch {
      setCreando(false);
      setEstado(null);
      setAvisoRecuerdo("No se pudo conectar. Revisa tu internet.");
    }
  };

  return (
    <div className="w-full">
      {/* Panel del VIDEO RECUERDO */}
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-5 text-primary" /> Video recuerdo
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Junta todos los brindis en un solo video, con portada y música.
            </p>
          </div>
          {!recuerdoUrl ? (
            /* Sin brindis todavia el boton se veia encendido (solo un poco
               apagado) y al tocarlo no pasaba nada ni se explicaba por que.
               Ahora se nota que esta en espera y una linea dice cuando servira. */
            <Button
              variant={videos.length === 0 ? "outline" : "primary"}
              onClick={crearRecuerdo}
              disabled={creando || videos.length === 0}
              title={videos.length === 0 ? "Disponible cuando llegue el primer brindis" : undefined}
            >
              {creando ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {estado ? TEXTO_ESTADO[estado] ?? "Creando…" : "Creando…"}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Crear video recuerdo
                </>
              )}
            </Button>
          ) : null}
        </div>
        {!recuerdoUrl && videos.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Disponible en cuanto llegue el primer brindis.
          </p>
        ) : null}

        {creando ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Se arma en la nube y tarda unos minutos. Puedes dejar esta página abierta.
          </p>
        ) : null}

        {avisoRecuerdo ? (
          <div className="mt-3 rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            {avisoRecuerdo}
          </div>
        ) : null}

        {recuerdoUrl ? (
          <div className="mt-4">
            <video
              src={recuerdoUrl}
              controls
              playsInline
              className="mx-auto max-h-[70vh] w-auto rounded-[var(--radius)] bg-black"
            />
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={() => descargar(recuerdoUrl, "video-recuerdo.mp4")}>
                <Download className="size-4" /> Descargar recuerdo
              </Button>
              <Button variant="outline" onClick={() => setRecuerdoUrl(null)}>
                Crear otro
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Lista de brindis recibidos */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {cargando && videos.length === 0
            ? "Cargando…"
            : `${videos.length} ${videos.length === 1 ? "brindis recibido" : "brindis recibidos"}`}
        </p>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
          <RefreshCw className={cn("size-4", cargando && "animate-spin")} /> Actualizar
        </Button>
      </div>

      {cargando && videos.length === 0 ? (
        <Card className="grid place-items-center p-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </Card>
      ) : videos.length === 0 ? (
        <Card className="p-10 text-center">
          <Film className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Aún no hay brindis</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {conectado
              ? "Cuando los invitados graben y toquen “Enviar a los novios”, aparecerán aquí."
              : "Esta galería junta los brindis de todos los teléfonos y necesita el Servicio gestionado. Sin él, cada video se queda en el teléfono del invitado."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {videos.map((v) => (
            <Card key={v.id} className="overflow-hidden p-3">
              <video
                src={ver(v.url)}
                controls
                playsInline
                preload="metadata"
                className="aspect-[3/4] w-full rounded-[calc(var(--radius)-0.25rem)] bg-black object-contain"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {v.fecha
                    ? new Date(v.fecha).toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => descargar(ver(v.url), nombreArchivo(v))}
                >
                  <Download className="size-4" /> Descargar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
