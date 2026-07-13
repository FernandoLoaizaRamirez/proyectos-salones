"use client";

import * as React from "react";
import { RefreshCw, Download, Loader2, Film } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { listarBrindis, type VideoNube } from "@/lib/supabase";

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

export function GaleriaCliente() {
  const [videos, setVideos] = React.useState<VideoNube[]>([]);
  const [cargando, setCargando] = React.useState(true);

  const cargar = React.useCallback(async () => {
    setCargando(true);
    try {
      setVideos(await listarBrindis());
    } finally {
      setCargando(false);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between gap-3">
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
            Cuando los invitados graben y toquen “Enviar a los novios”, aparecerán aquí.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {videos.map((v) => (
            <Card key={v.nombre} className="overflow-hidden p-3">
              <video
                src={v.url}
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
                <Button size="sm" variant="ghost" onClick={() => descargar(v.url, v.nombre)}>
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
