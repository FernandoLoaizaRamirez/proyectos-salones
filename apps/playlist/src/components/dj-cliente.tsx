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
import { Button, Card, cn, Confirmar } from "@salones/ui";
import { sufijoEvento, esAnfitrion } from "@salones/sync";
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
  // Solo el anfitrión (el DJ con su enlace privado) descarta canciones.
  // Arranca en false: ante la duda, se esconde el botón.
  const [anfitrion, setAnfitrion] = React.useState(false);
  /** La canción que se va a quitar, esperando confirmación. */
  const [porQuitar, setPorQuitar] = React.useState<Cancion | null>(null);
  const [errorQuitar, setErrorQuitar] = React.useState("");

  /**
   * Quitar una canción es irreversible y, hasta el 6 ago 2026, además fallaba
   * EN SILENCIO: si el borrado no llegaba al servidor, el DJ creía que la había
   * quitado y la canción seguía en la lista de todos.
   */
  const confirmarQuitar = async () => {
    if (!porQuitar) return;
    const ok = await eliminar(porQuitar.id);
    setPorQuitar(null);
    setErrorQuitar(
      ok
        ? ""
        : "No pudimos quitar la canción. Si el evento usa llave de anfitrión, ábrelo desde el enlace que la lleva.",
    );
  };

  React.useEffect(() => {
    // El enlace para pedir lleva el código del evento actual (?e=...).
    setUrl(`${window.location.origin}/pedir${sufijoEvento()}`);
    // Depende del enlace y del navegador, que en el servidor no existen.
    setAnfitrion(esAnfitrion());
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
      {errorQuitar ? (
        <p className="mt-4 rounded-[var(--radius)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorQuitar}
        </p>
      ) : null}

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
              /* En celular la fila se parte en dos renglones: la canción arriba
                 y los botones abajo. Con todo en una línea, entre el número,
                 los votos y los botones al título le quedaban 30 px y el DJ
                 leía "P…" en vez del nombre de la canción. */
              <Card key={c.id} className="flex flex-wrap items-center gap-3 p-3">
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

                <div className="min-w-0 flex-1 basis-40">
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

                <div className="ml-auto flex shrink-0 items-center gap-1">
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
                  {anfitrion ? (
                    <button
                      onClick={() => setPorQuitar(c)}
                      aria-label="Eliminar"
                      className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
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

      <Confirmar
        abierto={porQuitar !== null}
        titulo="¿Quitar esta canción?"
        descripcion={
          <>
            Se quita <strong>{porQuitar?.titulo}</strong>
            {porQuitar?.artista ? ` de ${porQuitar.artista}` : ""} de la lista de todos, con sus{" "}
            <strong>{porQuitar?.votos ?? 0}</strong> {porQuitar?.votos === 1 ? "voto" : "votos"}. No
            se puede deshacer.
          </>
        }
        textoConfirmar="Sí, quitarla"
        onConfirmar={() => void confirmarQuitar()}
        onCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}
