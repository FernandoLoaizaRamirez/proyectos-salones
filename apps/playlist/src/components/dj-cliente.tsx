"use client";

import * as React from "react";
import {
  Share2,
  ThumbsUp,
  Music,
  ExternalLink,
  Check,
  X,
  Copy,
  MessageCircle,
  QrCode,
  Play,
  Ban,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { QR } from "@/components/qr";
import { useCanciones } from "@/lib/use-canciones";
import { evento, porVotos, plataformaDeLink, EstadoCancion, type Cancion } from "@/lib/playlist";

type Filtro = "cola" | "puestas" | "descartadas" | "todas";

const FILTROS: { clave: Filtro; nombre: string }[] = [
  { clave: "cola", nombre: "En cola" },
  { clave: "puestas", nombre: "Puestas" },
  { clave: "descartadas", nombre: "Descartadas" },
  { clave: "todas", nombre: "Todas" },
];

export function DjCliente() {
  const { canciones, cargado, setEstado, eliminar } = useCanciones();
  const [filtro, setFiltro] = React.useState<Filtro>("cola");
  const [compartir, setCompartir] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);

  React.useEffect(() => {
    setUrl(`${window.location.origin}/pedir`);
  }, []);

  const cola = canciones.filter((c) => c.estado === EstadoCancion.Pendiente);
  const puestas = canciones.filter((c) => c.estado === EstadoCancion.Puesta);
  const descartadas = canciones.filter((c) => c.estado === EstadoCancion.Descartada);
  const votosTotales = canciones.reduce((s, c) => s + c.votos, 0);

  const lista: Cancion[] =
    filtro === "cola"
      ? [...cola].sort(porVotos)
      : filtro === "puestas"
        ? [...puestas].sort((a, b) => b.fecha - a.fecha)
        : filtro === "descartadas"
          ? [...descartadas].sort((a, b) => b.fecha - a.fecha)
          : [...canciones].sort(porVotos);

  const tiles = [
    { n: canciones.length, l: "Pedidas", c: "text-foreground" },
    { n: cola.length, l: "En cola", c: "text-primary" },
    { n: puestas.length, l: "Puestas", c: "text-green-600" },
    { n: votosTotales, l: "Votos", c: "text-amber-600" },
  ];

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  };
  const invitar = () => {
    const msg = `¡Pon la música de ${evento.nombre}! Pide tu canción y vota aquí:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.l} className="p-5">
            <div className={cn("text-3xl font-semibold", t.c)}>{t.n}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.l}</div>
          </Card>
        ))}
      </div>

      {/* Acciones + filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={() => setCompartir(true)}>
          <Share2 className="size-4" /> Compartir para pedir
        </Button>
        <div className="ml-auto inline-flex overflow-hidden rounded-[var(--radius)] border border-border">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              onClick={() => setFiltro(f.clave)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                filtro === f.clave
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="mt-6 space-y-2">
        {!cargado ? null : lista.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-dashed border-border py-12 text-center text-muted-foreground">
            {filtro === "cola"
              ? "No hay canciones en cola. Comparte el QR para que los invitados pidan."
              : "Nada por aquí."}
          </p>
        ) : (
          lista.map((c, i) => {
            const plataforma = plataformaDeLink(c.link);
            return (
              <Card key={c.id} className="flex items-center gap-3 p-3">
                {filtro === "cola" ? (
                  <div className="grid size-8 shrink-0 place-items-center text-sm font-semibold text-muted-foreground">
                    {i + 1}
                  </div>
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-muted text-muted-foreground">
                    <Music className="size-5" />
                  </div>
                )}

                <div className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] bg-muted px-2.5 py-1.5 text-sm font-semibold">
                  <ThumbsUp className="size-3.5 text-primary" />
                  {c.votos}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.titulo}</span>
                    {c.estado === EstadoCancion.Puesta ? (
                      <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600 ring-1 ring-green-500/30">
                        Puesta
                      </span>
                    ) : null}
                    {c.estado === EstadoCancion.Descartada ? (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                        Descartada
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {c.artista || "Artista no especificado"}
                    {c.pedidaPor ? ` · ${c.pedidaPor}` : ""}
                    {plataforma ? (
                      <a
                        href={c.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" /> {plataforma}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {c.estado === EstadoCancion.Pendiente ? (
                    <>
                      <Button size="sm" onClick={() => setEstado(c.id, EstadoCancion.Puesta)}>
                        <Play className="size-4" /> Poner
                      </Button>
                      <button
                        onClick={() => setEstado(c.id, EstadoCancion.Descartada)}
                        aria-label="Descartar"
                        className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                      >
                        <Ban className="size-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEstado(c.id, EstadoCancion.Pendiente)}
                      aria-label="Regresar a la cola"
                      className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => eliminar(c.id)}
                    aria-label="Eliminar"
                    className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            );
          })
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
                  <QrCode className="size-5 text-primary" /> Comparte la playlist
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los invitados escanean el código para pedir canciones y votar.
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
              <QR value={url || " "} size={132} />
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {url}
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
                  <Button onClick={invitar} className="w-full">
                    <MessageCircle className="size-4" /> Invitar por WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
