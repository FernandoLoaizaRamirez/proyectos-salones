"use client";

/**
 * MÓDULO MURO montado DENTRO del portal (primer módulo migrado).
 *
 * El invitado deja su mensaje (con foto opcional) y ve el muro del evento en
 * vivo. Habla con el lugar central por `@salones/sync`, con el código del evento
 * que trae el portal: en local queda en el dispositivo; con el servicio
 * gestionado, el mensaje llega al muro de todos los invitados de ESE evento.
 */
import * as React from "react";
import { Camera, X, Send, Check, PenLine, Loader2, MessageSquare } from "lucide-react";
import { Button, Card, cn, AvisoParticipacion } from "@salones/ui";
import {
  obtenerSync,
  estaConectado,
  aTextoDeDatos,
  resolverMedios,
  mensajeDeSubida,
} from "@salones/sync";
import {
  COLECCION_MENSAJES,
  comprimirImagen,
  nuevoIdMensaje,
  tiempoRelativo,
  type Mensaje,
} from "./lib";
import { guardarPerfil, usePerfil } from "@/lib/perfil";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function MuroModulo({ evento, nombreEvento }: { evento: string; nombreEvento: string }) {
  const perfil = usePerfil(evento);
  const [nombre, setNombre] = React.useState("");
  const [texto, setTexto] = React.useState("");

  /*
   * El perfil llega DESPUÉS del primer pintado (vive en localStorage), así que
   * no puede ser el estado inicial: cuando aparece, la firma se rellena sola —
   * editable, por si hoy firma otra persona desde este teléfono.
   */
  React.useEffect(() => {
    if (!perfil) return;
    setNombre((previo) => (previo.trim() ? previo : perfil.nombre));
  }, [perfil]);
  /* La foto se guarda en dos piezas: el BLOB comprimido (lo que sube al
   * almacén) y una dirección temporal para la vista previa. Antes era una sola
   * cosa: la foto en TEXTO dentro del propio mensaje, que hacía que el muro
   * entero se volviera a bajar con todas las fotos dentro en cada refresco. */
  const [fotoBlob, setFotoBlob] = React.useState<Blob | null>(null);
  const [vistaPrevia, setVistaPrevia] = React.useState<string | null>(null);
  const [procesandoFoto, setProcesandoFoto] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState("");
  const [enviado, setEnviado] = React.useState<Mensaje | null>(null);
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([]);

  const quitarFoto = React.useCallback(() => {
    setFotoBlob(null);
    setVistaPrevia((previa) => {
      if (previa) URL.revokeObjectURL(previa);
      return null;
    });
  }, []);

  /* ---- Las fotos, desde el 6 ago 2026 -------------------------------------
   * Ahora la foto sube al almacén y en el mensaje queda su dirección, que en un
   * almacén privado no sirve sola: hay que cambiarla por una FIRMADA, igual que
   * en el álbum. `resolverMedios` devuelve tal cual lo que no sea del almacén
   * (los mensajes viejos con la foto en texto), así que nada de antes se rompe. */
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
    void resolverMedios(evento, fotos).then((mapa) => {
      if (vivo) setVistas((previas) => ({ ...previas, ...mapa }));
    });
    return () => {
      vivo = false;
    };
    // Depende de la LISTA de fotos, no del sondeo de cada 3 s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavesFotos, evento]);
  // Se calcula tras montar para no desincronizar el render del servidor.
  const [conectado, setConectado] = React.useState<boolean | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Muro en vivo: se suscribe a la colección del evento.
  React.useEffect(() => {
    setConectado(estaConectado());
    const cancelar = obtenerSync().suscribir<Mensaje>(evento, COLECCION_MENSAJES, (items) => {
      setMensajes([...items].sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0)));
    });
    return cancelar;
  }, [evento]);

  const elegirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProcesandoFoto(true);
    setError("");
    try {
      const blob = await comprimirImagen(file);
      setFotoBlob(blob);
      setVistaPrevia((previa) => {
        if (previa) URL.revokeObjectURL(previa);
        return URL.createObjectURL(blob);
      });
    } catch {
      setError("No pudimos usar esa imagen. Intenta con otra.");
    } finally {
      setProcesandoFoto(false);
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !texto.trim()) {
      setError("Escribe tu mensaje y tu nombre.");
      return;
    }
    setError("");
    setEnviando(true);
    const sync = obtenerSync();
    try {
      /* La foto va al ALMACÉN y en el mensaje queda solo su dirección — el mismo
       * camino del álbum. En modo LOCAL no hay almacén, así que ahí sí se guarda
       * como texto: es lo que hace que la demo sobreviva a recargar. */
      let foto: string | undefined;
      if (fotoBlob) {
        foto = estaConectado()
          ? await sync.subirArchivo(evento, `muro-${Date.now()}.jpg`, fotoBlob, "image/jpeg")
          : await aTextoDeDatos(fotoBlob);
      }

      const msg: Mensaje = {
        id: nuevoIdMensaje(),
        nombre: nombre.trim(),
        texto: texto.trim(),
        fecha: Date.now(),
        ...(foto ? { foto } : {}),
        // Si firmó con perfil de enlace personal, el mensaje queda atado a su
        // renglón de la lista del anfitrión (quién escribió qué, con id real).
        ...(perfil?.id ? { invitadoId: perfil.id } : {}),
      };

      await sync.guardar(evento, COLECCION_MENSAJES, msg);
      // La primera firma se vuelve el perfil común del teléfono: los demás
      // módulos (playlist, trivia, RSVP…) ya no vuelven a preguntar quién es.
      if (!perfil) guardarPerfil(evento, { nombre: msg.nombre });
      setEnviado(msg);
    } catch (err) {
      setError(mensajeDeSubida(err));
    } finally {
      setEnviando(false);
    }
  };

  const otro = () => {
    // El nombre no se limpia a ciegas: con perfil, el siguiente mensaje ya
    // sale firmado (lo normal es que escriba la misma persona).
    setNombre(perfil?.nombre ?? "");
    setTexto("");
    setFotoBlob(null);
    setVistaPrevia((previa) => {
      if (previa) URL.revokeObjectURL(previa);
      return null;
    });
    setError("");
    setEnviado(null);
  };

  return (
    <div className="space-y-8">
      {enviado ? (
        <Card className="mx-auto w-full max-w-md p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-green-500/15 text-green-600">
            <Check className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">¡Gracias, {enviado.nombre}!</h2>
          <p className="mt-2 text-muted-foreground">
            Tu mensaje quedó en el muro de {nombreEvento}.
          </p>
          {vistaPrevia ? (
            <img
              src={vistaPrevia}
              alt="Tu foto"
              className="mx-auto mt-5 max-h-48 rounded-[var(--radius)] object-cover"
            />
          ) : null}
          <Button onClick={otro} className="mt-6 w-full">
            <PenLine className="size-4" /> Escribir otro mensaje
          </Button>
          {conectado === false ? (
            <p className="mt-4 text-xs text-muted-foreground">
              En esta demostración tu mensaje se guarda en este teléfono. Para reunir los mensajes de
              todos los invitados se usa el servicio gestionado.
            </p>
          ) : null}
        </Card>
      ) : (
        <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{nombreEvento}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Déjales unas palabras</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Firma el libro de recuerdos con tus buenos deseos.
            </p>
          </div>

          <form onSubmit={guardar} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tu mensaje</label>
              <textarea
                className={cn(campo, "min-h-28 resize-y")}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={500}
                placeholder="Escribe unas palabras…"
              />
              <div className="mt-1 text-right text-xs text-muted-foreground">{texto.length}/500</div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Tu nombre</label>
              <input
                className={campo}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={60}
                placeholder="¿Cómo firmas?"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Foto (opcional)</label>
              {vistaPrevia ? (
                <div className="relative overflow-hidden rounded-[var(--radius)] border border-border">
                  <img src={vistaPrevia} alt="Vista previa" className="max-h-56 w-full object-cover" />
                  <button
                    type="button"
                    onClick={quitarFoto}
                    aria-label="Quitar foto"
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={procesandoFoto}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  {procesandoFoto ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Preparando foto…
                    </>
                  ) : (
                    <>
                      <Camera className="size-4" /> Agregar una foto
                    </>
                  )}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={elegirFoto} />
            </div>

            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

            {/* Lo que se escribe aquí se PROYECTA en el salón, con su nombre. */}
            <AvisoParticipacion accion="dejar tu mensaje" imagen className="text-center" />

            <Button type="submit" className="w-full" disabled={procesandoFoto || enviando}>
              {enviando ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Send className="size-4" /> Dejar mi mensaje
                </>
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* El muro en vivo */}
      <section>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="size-5 text-primary" />
          Mensajes del evento
          {mensajes.length > 0 ? (
            <span className="text-sm font-normal text-muted-foreground">({mensajes.length})</span>
          ) : null}
        </h3>

        {mensajes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aún no hay mensajes. ¡Sé el primero en firmar!
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mensajesVistos.map((m) => (
              <Card key={m.id} className="p-4">
                {m.foto ? (
                  <img
                    src={m.foto}
                    alt={`Foto de ${m.nombre}`}
                    className="mb-3 max-h-44 w-full rounded-[var(--radius)] object-cover"
                  />
                ) : null}
                <p className="whitespace-pre-line text-sm">{m.texto}</p>
                <p className="mt-3 text-sm font-medium">— {m.nombre}</p>
                <p className="text-xs text-muted-foreground">{tiempoRelativo(m.fecha)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
