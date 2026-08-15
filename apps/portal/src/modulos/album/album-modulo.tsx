"use client";

/**
 * MÓDULO ÁLBUM montado DENTRO del portal (tercer módulo migrado).
 *
 * El invitado sube sus fotos y videos y ve el álbum del evento en vivo. Habla
 * con el lugar central por `@salones/sync` con el código del evento que trae el
 * portal: con el servicio gestionado cada archivo sube al almacenamiento central
 * y aparece en el álbum de TODOS; sin él, la demo se queda en este dispositivo.
 *
 * Dos decisiones propias del portal (es la pantalla del INVITADO, no la del
 * anfitrión):
 *   • Cada quien borra SOLO lo que subió desde este teléfono (se recuerda por
 *     evento en el dispositivo). Nadie puede borrar los recuerdos de los demás.
 *   • Descargar el álbum completo NO está aquí: eso es del anfitrión y sigue en
 *     la app `album-fotos` hasta migrar esa pantalla.
 */
import * as React from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  Loader2,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { Button, EmptyState, cn, Confirmar, AvisoParticipacion } from "@salones/ui";
import {
  albumEsPrivado,
  albumEstaCerrado,
  esAnfitrion,
  estaConectado,
  huellaDeAutor,
  obtenerSync,
  quitarMedio,
  resolverMedios,
  mensajeDeSubida,
} from "@salones/sync";
import {
  COLECCION_FOTOS,
  MAX_MB,
  claveMisFotos,
  comprimirImagen,
  esArchivoDeAlbum,
  esVideo,
  fotosEjemplo,
  nuevoIdFoto,
  pesaDemasiado,
  porFecha,
  type Foto,
} from "./lib";
import { usePerfil } from "@/lib/perfil";

