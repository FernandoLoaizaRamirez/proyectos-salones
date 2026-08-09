"use client";

/**
 * PANEL DEL DJ — tercera pantalla del anfitrión migrada al panel.
 *
 * La cola de canciones que piden los invitados, ordenada por votos, con lo que
 * el DJ hace toda la noche: ponerla, descartarla o regresarla a la cola.
 *
 * Añadido pensando en la cabina (a oscuras y con prisa): arriba se destaca
 * SIEMPRE la que sigue —la más votada de la cola— con su botón grande. Así la
 * acción principal no depende de atinarle a un renglón de una lista que se
 * reordena sola cada vez que alguien vota.
 *
 * Las canciones llegan EN VIVO de la colección "canciones" del lugar central,
 * la misma que escribe el portal del invitado (y la app `playlist`).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  Music,
  Play,
  QrCode,
  RotateCcw,
  SearchX,
  Share2,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { Button, Card, cn, Confirmar } from "@salones/ui";
import { obtenerSync } from "@salones/sync";
import { obtenerSupabase } from "@/lib/supabase";
import { obtenerEvento, type EventoFila } from "@/lib/eventos";
import {
  COLECCION_CANCIONES,
  EstadoCancion,
  enlacePedir,
  plataformaDeLink,
  porVotos,
  type Cancion,
} from "@/lib/playlist";
import { baseDeApp } from "@/lib/pantallas";
import { QR } from "@/components/qr";

type Filtro = "cola" | "puestas" | "descartadas" | "todas";

const FILTROS: { clave: Filtro; nombre: string }[] = [
  { clave: "cola", nombre: "En cola" },
  { clave: "puestas", nombre: "Puestas" },
  { clave: "descartadas", nombre: "Descartadas" },
  { clave: "todas", nombre: "Todas" },
];

export default function PanelDj({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = React.use(params);
  const codigo = decodeURIComponent(crudo);
  const router = useRouter();

  const [cargando, setCargando] = React.useState(true);
  const [evento, setEvento] = React.useState<EventoFila | null>(null);
  const [canciones, setCanciones] = React.useState<Cancion[]>([]);
  const [filtro, setFiltro] = React.useState<Filtro>("cola");
  const [compartiendo, setCompartiendo] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  const [aviso, setAviso] = React.useState("");

  const urlPedir = enlacePedir(codigo, baseDeApp("playlist"));

  React.useEffect(() => {
    const supabase = obtenerSupabase();
    if (!supabase) {
      router.replace("/entrar");
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/entrar");
        return;
      }
      setEvento(await obtenerEvento(supabase, codigo));
      setCargando(false);
    });
  }, [router, codigo]);

  // La cola, en vivo.
  React.useEffect(() => {
    if (!evento) return;
    return obtenerSync().suscribir<Cancion>(codigo, COLECCION_CANCIONES, setCanciones);
  }, [evento, codigo]);

  const cola = canciones.filter((c) => c.estado === EstadoCancion.Pendiente);
  const puestas = canciones.filter((c) => c.estado === EstadoCancion.Puesta);
  const descartadas = canciones.filter((c) => c.estado === EstadoCancion.Descartada);
  const votosTotales = canciones.reduce((s, c) => s + c.votos, 0);

  /** La más votada de la cola: la que el DJ pondrá a continuación. */
  const siguiente = [...cola].sort(porVotos)[0] ?? null;

  const lista: Cancion[] =
    filtro === "cola"
      ? [...cola].sort(porVotos)
      : filtro === "puestas"
        ? [...puestas].sort((a, b) => b.fecha - a.fecha)
        : filtro === "descartadas"
          ? [...descartadas].sort((a, b) => b.fecha - a.fecha)
          : [...canciones].sort(porVotos);

  const cambiarEstado = async (c: Cancion, estado: EstadoCancion) => {
    setAviso("");
    try {
      await obtenerSync().guardar<Cancion>(codigo, COLECCION_CANCIONES, { ...c, estado });
    } catch {
      setAviso("No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const [porQuitar, setPorQuitar] = React.useState<Cancion | null>(null);

  const quitar = async (c: Cancion) => {
    setAviso("");
    try {
      await obtenerSync().eliminar(codigo, COLECCION_CANCIONES, c.id);
    } catch {
      setAviso(
        "No pudimos borrar esa canción. Si el evento ya usa llave de anfitrión, ábrelo desde el enlace que la lleva.",
      );
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlPedir);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  const invitar = () => {
    const msg = `¡Pon la música de ${evento?.nombre ?? "la fiesta"}! Pide tu canción y vota aquí:\n${urlPedir}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  if (cargando) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!evento) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">No encontramos ese evento</h1>
        <Link href="/eventos" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="size-4" /> Volver a mis eventos
          </Button>
        </Link>
      </main>
    );
  }

  const tiles = [
    { n: canciones.length, l: "Pedidas", c: "text-foreground" },
    { n: cola.length, l: "En cola", c: "text-primary" },
    { n: puestas.length, l: "Puestas", c: "text-green-600" },
    { n: votosTotales, l: "Votos", c: "text-amber-600" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <Link
        href={`/eventos/${encodeURIComponent(codigo)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {evento.nombre}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Panel del DJ</h1>
      <p className="mt-2 text-muted-foreground">
        Lo que pide la fiesta, ordenado por votos. Se actualiza solo.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.l} className="p-5">
            <div className={cn("text-3xl font-semibold", t.c)}>{t.n}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.l}</div>
          </Card>
        ))}
      </div>

      {/* La que sigue: la acción principal, siempre en el mismo lugar */}
      {siguiente ? (
        <Card className="mt-6 border-primary/40 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">La que sigue</p>
              <p className="mt-1 truncate text-xl font-semibold">{siguiente.titulo}</p>
              <p className="truncate text-sm text-muted-foreground">
                {siguiente.artista || "Artista no especificado"}
                {siguiente.pedidaPor ? ` · la pidió ${siguiente.pedidaPor}` : ""}
                {plataformaDeLink(siguiente.link) ? (
                  <a
                    href={siguiente.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" /> {plataformaDeLink(siguiente.link)}
                  </a>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-[var(--radius)] bg-background px-3 py-2 text-sm font-semibold">
              <ThumbsUp className="size-4 text-primary" /> {siguiente.votos}
            </div>
            <Button onClick={() => void cambiarEstado(siguiente, EstadoCancion.Puesta)}>
              <Play className="size-4" /> Poner esta
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={() => setCompartiendo(true)}>
          <Share2 className="size-4" /> Compartir para pedir
        </Button>
        <div className="ml-auto inline-flex overflow-hidden rounded-[var(--radius)] border border-border">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              onClick={() => setFiltro(f.clave)}
              aria-pressed={filtro === f.clave}
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

      {aviso ? <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">{aviso}</p> : null}

      <div className="mt-6 space-y-2">
        {lista.length === 0 ? (
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
                      <Button size="sm" onClick={() => void cambiarEstado(c, EstadoCancion.Puesta)}>
                        <Play className="size-4" /> Poner
                      </Button>
                      <button
                        onClick={() => void cambiarEstado(c, EstadoCancion.Descartada)}
                        aria-label={`Descartar ${c.titulo}`}
                        className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                      >
                        <Ban className="size-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => void cambiarEstado(c, EstadoCancion.Pendiente)}
                      aria-label={`Regresar ${c.titulo} a la cola`}
                      className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setPorQuitar(c)}
                    aria-label={`Eliminar ${c.titulo}`}
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

      {/* Compartir para pedir */}
      {compartiendo ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
          onClick={() => setCompartiendo(false)}
        >
          <Card
            className="w-full max-w-md p-6"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
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
                onClick={() => setCompartiendo(false)}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
              <QR value={urlPedir || " "} size={132} />
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {urlPedir || "Falta configurar la dirección del portal."}
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
        onConfirmar={() => {
          const c = porQuitar;
          setPorQuitar(null);
          if (c) void quitar(c);
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </main>
  );
}
