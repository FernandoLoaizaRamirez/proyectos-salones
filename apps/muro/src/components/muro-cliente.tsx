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
import { Button, Card, EmptyState, Confirmar } from "@salones/ui";
import {
  obtenerSync,
  eventoActual,
  sufijoEvento,
  esAnfitrion,
  resolverMedios,
} from "@salones/sync";
import { QR } from "@/components/qr";
import { ModoPantalla } from "@/components/modo-pantalla";
import {
  evento,
  mensajesIniciales,
  tiempoRelativo,
  exportarRecuerdo,
  COLECCION_MENSAJES,
  type Mensaje,
} from "@/lib/muro";

export function MuroCliente() {
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([]);
  const [cargado, setCargado] = React.useState(false);
  const [pantalla, setPantalla] = React.useState(false);
  const [compartir, setCompartir] = React.useState(false);
  const [urlFirmar, setUrlFirmar] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);
  const [ahora, setAhora] = React.useState(() => 0);
  // Arranca en false a propósito: si algo fallara, se esconde el botón de
  // borrar en vez de enseñárselo a un invitado.
  const [anfitrion, setAnfitrion] = React.useState(false);

  /* ---- Las fotos del muro, desde el 6 ago 2026 ----------------------------
   * Antes la foto viajaba como TEXTO dentro del propio mensaje, así que se
   * pintaba tal cual. Ahora sube al almacén y en el mensaje queda su dirección,
   * que en un almacén privado no sirve sola: hay que cambiarla por una FIRMADA,
   * igual que en el álbum.
   *
   * `resolverMedios` no estropea nada de lo anterior: lo que no sea del almacén
   * central —los mensajes viejos con la foto en texto, las fotos de ejemplo en
   * /img— lo devuelve tal cual. Por eso el muro de una boda que ya está en
   * marcha se sigue viendo igual. */
  const [vistas, setVistas] = React.useState<Record<string, string>>({});
  const ver = React.useCallback((u: string) => vistas[u] ?? u, [vistas]);

  /** Los mensajes con la foto ya lista para pintar (tarjetas y proyector). */
  const mensajesVistos = React.useMemo(
    () => mensajes.map((m) => (m.foto ? { ...m, foto: ver(m.foto) } : m)),
    [mensajes, ver],
  );

  const clavesFotos = mensajes
    .map((m) => m.foto)
    .filter(Boolean)
    .join("|");
  React.useEffect(() => {
    const fotos = mensajes.map((m) => m.foto).filter((u): u is string => Boolean(u));
    if (fotos.length === 0) return;
    let vivo = true;
    void resolverMedios(eventoActual(), fotos).then((mapa) => {
      if (vivo) setVistas((previas) => ({ ...previas, ...mapa }));
    });
    return () => {
      vivo = false;
    };
    // Depende de la LISTA de fotos, no del sondeo de cada 3 s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavesFotos]);

  // Carga + sincronización en vivo desde el "lugar central" (@salones/sync).
  // En local se sincroniza entre pestañas de este dispositivo; con el servicio
  // gestionado, entre los teléfonos de todos los invitados. Mismo código.
  React.useEffect(() => {
    setAhora(Date.now());
    // El enlace para firmar lleva el código del evento actual (?e=...).
    setUrlFirmar(`${window.location.origin}/firmar${sufijoEvento()}`);
    // ¿Quien mira esta pantalla es el anfitrión? Solo él modera. Se calcula
    // aquí (y no al pintar) porque depende del enlace y del navegador, que en
    // el servidor todavía no existen.
    setAnfitrion(esAnfitrion());

    const eventoId = eventoActual();
    const sync = obtenerSync();
    const cancelar = sync.suscribir<Mensaje>(eventoId, COLECCION_MENSAJES, setMensajes);
    setCargado(true);

    // Solo en la demo local: si el muro está vacío, lo llenamos con ejemplos
    // para que no se vea vacío. Conectado al servidor no se siembra nada.
    if (sync.nombre === "local") {
      sync.listar<Mensaje>(eventoId, COLECCION_MENSAJES).then((items) => {
        if (items.length === 0) {
          for (const m of mensajesIniciales()) {
            void sync.guardar(eventoId, COLECCION_MENSAJES, m);
          }
        }
      });
    }

    // Refresca las etiquetas de tiempo cada minuto.
    const t = window.setInterval(() => setAhora(Date.now()), 60000);
    return () => {
      cancelar();
      window.clearInterval(t);
    };
  }, []);

  /* ---- Moderación (arreglado el 6 ago 2026) -------------------------------
   * Quitar un mensaje es irreversible y afecta al muro de TODOS. Tenía tres
   * defectos a la vez: no preguntaba, el botón era invisible en un teléfono
   * (solo aparecía al pasar el ratón) y, si el borrado fallaba, no se decía
   * nada — el anfitrión creía que había quitado el mensaje y seguía puesto. */
  const [porQuitar, setPorQuitar] = React.useState<Mensaje | null>(null);
  const [quitando, setQuitando] = React.useState(false);
  const [errorQuitar, setErrorQuitar] = React.useState("");

  const confirmarQuitar = async () => {
    if (!porQuitar) return;
    setQuitando(true);
    try {
      await obtenerSync().eliminar(eventoActual(), COLECCION_MENSAJES, porQuitar.id);
      setErrorQuitar("");
    } catch {
      setErrorQuitar(
        `No pudimos quitar el mensaje de ${porQuitar.nombre}. Si este evento usa llave de anfitrión, ábrelo desde el enlace que la lleva.`,
      );
    } finally {
      setQuitando(false);
      setPorQuitar(null);
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

      {errorQuitar ? (
        <p className="mt-4 rounded-[var(--radius)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorQuitar}
        </p>
      ) : null}

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
            {mensajesVistos.map((m) => (
              <article
                key={m.id}
                className="group relative mb-4 break-inside-avoid rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm"
              >
                {anfitrion ? (
                  // Siempre visible: antes solo aparecía al pasar el ratón, y en
                  // un teléfono eso lo dejaba invisible… pero PULSABLE, así que
                  // un toque a ciegas en esta esquina borraba un mensaje.
                  <button
                    onClick={() => setPorQuitar(m)}
                    aria-label={`Quitar el mensaje de ${m.nombre}`}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 text-muted-foreground ring-1 ring-border transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
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
        <ModoPantalla
          mensajes={mensajesVistos}
          urlFirmar={urlFirmar}
          onClose={() => setPantalla(false)}
          // El anfitrión puede quitar sin salir del proyector. La confirmación
          // es la misma de las tarjetas y se pinta encima (va después en el
          // árbol), y mientras está abierta el turno se detiene.
          onQuitar={anfitrion ? setPorQuitar : undefined}
          pausado={porQuitar !== null}
        />
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo="¿Quitar este mensaje del muro?"
        descripcion={
          <>
            Se quita el mensaje de <strong>{porQuitar?.nombre}</strong> del muro de todos los
            invitados y del proyector{porQuitar?.foto ? ", junto con su foto" : ""}. No se puede
            deshacer.
          </>
        }
        textoConfirmar={quitando ? "Quitando…" : "Sí, quitarlo"}
        onConfirmar={() => void confirmarQuitar()}
        onCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}