export function AlbumModulo({
  evento,
  nombreEvento,
  conVideo,
}: {
  evento: string;
  nombreEvento: string;
  /**
   * ¿Este evento contrató el PAQUETE DE VIDEO? (migración 0017)
   *
   * Llega resuelto desde el servidor (la página lo saca de los entitlements del
   * evento), así que aquí no hace falta preguntar nada ni esperar a nadie: la
   * primera pintada ya sabe si el video va o no va.
   *
   * ⚠️ Solo decide qué se DIBUJA. El candado está en `media-subir`, que niega la
   * subida de un video aunque alguien manipule esta pantalla.
   */
  conVideo: boolean;
}) {
  // El perfil común del teléfono: con él, cada recuerdo sube firmado (autor y,
  // si llegó con enlace personal, su renglón en la lista del anfitrión).
  const perfil = usePerfil(evento);
  const [fotos, setFotos] = React.useState<Foto[]>([]);
  /** Ids subidos desde ESTE dispositivo. En la demo LOCAL, lo que puede quitar. */
  const [mias, setMias] = React.useState<string[]>([]);
  // Se calcula tras montar para no desincronizar el render del servidor.
  const [conectado, setConectado] = React.useState<boolean | null>(null);
  // Con servidor, borrar del álbum COMPARTIDO es solo del anfitrión (llave 0009):
  // el invitado no puede quitar fotos de otros, ni las suyas una vez subidas.
  const [anfitrion, setAnfitrion] = React.useState(false);
  /**
   * ¿El álbum ya no admite fotos nuevas? (migración 0021). Arranca ABIERTO: si
   * fallara la consulta, es mejor enseñar la zona de subir de más —el servidor
   * la rechazaría igual— que dejar a los invitados sin aportar en plena fiesta.
   */
  const [cerrado, setCerrado] = React.useState(false);
  /**
   * ¿El álbum es privado? (migración 0022). Solo sirve para EXPLICARLO: quien lo
   * hace valer es la política de lectura de la base, que ni siquiera envía las
   * fotos ajenas. Sin este aviso, un invitado vería su álbum casi vacío y
   * pensaría que sus fotos no subieron.
   */
  const [privado, setPrivado] = React.useState(false);
  const [arrastrando, setArrastrando] = React.useState(false);
  const [subiendo, setSubiendo] = React.useState(0);
  const [porQuitar, setPorQuitar] = React.useState<Foto | null>(null);
  const [errorQuitar, setErrorQuitar] = React.useState("");
  const [error, setError] = React.useState("");
  const [idx, setIdx] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  /** URLs temporales de la demo local, para liberarlas al salir. */
  const temporalesRef = React.useRef<string[]>([]);
  /**
   * Dirección guardada → dirección con la que se muestra (firmada y con fecha de
   * caducidad). Lo que no esté aquí se muestra tal cual: las fotos de ejemplo y
   * las de la demo local no viven en el almacén y no hay nada que firmar.
   */
  const [vistas, setVistas] = React.useState<Record<string, string>>({});
  const ver = React.useCallback((u: string) => vistas[u] ?? u, [vistas]);

  /**
   * ¿Se puede quitar esta foto del álbum?
   *  · El ANFITRIÓN, cualquiera.
   *  · Quien la SUBIÓ desde este teléfono, la suya — y solo la suya.
   *
   * Lo segundo es nuevo (14 ago 2026). Antes, con servidor, el invitado no podía
   * quitar ni lo propio: la base solo aceptaba borrados del anfitrión (0009), así
   * que quien subía una foto por error tenía que buscar a los novios en mitad de
   * su boda. Ahora cada recuerdo va firmado con la llave de este teléfono y
   * `media-borrar` la comprueba en el servidor.
   *
   * `mias` decide lo que se DIBUJA; quien decide de verdad es el servidor. Si las
   * dos cosas se desincronizaran (se limpió el navegador a medias), el botón
   * saldría y el borrado diría que no — se avisa, no se rompe nada.
   */
  const puedeQuitar = React.useCallback(
    (f: Foto) => anfitrion || mias.includes(f.id),
    [mias, anfitrion],
  );

  // Álbum en vivo: con servidor, se suscribe a la colección del evento. En la
  // demo local las fotos se quedan en esta pestaña (sus URLs son temporales:
  // guardarlas no serviría de nada porque mueren al recargar).
  React.useEffect(() => {
    const enServidor = estaConectado();
    setConectado(enServidor);
    setAnfitrion(esAnfitrion(evento));
    void albumEstaCerrado(evento).then(setCerrado);
    void albumEsPrivado(evento).then(setPrivado);
    if (!enServidor) return;
    return obtenerSync().suscribir<Foto>(evento, COLECCION_FOTOS, (items) =>
      setFotos([...items].sort(porFecha)),
    );
  }, [evento]);

  // Lo que la base guarda es una REFERENCIA, no una dirección que sirva sola:
  // desde la migración 0013 el almacén es privado y cada foto se ve con una
  // dirección FIRMADA que caduca en una hora. Aquí se piden todas de una vez.
  //
  // No romperlo importa más de lo que parece: si esto falta, el día que se
  // aplique la 0013 el álbum del invitado aparece VACÍO en plena fiesta. Y
  // mientras la 0013 no esté aplicada, `resolverMedios` devuelve las de siempre,
  // así que este código es seguro antes y después del corte.
  const clavesFotos = fotos.map((f) => f.url).join("|");
  React.useEffect(() => {
    if (!estaConectado() || fotos.length === 0) return;
    let vivo = true;
    void resolverMedios(
      evento,
      fotos.map((f) => f.url),
    ).then((mapa) => {
      if (vivo) setVistas((previas) => ({ ...previas, ...mapa }));
    });
    return () => {
      vivo = false;
    };
    // Depende de la LISTA de fotos, no del sondeo: así no se pide firmar el
    // álbum entero cada tres segundos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavesFotos, evento]);

  // Lo subido desde este teléfono para ESTE evento.
  React.useEffect(() => {
    try {
      const guardadas = localStorage.getItem(claveMisFotos(evento));
      setMias(guardadas ? (JSON.parse(guardadas) as string[]) : []);
    } catch {
      setMias([]);
    }
  }, [evento]);

  // Al salir del módulo, soltar las URLs temporales de la demo.
  React.useEffect(() => {
    const temporales = temporalesRef;
    return () => temporales.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const anotarMias = React.useCallback(
    (ids: string[], quitar = false) => {
      setMias((prev) => {
        const siguiente = quitar
          ? prev.filter((id) => !ids.includes(id))
          : [...prev, ...ids.filter((id) => !prev.includes(id))];
        try {
          localStorage.setItem(claveMisFotos(evento), JSON.stringify(siguiente));
        } catch {
          /* sin espacio para la lista: se pierde el poder borrar, nada más */
        }
        return siguiente;
      });
    },
    [evento],
  );

  const agregar = React.useCallback(
    async (lista: FileList | null) => {
      if (!lista || lista.length === 0) return;
      // Sin paquete de video, el video se cae aquí además de estar escondido del
      // selector: arrastrar un archivo se salta el `accept`, así que quitarlo de
      // ahí esconde la opción pero no cierra la puerta.
      const validos = Array.from(lista).filter(
        (a) => esArchivoDeAlbum(a.type) && (conVideo || !esVideo(a.type)),
      );
      if (validos.length === 0) {
        setError(
          conVideo
            ? "Elige fotos o videos."
            : "En este evento solo se pueden subir fotos, no videos.",
        );
        return;
      }
      const aptos = validos.filter((a) => !pesaDemasiado(a));
      setError(
        aptos.length === validos.length
          ? ""
          : `Algún archivo pesa más de ${MAX_MB} MB y no se subió. ` +
              (conVideo ? "Prueba con un video más corto." : "Prueba con una foto más ligera."),
      );
      if (aptos.length === 0) return;

      // Demo de un solo dispositivo: las fotos se ven aquí, sin subir a ningún lado.
      if (!estaConectado()) {
        const nuevas: Foto[] = aptos.map((a) => {
          const url = URL.createObjectURL(a);
          temporalesRef.current.push(url);
          return { id: nuevoIdFoto(), nombre: a.name, url, tipo: a.type, fecha: Date.now() };
        });
        setFotos((prev) => [...nuevas, ...prev]);
        anotarMias(nuevas.map((f) => f.id));
        return;
      }

      // Servicio gestionado: cada archivo sube (comprimido, si es foto) al
      // almacenamiento central y se anota en la colección del evento; el álbum
      // de todos se actualiza solo por la suscripción.
      const sync = obtenerSync();
      // La firma de este teléfono, una vez para toda la tanda. Va con cada foto
      // para poder quitarla después; si el navegador no deja guardarla
      // (incógnito), se sube igual y simplemente no se podrá borrar.
      const huella = await huellaDeAutor(evento);
      setSubiendo((n) => n + aptos.length);
      for (const a of aptos) {
        try {
          const blob = a.type.startsWith("image/") ? await comprimirImagen(a) : a;
          const tipo = blob.type || a.type;
          const url = await sync.subirArchivo(evento, a.name, blob, tipo);
          const foto: Foto = {
            id: nuevoIdFoto(),
            nombre: a.name,
            url,
            tipo,
            fecha: Date.now(),
            // El álbum deja de ser anónimo cuando el teléfono sabe quién es.
            ...(perfil ? { autor: perfil.nombre } : {}),
            ...(perfil?.id ? { invitadoId: perfil.id } : {}),
            /**
             * La firma que permite QUITARLA después. Ojo con la diferencia:
             * `autor` es el nombre —para que el anfitrión sepa de quién es— y
             * cualquiera podría escribir el nombre de otro. Esto es la huella de
             * un secreto que solo tiene este teléfono, y es lo único que el
             * servidor acepta como prueba de "esto lo subí yo".
             */
            ...(huella ? { autorHuella: huella } : {}),
          };
          await sync.guardar(evento, COLECCION_FOTOS, foto);
          anotarMias([foto.id]);
        } catch (e) {
          setError(mensajeDeSubida(e));
        } finally {
          setSubiendo((n) => n - 1);
        }
      }
    },
    [evento, anotarMias, conVideo, perfil],
  );

  /* ---- Moderación (arreglado el 6 ago 2026) -----------------------------
   * Quitar un recuerdo es irreversible. Tenía tres defectos: no preguntaba, el
   * botón solo aparecía al pasar el ratón (invisible en un teléfono, pero
   * PULSABLE igual) y el fallo se tragaba en silencio. */
  const eliminar = React.useCallback(
    async (f: Foto): Promise<boolean> => {
      if (estaConectado()) {
        // Se quita del álbum compartido; la suscripción refresca la vista sola.
        // `quitarMedio` borra la fila Y el archivo del almacén: si solo se
        // quitara la fila, la foto desaparecería de la vista pero seguiría
        // gastando el cupo del evento (migración 0018).
        const r = await quitarMedio(evento, COLECCION_FOTOS, f.id);
        if (r === "sin-desplegar") {
          // Todavía sin la Edge Function: camino de siempre, que sirve al
          // anfitrión. Deja el archivo huérfano, pero es mejor que no poder
          // moderar durante el despliegue.
          try {
            await obtenerSync().eliminar(evento, COLECCION_FOTOS, f.id);
          } catch {
            return false;
          }
        } else if (r !== "ok") {
          return false;
        }
      } else {
        setFotos((prev) => prev.filter((x) => x.id !== f.id));
        if (f.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
      }
      anotarMias([f.id], true);
      return true;
    },
    [evento, anotarMias],
  );

  // Mientras el evento de demostración esté vacío, se enseñan fotos de muestra
  // para que se vea cómo queda el álbum. Con una foto real desaparecen.
  const ejemplos = React.useMemo(() => (evento === "demo" ? fotosEjemplo() : []), [evento]);
  const mostrando = fotos.length > 0 ? fotos : ejemplos;
  const sonEjemplos = fotos.length === 0 && ejemplos.length > 0;

  // Si el álbum cambia con el visor abierto (llegó una foto nueva, se borró la
  // que se estaba viendo), el índice no puede quedar apuntando al vacío.
  React.useEffect(() => {
    setIdx((i) =>
      i === null ? i : mostrando.length === 0 ? null : Math.min(i, mostrando.length - 1),
    );
  }, [mostrando.length]);

  // --- Visor a pantalla completa ---
  const abierto = idx !== null;
  const cerrar = React.useCallback(() => setIdx(null), []);
  const ir = React.useCallback(
    (d: number) => setIdx((i) => (i === null ? i : (i + d + mostrando.length) % mostrando.length)),
    [mostrando.length],
  );
  React.useEffect(() => {
    if (!abierto) return;
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
  }, [abierto, cerrar, ir]);
  const actual = idx === null ? null : mostrando[idx];

  return (
    <div className="space-y-8">
      {/* Zona para subir — desaparece con el álbum cerrado. Al anfitrión se le
          deja, para que pueda agregar las fotos del fotógrafo después. */}
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
          void agregar(e.dataTransfer.files);
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
              Tus recuerdos de {nombreEvento}, junto a los de todos los invitados.
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
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          {/*
            Va PEGADO al botón, no en un pie de página: para que valga, la
            persona tiene que poder enterarse justo cuando entrega la foto.
            La app suelta `album-fotos` ya lo hacía; el portal —que es el
            enlace que de verdad se reparte por WhatsApp— no lo tenía.
          */}
          <AvisoParticipacion accion="subir tus fotos" imagen className="max-w-md text-center" />
          <input
            ref={inputRef}
            type="file"
            accept={conVideo ? "image/*,video/*" : "image/*"}
            multiple
            className="hidden"
            onChange={(e) => {
              void agregar(e.target.files);
              e.target.value = "";
            }}
          />
          {cerrado && anfitrion ? (
            <p className="text-xs text-muted-foreground">
              El álbum está cerrado para los invitados. Tú sí puedes seguir subiendo.
            </p>
          ) : null}
        </div>
      </div>
      )}

      {/* Contador */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {sonEjemplos ? (
            "Fotos de ejemplo: así se verá el álbum cuando los invitados suban las suyas."
          ) : (
            <>
              <span className="font-semibold text-foreground">{fotos.length}</span>{" "}
              {fotos.length === 1 ? "recuerdo" : "recuerdos"} en el álbum
            </>
          )}
        </p>
      </div>

      {/* Galería en mosaico */}
      {mostrando.length === 0 ? (
        <EmptyState
          icon={<Camera className="size-8" />}
          title="Todavía no hay fotos"
          description="Sé el primero: sube una y aparecerá aquí, en el álbum de todos."
        />
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {mostrando.map((f, i) => (
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
              {puedeQuitar(f) ? (
                <button
                  type="button"
                  aria-label={`Quitar ${f.nombre} del álbum`}
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

      {privado && !anfitrion ? (
        <p className="rounded-[var(--radius)] border border-border bg-muted/40 p-3 text-center text-sm text-muted-foreground">
          En este álbum <strong className="text-foreground">cada quien ve solo sus propias fotos</strong>.
          Las tuyas están aquí; quien organiza las ve todas.
        </p>
      ) : null}

      {conectado === false ? (
        <p className="text-xs text-muted-foreground">
          En esta demostración las fotos se quedan en tu dispositivo. Con el servicio del salón, lo
          que sube cada invitado aparece en el álbum de todos.
        </p>
      ) : null}

      {/* Visor a pantalla completa */}
      {abierto && actual ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={actual.nombre}
          onClick={cerrar}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
        >
          <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
            <a
              href={ver(actual.url)}
              download={actual.nombre}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Descargar ${actual.nombre}`}
              className="grid size-11 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
            >
              <Download className="size-5" />
            </a>
            <button
              onClick={cerrar}
              aria-label="Cerrar"
              className="grid size-11 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10"
            >
              <X className="size-5" />
            </button>
          </div>
          {mostrando.length > 1 ? (
            <>
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
            </>
          ) : null}
          <div className="max-h-[85vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {esVideo(actual.tipo) ? (
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

      {errorQuitar ? (
        <p className="mt-4 rounded-[var(--radius)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorQuitar}
        </p>
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo={porQuitar?.tipo?.startsWith("video/") ? "¿Quitar este video?" : "¿Quitar esta foto?"}
        descripcion={
          <>
            Se quita <strong>{porQuitar?.nombre}</strong> del álbum del evento. No se puede
            deshacer.
          </>
        }
        textoConfirmar="Sí, quitarla"
        onConfirmar={() => {
          const f = porQuitar;
          setPorQuitar(null);
          if (!f) return;
          void eliminar(f).then((ok) =>
            setErrorQuitar(ok ? "" : `No pudimos quitar ${f.nombre}. Inténtalo de nuevo.`),
          );
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </div>
  );
}
