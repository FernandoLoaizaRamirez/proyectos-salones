"use client";

/**
 * ÁLBUM DEL EVENTO — quinta y última pantalla del anfitrión migrada al panel.
 *
 * Lo que el salón hace con las fotos de sus invitados:
 *   • PROYECTARLAS durante la cena, con el QR para que sigan subiendo.
 *   • DESCARGARLAS TODAS para entregárselas al cliente. Es la razón de ser de
 *     esta pantalla y lo que el invitado no puede hacer desde el portal.
 *   • MODERAR: quitar una foto que no debería estar ahí.
 *
 * Llegan en vivo de la colección "fotos", la misma que escribe el portal (y la
 * app `album-fotos`, que sigue viva).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Monitor,
  Play,
  QrCode,
  SearchX,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { Button, Card, EmptyState } from "@salones/ui";
import { obtenerSync, resolverMedios } from "@salones/sync";
import { obtenerSupabase } from "@/lib/supabase";
import { obtenerEvento, type EventoFila } from "@/lib/eventos";
import { COLECCION_FOTOS, descargarAlbum, enlaceSubir, esVideo, porFecha, type Foto } from "@/lib/album";
import { baseDeApp } from "@/lib/pantallas";
import { QR } from "@/components/qr";
import { AlbumPantalla } from "@/components/album-pantalla";

export default function AlbumDelEvento({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = React.use(params);
  const codigo = decodeURIComponent(crudo);
  const router = useRouter();

  const [cargando, setCargando] = React.useState(true);
  const [evento, setEvento] = React.useState<EventoFila | null>(null);
  const [fotos, setFotos] = React.useState<Foto[]>([]);
  const [pantalla, setPantalla] = React.useState(false);
  const [compartiendo, setCompartiendo] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  const [aviso, setAviso] = React.useState("");
  const [idx, setIdx] = React.useState<number | null>(null);
  const [descarga, setDescarga] = React.useState<{ hechas: number; total: number } | null>(null);
  /** Bandera para poder cancelar una descarga larga a media faena. */
  const descargandoRef = React.useRef(false);
  /** Dirección guardada → dirección firmada con la que se ve y se descarga. */
  const [vistas, setVistas] = React.useState<Record<string, string>>({});
  const ver = React.useCallback((u: string) => vistas[u] ?? u, [vistas]);

  const urlSubir = enlaceSubir(codigo, baseDeApp("album-fotos"));

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

  React.useEffect(() => {
    if (!evento) return;
    return obtenerSync().suscribir<Foto>(codigo, COLECCION_FOTOS, (items) =>
      setFotos([...items].sort(porFecha)),
    );
  }, [evento, codigo]);

  // Desde la migración 0013 el almacén es privado: lo que guarda la base es una
  // REFERENCIA, y para ver o descargar una foto hay que cambiarla por una
  // dirección FIRMADA que caduca en una hora. Se piden todas en lote.
  //
  // Afecta a las DOS cosas de esta pantalla: mostrar el álbum y la entrega al
  // cliente ("descargar todo"). Antes de que la 0013 esté aplicada,
  // `resolverMedios` devuelve las direcciones de siempre, así que esto es seguro
  // tanto antes como después del corte.
  const clavesFotos = fotos.map((f) => f.url).join("|");
  React.useEffect(() => {
    if (fotos.length === 0) return;
    let vivo = true;
    void resolverMedios(
      codigo,
      fotos.map((f) => f.url),
    ).then((mapa) => {
      if (vivo) setVistas((previas) => ({ ...previas, ...mapa }));
    });
    return () => {
      vivo = false;
    };
    // Depende de la LISTA de fotos, no del sondeo de cada 3 s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavesFotos, codigo]);

  // Si el álbum cambia con el visor abierto, el índice no puede quedar al aire.
  React.useEffect(() => {
    setIdx((i) => (i === null ? i : fotos.length === 0 ? null : Math.min(i, fotos.length - 1)));
  }, [fotos.length]);

  const abierto = idx !== null;
  const cerrarVisor = React.useCallback(() => setIdx(null), []);
  const irVisor = React.useCallback(
    (d: number) => setIdx((i) => (i === null ? i : (i + d + fotos.length) % fotos.length)),
    [fotos.length],
  );
  React.useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarVisor();
      else if (e.key === "ArrowRight") irVisor(1);
      else if (e.key === "ArrowLeft") irVisor(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto, cerrarVisor, irVisor]);
  const actual = idx === null ? null : fotos[idx];

  const quitar = async (f: Foto) => {
    setAviso("");
    try {
      await obtenerSync().eliminar(codigo, COLECCION_FOTOS, f.id);
    } catch {
      setAviso(
        "No pudimos quitar ese recuerdo. Si el evento ya usa llave de anfitrión, ábrelo desde el enlace que la lleva.",
      );
    }
  };

  const descargarTodo = async () => {
    if (descargandoRef.current || fotos.length === 0) return;
    setAviso("");
    descargandoRef.current = true;
    setDescarga({ hechas: 0, total: fotos.length });
    const r = await descargarAlbum(
      // Con las direcciones ya firmadas: en un almacén privado, la guardada no
      // se descarga sola. `descargarAlbum` no cambia; recibe la lista resuelta.
      fotos.map((f) => ({ ...f, url: ver(f.url) })),
      (hechas, total) => setDescarga({ hechas, total }),
      () => descargandoRef.current,
    );
    descargandoRef.current = false;
    setDescarga(null);
    setAviso(
      r.cancelada
        ? `Descarga detenida: se guardaron ${r.guardadas}.`
        : r.fallidas > 0
          ? `Se guardaron ${r.guardadas} archivos; ${r.fallidas} no se pudieron bajar. Inténtalo otra vez con esos.`
          : `Listo: se guardaron ${r.guardadas} archivos.`,
    );
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlSubir);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  const invitar = () => {
    const msg = `¡Sube tus fotos de ${evento?.nombre ?? "la fiesta"} al álbum de todos!\n${urlSubir}`;
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

  const videos = fotos.filter((f) => esVideo(f.tipo)).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <Link
        href={`/eventos/${encodeURIComponent(codigo)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {evento.nombre}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Álbum del evento</h1>
      <p className="mt-2 text-muted-foreground">
        Todo lo que suben tus invitados. Proyéctalo en la fiesta y descárgalo al terminar.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Button onClick={() => setCompartiendo(true)}>
          <Share2 className="size-4" /> Compartir para subir
        </Button>
        <Button variant="outline" onClick={() => setPantalla(true)}>
          <Monitor className="size-4" /> Proyectar álbum
        </Button>
        {descarga ? (
          <Button
            variant="outline"
            onClick={() => {
              descargandoRef.current = false;
            }}
          >
            <X className="size-4" /> Detener ({descarga.hechas}/{descarga.total})
          </Button>
        ) : (
          <Button variant="outline" onClick={() => void descargarTodo()} disabled={fotos.length === 0}>
            <Download className="size-4" /> Descargar todo
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {fotos.length} {fotos.length === 1 ? "recuerdo" : "recuerdos"}
          {videos > 0 ? ` · ${videos} ${videos === 1 ? "video" : "videos"}` : ""}
        </span>
      </div>

      {descarga ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Descargando de uno en uno…</span>
            <span>
              {descarga.hechas}/{descarga.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round((descarga.hechas / Math.max(1, descarga.total)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Si tu navegador pregunta si permites varias descargas, dile que sí.
          </p>
        </div>
      ) : null}

      {aviso ? <p className="mt-4 text-sm text-muted-foreground">{aviso}</p> : null}

      <div className="mt-8">
        {fotos.length === 0 ? (
          <EmptyState
            icon={<Camera className="size-8" />}
            title="Todavía no hay fotos"
            description="Comparte el enlace o el QR para que tus invitados suban sus recuerdos."
            action={
              <Button onClick={() => setCompartiendo(true)}>
                <Share2 className="size-4" /> Compartir para subir
              </Button>
            }
          />
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
            {fotos.map((f, i) => (
              <div
                key={f.id}
                className="group relative mb-3 break-inside-avoid overflow-hidden rounded-[var(--radius)] border border-border"
              >
                <button
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Ver ${f.nombre}`}
                  className="block w-full cursor-zoom-in"
                >
                  {esVideo(f.tipo) ? (
                    <div className="relative">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video src={ver(f.url)} className="w-full object-cover" />
                      <div className="absolute inset-0 grid place-items-center bg-black/20">
                        <span className="grid size-11 place-items-center rounded-full bg-white/80 text-black">
                          <Play className="size-5" />
                        </span>
                      </div>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ver(f.url)}
                      alt={f.nombre}
                      loading="lazy"
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Quitar ${f.nombre} del álbum`}
                  onClick={() => void quitar(f)}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compartir para subir */}
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
                  <QrCode className="size-5 text-primary" /> Comparte el álbum
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tus invitados escanean el código y suben sus fotos y videos.
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
              <QR value={urlSubir || " "} size={132} />
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {urlSubir || "Falta configurar la dirección del portal."}
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

      {/* Visor a pantalla completa */}
      {abierto && actual ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={actual.nombre}
          onClick={cerrarVisor}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
        >
          <button
            onClick={cerrarVisor}
            aria-label="Cerrar"
            className="absolute right-5 top-5 z-10 grid size-11 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
          {fotos.length > 1 ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  irVisor(-1);
                }}
                aria-label="Anterior"
                className="absolute left-4 z-10 grid size-11 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10 md:left-8"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  irVisor(1);
                }}
                aria-label="Siguiente"
                className="absolute right-4 z-10 grid size-11 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10 md:right-8"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
          <div className="max-h-[85vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {esVideo(actual.tipo) ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={ver(actual.url)}
                controls
                autoPlay
                className="max-h-[85vh] w-auto rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ver(actual.url)}
                alt={actual.nombre}
                className="max-h-[85vh] w-auto rounded-lg object-contain shadow-2xl"
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Álbum proyectado */}
      {pantalla ? (
        <AlbumPantalla
          fotos={fotos}
          nombreEvento={evento.nombre}
          urlSubir={urlSubir}
          onClose={() => setPantalla(false)}
        />
      ) : null}
    </main>
  );
}
