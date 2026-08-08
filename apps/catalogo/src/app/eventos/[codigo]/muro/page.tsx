"use client";

/**
 * MURO DEL EVENTO — segunda pantalla del anfitrión migrada al panel.
 *
 * Tres cosas, que son las que se hacen el día de la fiesta:
 *   • PROYECTARLO (modo pantalla), que es para lo que existe el muro.
 *   • COMPARTIRLO: QR y enlace para que la gente firme desde su teléfono.
 *   • MODERARLO: quitar un mensaje que no debería estar en la pantalla grande.
 *
 * Los mensajes llegan EN VIVO de la colección "mensajes" del lugar central, la
 * misma que escribe el portal del invitado (y la app `muro`, que sigue viva).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Monitor,
  PenLine,
  QrCode,
  SearchX,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { Button, Card, EmptyState, Confirmar } from "@salones/ui";
import { obtenerSync, resolverMedios } from "@salones/sync";
import { obtenerSupabase } from "@/lib/supabase";
import { obtenerEvento, type EventoFila } from "@/lib/eventos";
import { COLECCION_MENSAJES, enlaceFirmar, exportarRecuerdo, tiempoRelativo, type Mensaje } from "@/lib/muro";
import { baseDeApp } from "@/lib/pantallas";
import { QR } from "@/components/qr";
import { ModoPantalla } from "@/components/modo-pantalla";

export default function MuroDelEvento({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = React.use(params);
  const codigo = decodeURIComponent(crudo);
  const router = useRouter();

  const [cargando, setCargando] = React.useState(true);
  const [evento, setEvento] = React.useState<EventoFila | null>(null);
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([]);
  const [pantalla, setPantalla] = React.useState(false);
  const [compartiendo, setCompartiendo] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  const [aviso, setAviso] = React.useState("");
  // El reloj se fija tras montar para no desincronizar el render del servidor.
  const [ahora, setAhora] = React.useState(0);

  /* Desde el 6 ago 2026 la foto del muro sube al almacén y en el mensaje queda
   * su dirección, que en un almacén privado no sirve sola: hay que cambiarla por
   * una FIRMADA, igual que en el álbum. Lo que no sea del almacén (los mensajes
   * viejos con la foto en texto) se devuelve tal cual, así que nada se rompe. */
  const [vistas, setVistas] = React.useState<Record<string, string>>({});
  const mensajesVistos = React.useMemo(
    () => mensajes.map((m) => (m.foto ? { ...m, foto: vistas[m.foto] ?? m.foto } : m)),
    [mensajes, vistas],
  );

  const clavesFotos = mensajes
    .map((m) => m.foto)
    .filter(Boolean)
    .join("|");
  React.useEffect(() => {
    const fotos = mensajes.map((m) => m.foto).filter((u): u is string => Boolean(u));
    if (fotos.length === 0) return;
    let vivo = true;
    void resolverMedios(codigo, fotos).then((mapa) => {
      if (vivo) setVistas((previas) => ({ ...previas, ...mapa }));
    });
    return () => {
      vivo = false;
    };
    // Depende de la LISTA de fotos, no del sondeo de cada 3 s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavesFotos, codigo]);

  const urlFirmar = enlaceFirmar(codigo, baseDeApp("muro"));

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

  // Muro en vivo + refresco de las etiquetas de tiempo cada minuto.
  React.useEffect(() => {
    if (!evento) return;
    setAhora(Date.now());
    const cancelar = obtenerSync().suscribir<Mensaje>(codigo, COLECCION_MENSAJES, (items) =>
      setMensajes([...items].sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0))),
    );
    const t = window.setInterval(() => setAhora(Date.now()), 60000);
    return () => {
      cancelar();
      window.clearInterval(t);
    };
  }, [evento, codigo]);

  /** Moderación: quitar un mensaje de la pantalla grande. */
  /** Siempre visible: antes solo salía al pasar el ratón (invisible en móvil). */
  const [porQuitar, setPorQuitar] = React.useState<Mensaje | null>(null);

  const quitar = async (m: Mensaje) => {
    setAviso("");
    try {
      await obtenerSync().eliminar(codigo, COLECCION_MENSAJES, m.id);
    } catch {
      setAviso(
        "No pudimos quitar ese mensaje. Si el evento ya usa llave de anfitrión, ábrelo desde el enlace que la lleva.",
      );
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlFirmar);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  const invitar = () => {
    const msg = `¡Déjales un mensaje a los novios de ${evento?.nombre ?? "nuestro evento"}! Firma aquí:\n${urlFirmar}`;
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <Link
        href={`/eventos/${encodeURIComponent(codigo)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {evento.nombre}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Muro en pantalla</h1>
      <p className="mt-2 text-muted-foreground">
        Los mensajes de tus invitados, listos para proyectar en el salón.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Button onClick={() => setCompartiendo(true)}>
          <Share2 className="size-4" /> Compartir para firmar
        </Button>
        <Button variant="outline" onClick={() => setPantalla(true)}>
          <Monitor className="size-4" /> Modo pantalla
        </Button>
        <Button
          variant="outline"
          onClick={() => exportarRecuerdo(mensajes, evento.nombre, codigo)}
          disabled={mensajes.length === 0}
        >
          <Download className="size-4" /> Exportar recuerdo
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {mensajes.length} mensaje{mensajes.length === 1 ? "" : "s"}
        </span>
      </div>

      {aviso ? <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">{aviso}</p> : null}

      <div className="mt-8">
        {mensajes.length === 0 ? (
          <EmptyState
            icon={<PenLine className="size-8" />}
            title="Aún no hay mensajes"
            description="Comparte el enlace o el QR para que tus invitados dejen sus buenos deseos."
            action={
              <Button onClick={() => setCompartiendo(true)}>
                <Share2 className="size-4" /> Compartir para firmar
              </Button>
            }
          />
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {mensajesVistos.map((m) => (
              <article
                key={m.id}
                className="group relative mb-4 break-inside-avoid rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm"
              >
                <button
                  onClick={() => setPorQuitar(m)}
                  aria-label={`Quitar el mensaje de ${m.nombre}`}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 text-muted-foreground ring-1 ring-border transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-4" />
                </button>
                {m.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
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

      {/* Compartir para firmar */}
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
                  <QrCode className="size-5 text-primary" /> Comparte el libro de firmas
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tus invitados escanean el código y dejan su mensaje desde el teléfono.
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
              <QR value={urlFirmar || " "} size={132} />
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {urlFirmar || "Falta configurar la dirección del portal."}
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

      {/* Modo pantalla */}
      {pantalla ? (
        <ModoPantalla
          mensajes={mensajesVistos}
          nombreEvento={evento.nombre}
          urlFirmar={urlFirmar}
          onClose={() => setPantalla(false)}
          // Moderar sin salir del proyector: la confirmación es la misma de las
          // tarjetas y se pinta encima (va después en el árbol). Mientras está
          // abierta, el turno se detiene.
          onQuitar={setPorQuitar}
          pausado={porQuitar !== null}
        />
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo="¿Quitar este mensaje del muro?"
        descripcion={
          <>
            Se quita el mensaje de <strong>{porQuitar?.nombre}</strong> del muro de todos los
            invitados y del proyector. No se puede deshacer.
          </>
        }
        textoConfirmar="Sí, quitarlo"
        onConfirmar={() => {
          const m = porQuitar;
          setPorQuitar(null);
          if (m) void quitar(m);
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </main>
  );
}
