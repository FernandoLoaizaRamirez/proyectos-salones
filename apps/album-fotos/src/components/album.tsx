"use client";

import * as React from "react";
import {
  Camera,
  Download,
  ImagePlus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Loader2,
} from "lucide-react";
import { Button, EmptyState, cn, AvisoParticipacion, Confirmar } from "@salones/ui";
import {
  obtenerSync,
  estaConectado,
  eventoActual,
  esAnfitrion,
  resolverMedios,
  albumEstaCerrado,
  descargarMedios,
  huellaDeAutor,
  mensajeDeSubida,
  pesaDemasiado,
  quitarMedio,
  MB_POR_ARCHIVO,
  type ResultadoDescarga,
} from "@salones/sync";
import {
  fotosEjemplo,
  comprimirImagen,
  COLECCION_FOTOS,
  type Archivo,
} from "@/lib/album-data";
import { useTieneVideo } from "@/lib/video";

export function Album() {
  // Con el servicio gestionado, el álbum llega del servidor (y arranca vacío
  // hasta que los invitados suben); en local, la demo muestra los ejemplos.
  const [archivos, setArchivos] = React.useState<Archivo[]>(() =>
    estaConectado() ? [] : fotosEjemplo,
  );
  const [arrastrando, setArrastrando] = React.useState(false);
  const [subiendo, setSubiendo] = React.useState(0);
  const [errorSubida, setErrorSubida] = React.useState("");
  const [porQuitar, setPorQuitar] = React.useState<Archivo | null>(null);
  const [errorQuitar, setErrorQuitar] = React.useState("");
  const [descarga, setDescarga] = React.useState<{ hechas: number; total: number } | null>(null);
  const [resultadoDescarga, setResultadoDescarga] = React.useState<ResultadoDescarga | null>(null);
  /** Lo lee `descargarMedios` entre archivo y archivo para poder detenerse. */
  const cancelarDescarga = React.useRef(false);
  const [idx, setIdx] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const contador = React.useRef(0);
  // Solo el anfitrión puede quitar fotos del álbum común. Arranca en false: si
  // algo fallara, se esconde el botón en vez de enseñárselo a un invitado.
  const [anfitrion, setAnfitrion] = React.useState(false);
  /** ¿Se contrató el paquete de video? Si no, aquí solo se suben fotos. */
  const conVideo = useTieneVideo();
  /**
   * La firma de ESTE teléfono. Con ella se sabe qué recuerdos son suyos, que es
   * lo único que puede quitar un invitado. Arranca en null: hasta saberla, no se
   * enseña ningún botón de borrar — esconder de más nunca hace daño.
   */
  const [miHuella, setMiHuella] = React.useState<string | null>(null);
  /**
   * ¿El álbum ya no admite fotos nuevas? (migración 0021)
   *
   * Arranca ABIERTO, al revés que los otros interruptores de esta pantalla. Aquí
   * la duda se resuelve al otro lado a propósito: esconder la zona de subir por
   * un fallo de red dejaría a los invitados sin poder aportar en plena fiesta,
   * mientras que enseñarla de más solo cuesta un aviso del servidor.
   */
  const [cerrado, setCerrado] = React.useState(false);
  // Dirección guardada → dirección con la que se muestra (firmada y con fecha
  // de caducidad). Lo que no esté aquí se muestra tal cual.
  const [vistas, setVistas] = React.useState<Record<string, string>>({});
  const ver = React.useCallback((u: string) => vistas[u] ?? u, [vistas]);

  // Álbum COMPARTIDO: se suscribe al "lugar central" (@salones/sync) y se
  // actualiza solo con las fotos que sube cada invitado desde su teléfono.
  React.useEffect(() => {
    // Depende del enlace y del navegador, que en el servidor no existen.
    setAnfitrion(esAnfitrion());
    void huellaDeAutor(eventoActual()).then(setMiHuella);
    void albumEstaCerrado(eventoActual()).then(setCerrado);
    if (!estaConectado()) return;
    return obtenerSync().suscribir<Archivo>(eventoActual(), COLECCION_FOTOS, setArchivos);
  }, []);

  // Lo que se guarda en la base es una REFERENCIA; la dirección con la que se
  // ve de verdad se pide aquí y caduca en una hora (migración 0013). Si el
  // servidor todavía no lo soporta, devuelve las de siempre y no se nota nada.
  const clavesArchivos = archivos.map((a) => a.url).join("|");
  React.useEffect(() => {
    if (!estaConectado() || archivos.length === 0) return;
    let vivo = true;
    void resolverMedios(
      eventoActual(),
      archivos.map((a) => a.url),
    ).then((mapa) => {
      if (vivo) setVistas(mapa);
    });
    return () => {
      vivo = false;
    };
    // `clavesArchivos` cambia solo cuando cambia la lista de fotos, no en cada
    // sondeo: así no se pide firmar el álbum entero cada tres segundos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavesArchivos]);

  const agregar = React.useCallback(
    async (lista: FileList | null) => {
      if (!lista) return;
      const elegidos = Array.from(lista);
      const validos = elegidos.filter(
        (a) => a.type.startsWith("image/") || (conVideo && a.type.startsWith("video/")),
      );

      // ARRASTRAR UN ARCHIVO SE SALTA EL `accept` DEL SELECTOR: quitar "video/*"
      // de ahí esconde la opción, pero no impide soltar un video encima. Por eso
      // se filtra también aquí. Y se DICE: descartarlo en silencio deja al
      // invitado esperando una subida que nunca empezó.
      const avisoVideo =
        !conVideo && elegidos.some((a) => a.type.startsWith("video/"))
          ? "En este evento solo se pueden subir fotos, no videos."
          : "";

      // Tope por archivo. Se comprueba ANTES de empezar: dejar que el teléfono
      // suba 40 MB por la red de una boda para que el almacén lo rechace al
      // final es la peor forma posible de decir que no. Las fotos se comprimen
      // más abajo, así que en la práctica esto solo frena videos.
      const aptos = validos.filter((a) => !a.type.startsWith("video/") || !pesaDemasiado(a));
      const avisoPeso =
        aptos.length === validos.length
          ? ""
          : `Algún video pesa más de ${MB_POR_ARCHIVO} MB y no se subió. Prueba con uno más corto.`;

      setErrorSubida([avisoVideo, avisoPeso].filter(Boolean).join(" "));
      if (aptos.length === 0) return;

      // Modo local (demo de un solo dispositivo): igual que siempre.
      if (!estaConectado()) {
        const nuevos: Archivo[] = aptos.map((a) => {
          contador.current += 1;
          return {
            id: `f-${contador.current}`,
            nombre: a.name,
            url: URL.createObjectURL(a),
            tipo: a.type,
          };
        });
        setArchivos((prev) => [...nuevos, ...prev]);
        return;
      }

      // Modo servidor: cada foto sube (comprimida) al almacenamiento central y se
      // anota en la colección; el álbum de todos se actualiza solo.
      const sync = obtenerSync();
      const eventoId = eventoActual();
      // Una vez para toda la tanda: es la firma que permitirá quitarlas después.
      const huella = await huellaDeAutor(eventoId);
      setSubiendo((n) => n + aptos.length);
      for (const a of aptos) {
        try {
          const blob = a.type.startsWith("image/") ? await comprimirImagen(a) : a;
          const tipo = blob.type || a.type;
          const url = await sync.subirArchivo(eventoId, a.name, blob, tipo);
          await sync.guardar(eventoId, COLECCION_FOTOS, {
            id: "F-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
            nombre: a.name,
            url,
            tipo,
            fecha: Date.now(),
            // La prueba de "esto lo subí yo". Es una HUELLA, no la llave: la
            // colección la puede leer cualquier invitado.
            ...(huella ? { autorHuella: huella } : {}),
          });
        } catch (e) {
          setErrorSubida(mensajeDeSubida(e));
        } finally {
          setSubiendo((n) => n - 1);
        }
      }
    },
    [conVideo],
  );

  /**
   * ¿Este recuerdo lo subió ESTE teléfono?
   *
   * Se compara la huella guardada con la de aquí, que es exactamente lo que el
   * servidor va a aceptar: así el botón no promete nada que `media-borrar` vaya
   * a negar después. Las fotos de antes del 14 ago 2026 no llevan huella, así
   * que solo las puede quitar el anfitrión.
   */
  const esMia = React.useCallback(
    (f: Archivo) => !!miHuella && f.autorHuella === miHuella,
    [miHuella],
  );

  /* ---- Moderación (arreglado el 6 ago 2026) -----------------------------
   * Quitar un recuerdo es irreversible. Tenía tres defectos: no preguntaba, el
   * botón solo aparecía al pasar el ratón (invisible en un teléfono, pero
   * PULSABLE igual) y el fallo se tragaba en silencio. */
  const eliminar = React.useCallback(async (f: Archivo): Promise<boolean> => {
    if (estaConectado()) {
      // Se quita del álbum compartido; la suscripción refresca la vista sola.
      // `quitarMedio` borra la fila Y el archivo del almacén: si solo se quitara
      // la fila, la foto desaparecería de la vista pero seguiría gastando el
      // cupo del evento (migración 0018).
      const r = await quitarMedio(eventoActual(), COLECCION_FOTOS, f.id);
      if (r !== "sin-desplegar") return r === "ok";
      // Todavía sin la Edge Function: camino de siempre, que sirve al anfitrión.
      try {
        await obtenerSync().eliminar(eventoActual(), COLECCION_FOTOS, f.id);
        return true;
      } catch {
        return false;
      }
    }
    setArchivos((prev) => {
      const encontrado = prev.find((x) => x.id === f.id);
      if (encontrado && encontrado.url.startsWith("blob:")) URL.revokeObjectURL(encontrado.url);
      return prev.filter((x) => x.id !== f.id);
    });
    return true;
  }, []);

  /**
   * Baja el álbum entero.
   *
   * ⚠️ ANTES ESTABA ROTO: apuntaba un enlace `<a download>` a cada archivo, y el
   * navegador IGNORA `download` cuando el archivo es de otro dominio —el almacén
   * siempre lo es—, así que los ABRÍA en pestañas en vez de guardarlos; y al
   * dispararlos todos de golpe, además, los bloqueaba por parecer ventanas
   * emergentes. `descargarMedios` los baja de verdad (fetch → blob), de uno en
   * uno, y dice cuántos fallaron.
   */
  const descargarTodo = React.useCallback(async () => {
    setResultadoDescarga(null);
    cancelarDescarga.current = false;
    setDescarga({ hechas: 0, total: archivos.length });

    const r = await descargarMedios(
      archivos.map((f) => ({ nombre: f.nombre, url: ver(f.url) })),
      (hechas, total) => setDescarga({ hechas, total }),
      () => !cancelarDescarga.current,
    );

    setDescarga(null);
    setResultadoDescarga(r);
    // `ver` va en las dependencias a propósito: sin él, al descargar se usarían
    // las direcciones de la primera carga, que ya habrían caducado.
  }, [archivos, ver]);

  // --- Visor a pantalla completa ---
  const open = idx !== null;
  const cerrar = React.useCallback(() => setIdx(null), []);
  const ir = React.useCallback(
    (d: number) => setIdx((i) => (i === null ? i : (i + d + archivos.length) % archivos.length)),
    [archivos.length],
  );
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowRight") ir(1);
      else if (e.key === "ArrowLeft") ir(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, cerrar, ir]);
  const actual = idx === null ? null : archivos[idx];

  return (
    <div className="space-y-8">
      {/* Zona para subir — desaparece con el álbum cerrado. Al anfitrión se le
          deja: cerrar es para que no entre nada de fuera, no para atarse las
          manos (después se agregan las fotos del fotógrafo). */}
      {cerrado && !anfitrion ? (
        <div className="rounded-[var(--radius)] border border-border bg-muted/40 p-6 text-center">
          <p className="font-medium">Este álbum ya está cerrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ya no admite fotos nuevas, pero puedes seguir viéndolo y descargando lo que quieras.
          </p>
        </div>
      ) : (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          agregar(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-[var(--radius)] border-2 border-dashed border-border p-8 text-center transition-colors",
          arrastrando && "border-primary bg-muted",
        )}
      >
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-primary">
            <ImagePlus className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">{conVideo ? "Sube tus fotos y videos" : "Sube tus fotos"}</p>
            <p className="text-sm text-muted-foreground">
              {conVideo
                ? "Arrastra los archivos aquí o toca el botón para elegirlos."
                : "Arrastra tus fotos aquí o toca el botón para elegirlas."}
            </p>
          </div>
          <Button onClick={() => inputRef.current?.click()} disabled={subiendo > 0}>
            {subiendo > 0 ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Subiendo {subiendo}…
              </>
            ) : (
              <>
                <Camera className="size-4" /> {conVideo ? "Elegir archivos" : "Elegir fotos"}
              </>
            )}
          </Button>
          {errorSubida ? <p className="text-sm text-red-500">{errorSubida}</p> : null}
          {errorQuitar ? <p className="text-sm text-red-500">{errorQuitar}</p> : null}
          <input
            ref={inputRef}
            type="file"
            // Sin paquete de video, el selector del teléfono ni siquiera ofrece
            // la galería de videos. Es el "esconder" que pidió el negocio; el
            // "impedir" lo hace el servidor y el filtro de `agregar`.
            accept={conVideo ? "image/*,video/*" : "image/*"}
            multiple
            className="hidden"
            onChange={(e) => agregar(e.target.files)}
          />
          <AvisoParticipacion accion="subir tus fotos" imagen className="max-w-md text-center" />
          {cerrado && anfitrion ? (
            <p className="text-xs text-muted-foreground">
              El álbum está cerrado para los invitados. Tú sí puedes seguir subiendo.
            </p>
          ) : null}
        </div>
      </div>
      )}

      {/* Contador + descargar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{archivos.length}</span>{" "}
            {archivos.length === 1 ? "recuerdo" : "recuerdos"} en el álbum
          </p>
          {archivos.length > 0 ? (
            descarga ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Guardando {descarga.hechas} de {descarga.total}…
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    cancelarDescarga.current = true;
                  }}
                >
                  Detener
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => void descargarTodo()}>
                <Download className="size-4" /> Descargar todo
              </Button>
            )
          ) : null}
        </div>

        {resultadoDescarga ? (
          resultadoDescarga.fallidas === 0 && !resultadoDescarga.cancelada ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Listo: se guardaron {resultadoDescarga.guardadas}{" "}
              {resultadoDescarga.guardadas === 1 ? "archivo" : "archivos"} en tu dispositivo.
            </p>
          ) : (
            <p className="text-sm text-destructive">
              {resultadoDescarga.cancelada
                ? `Descarga detenida: se guardaron ${resultadoDescarga.guardadas}.`
                : `Se guardaron ${resultadoDescarga.guardadas}, pero ${resultadoDescarga.fallidas} no se pudieron bajar.`}{" "}
              Revisa tu conexión e inténtalo de nuevo.
            </p>
          )
        ) : null}
      </div>

      {/* Galería en mosaico */}
      {archivos.length === 0 ? (
        <EmptyState
          icon={<Camera className="size-8" />}
          title="Todavía no hay fotos"
          description="Cuando los invitados suban sus fotos, aparecerán aquí en la galería en vivo."
        />
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {archivos.map((f, i) => (
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
                {f.tipo.startsWith("video/") ? (
                  <div className="relative">
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
              {anfitrion || esMia(f) ? (
                <button
                  type="button"
                  aria-label={`Eliminar ${f.nombre}`}
                  onClick={() => setPorQuitar(f)}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Visor a pantalla completa */}
      {open && actual ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={actual.nombre}
          onClick={cerrar}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
        >
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="absolute right-5 top-5 z-10 grid size-11 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              ir(-1);
            }}
            aria-label="Anterior"
            className="absolute left-4 z-10 grid size-11 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10 md:left-8"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              ir(1);
            }}
            aria-label="Siguiente"
            className="absolute right-4 z-10 grid size-11 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10 md:right-8"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="max-h-[85vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {actual.tipo.startsWith("video/") ? (
              <video src={ver(actual.url)} controls autoPlay className="max-h-[85vh] w-auto rounded-lg" />
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

      <Confirmar
        abierto={porQuitar !== null}
        titulo={porQuitar?.tipo.startsWith("video/") ? "¿Quitar este video?" : "¿Quitar esta foto?"}
        descripcion={
          // Se le habla distinto a cada uno: el anfitrión está borrando el
          // recuerdo de OTRA persona —eso hay que decirlo— y el invitado está
          // retirando el suyo, que es su derecho y no debería sonar a regañina.
          porQuitar && !anfitrion && esMia(porQuitar) ? (
            <>
              Se retira <strong>{porQuitar.nombre}</strong>, que subiste tú. Desaparece del álbum de
              todos y no se puede deshacer.
            </>
          ) : (
            <>
              Se quita <strong>{porQuitar?.nombre}</strong> del álbum de todos los invitados. No se
              puede deshacer, y si nadie la descargó antes, se pierde.
            </>
          )
        }
        textoConfirmar="Sí, quitarla"
        onConfirmar={() => {
          const f = porQuitar;
          setPorQuitar(null);
          if (!f) return;
          void eliminar(f).then((ok) =>
            setErrorQuitar(
              ok
                ? ""
                : esMia(f)
                  ? `No pudimos quitar ${f.nombre}. Solo se puede desde el mismo teléfono con el que la subiste.`
                  : `No pudimos quitar ${f.nombre}. Solo puede quitarla quien la subió, o quien organiza el evento desde su enlace.`,
            ),
          );
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}
