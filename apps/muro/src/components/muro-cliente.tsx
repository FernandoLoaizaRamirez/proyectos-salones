"use client";

import * as React from "react";
import {
  Share2,
  Monitor,
  Download,
  Trash2,
  X,
  Copy,
  Check,
  MessageCircle,
  QrCode,
  PenLine,
} from "lucide-react";
import { Button, Card, EmptyState, cn } from "@salones/ui";
import { QR } from "@/components/qr";
import { ModoPantalla } from "@/components/modo-pantalla";
import {
  evento,
  mensajesIniciales,
  tiempoRelativo,
  exportarRecuerdo,
  type Mensaje,
} from "@/lib/muro";

const K_MENSAJES = "muro-mensajes";

export function MuroCliente() {
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([]);
  const [cargado, setCargado] = React.useState(false);
  const [pantalla, setPantalla] = React.useState(false);
  const [compartir, setCompartir] = React.useState(false);
  const [urlFirmar, setUrlFirmar] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);
  const [ahora, setAhora] = React.useState(() => 0);

  // Carga inicial + sincronización en vivo entre pestañas.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(K_MENSAJES);
      setMensajes(raw ? JSON.parse(raw) : mensajesIniciales());
    } catch {
      setMensajes(mensajesIniciales());
    }
    setCargado(true);
    setAhora(Date.now());
    setUrlFirmar(`${window.location.origin}/firmar`);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === K_MENSAJES && ev.newValue) {
        try {
          setMensajes(JSON.parse(ev.newValue));
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    // Refresca las etiquetas de tiempo cada minuto.
    const t = window.setInterval(() => setAhora(Date.now()), 60000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(t);
    };
  }, []);

  React.useEffect(() => {
    if (cargado) {
      try {
        localStorage.setItem(K_MENSAJES, JSON.stringify(mensajes));
      } catch {
        /* almacenamiento lleno: se ignora aquí (el formulario avisa al invitado) */
      }
    }
  }, [mensajes, cargado]);

  const eliminar = (id: string) => setMensajes((l) => l.filter((m) => m.id !== id));

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlFirmar);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  };
  const invitarWhatsApp = () => {
    const msg = `¡Déjales un mensaje a los novios de ${evento.nombre}! Firma el libro de recuerdos aquí:\n${urlFirmar}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setCompartir(true)}>
          <Share2 className="size-4" /> Compartir para firmar
        </Button>
        <Button variant="outline" onClick={() => setPantalla(true)} disabled={mensajes.length === 0}>
          <Monitor className="size-4" /> Modo pantalla
        </Button>
        <Button
          variant="outline"
          onClick={() => exportarRecuerdo(mensajes)}
          disabled={mensajes.length === 0}
        >
          <Download className="size-4" /> Exportar recuerdo
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {mensajes.length} mensaje{mensajes.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Muro */}
      <div className="mt-8">
        {!cargado ? null : mensajes.length === 0 ? (
          <EmptyState
            icon={<PenLine className="size-8" />}
            title="Aún no hay mensajes"
            description="Comparte el enlace o el QR para que tus invitados dejen sus buenos deseos."
            action={
              <Button onClick={() => setCompartir(true)}>
                <Share2 className="size-4" /> Compartir para firmar
              </Button>
            }
          />
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {mensajes.map((m) => (
              <article
                key={m.id}
                className="group relative mb-4 break-inside-avoid rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm"
              >
                <button
                  onClick={() => eliminar(m.id)}
                  aria-label={`Quitar el mensaje de ${m.nombre}`}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/70 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
                {m.foto ? (
                  <img
                    src={m.foto}
                    alt=""
                    className="mb-4 w-full rounded-[calc(var(--radius)-0.25rem)] object-cover"
                  />
                ) : null}
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.texto}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-primary">— {m.nombre}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {tiempoRelativo(m.fecha, ahora || m.fecha)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Modal de compartir */}
      {compartir ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
          onClick={() => setCompartir(false)}
        >
          <Card className="w-full max-w-md p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <QrCode className="size-5 text-primary" /> Comparte el libro de firmas
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tus invitados escanean el código para dejar su mensaje desde el teléfono.
                </p>
              </div>
              <button
                onClick={() => setCompartir(false)}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
              <QR value={urlFirmar || " "} size={132} />
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {urlFirmar}
                </p>
                <div className="flex flex-col gap-2">
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
                  <Button onClick={invitarWhatsApp} className="w-full">
                    <MessageCircle className="size-4" /> Invitar por WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Modo pantalla */}
      {pantalla ? (
        <ModoPantalla mensajes={mensajes} urlFirmar={urlFirmar} onClose={() => setPantalla(false)} />
      ) : null}
    </div>
  );
}
