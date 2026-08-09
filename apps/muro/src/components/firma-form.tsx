"use client";

import * as React from "react";
import { Camera, X, Send, Check, PenLine, MessageCircle, Loader2 } from "lucide-react";
import { Button, Card, cn, AvisoParticipacion } from "@salones/ui";
import {
  obtenerSync,
  estaConectado,
  eventoActual,
  aTextoDeDatos,
  mensajeDeSubida,
} from "@salones/sync";
import {
  evento,
  comprimirImagen,
  COLECCION_MENSAJES,
  type Mensaje,
} from "@/lib/muro";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function FirmaForm() {
  const [nombre, setNombre] = React.useState("");
  const [texto, setTexto] = React.useState("");
  /**
   * La foto se guarda en dos piezas: el BLOB comprimido (lo que se sube) y una
   * dirección temporal para la vista previa de esta pantalla.
   *
   * Antes era una sola cosa: la foto convertida a TEXTO, que viajaba dentro del
   * propio mensaje. Eso hacía que el muro entero se volviera a bajar con todas
   * las fotos dentro en cada refresco, y que las fotos no pasaran por el candado
   * de fotos privadas. Ahora sube al almacén, como el álbum.
   */
  const [fotoBlob, setFotoBlob] = React.useState<Blob | null>(null);
  const [vistaPrevia, setVistaPrevia] = React.useState<string | null>(null);
  const [procesandoFoto, setProcesandoFoto] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState("");
  const [enviado, setEnviado] = React.useState<Mensaje | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const quitarFoto = React.useCallback(() => {
    setVistaPrevia((previa) => {
      if (previa) URL.revokeObjectURL(previa);
      return null;
    });
    setFotoBlob(null);
  }, []);

  // Si se cierra la pantalla con una foto elegida, se suelta su memoria.
  React.useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

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
    const eventoId = eventoActual();
    try {
      /* La foto va al ALMACÉN y en el mensaje queda solo su dirección — el
       * mismo camino del álbum. En modo LOCAL no hay almacén donde subirla, así
       * que ahí sí se guarda como texto: es lo que hace que la demo sobreviva a
       * recargar la página. */
      let foto: string | undefined;
      if (fotoBlob) {
        foto = estaConectado()
          ? await sync.subirArchivo(eventoId, `muro-${Date.now()}.jpg`, fotoBlob, "image/jpeg")
          : await aTextoDeDatos(fotoBlob);
      }

      const msg: Mensaje = {
        id: "MS-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        nombre: nombre.trim(),
        texto: texto.trim(),
        fecha: Date.now(),
        ...(foto ? { foto } : {}),
      };

      // Escribe en el "lugar central" (@salones/sync) del evento del enlace:
      // en local queda en este dispositivo; con el servicio gestionado llega al
      // muro de todos los invitados de ESTE evento.
      await sync.guardar(eventoId, COLECCION_MENSAJES, msg);
      setEnviado(msg);
    } catch (err) {
      setError(mensajeDeSubida(err));
    } finally {
      setEnviando(false);
    }
  };

  const enviarWhatsApp = () => {
    if (!enviado) return;
    const lineas = [
      `Mensaje para el muro · ${evento.nombre}`,
      "",
      `De: ${enviado.nombre}`,
      enviado.texto,
      enviado.foto ? "(Adjunto una foto desde mi teléfono)" : "",
    ].filter(Boolean);
    window.open(
      `https://wa.me/${evento.organizador.whatsapp}?text=${encodeURIComponent(lineas.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const otro = () => {
    setNombre("");
    setTexto("");
    quitarFoto();
    setError("");
    setEnviado(null);
  };

  if (enviado) {
    return (
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-green-500/15 text-green-600">
          <Check className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">¡Gracias, {enviado.nombre}!</h1>
        <p className="mt-2 text-muted-foreground">
          Tu mensaje quedó guardado en el muro de {evento.nombre}. ¡Los novios lo van a atesorar!
        </p>
        {vistaPrevia ? (
          <img
            src={vistaPrevia}
            alt="Tu foto"
            className="mx-auto mt-5 max-h-48 rounded-[var(--radius)] object-cover"
          />
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={enviarWhatsApp} variant="outline" className="w-full">
            <MessageCircle className="size-4" /> Enviar también al anfitrión por WhatsApp
          </Button>
          <Button onClick={otro} className="w-full">
            <PenLine className="size-4" /> Escribir otro mensaje
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {estaConectado()
            ? "Tu mensaje ya está en el muro de la fiesta, junto con los de los demás invitados."
            : "En esta demostración tu mensaje se guarda en este teléfono. Para reunir en una sola pantalla los mensajes de todos los invitados se usa el servicio gestionado."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{evento.nombre}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{evento.invitacion}</h1>
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
            placeholder="Escribe unas palabras para los novios…"
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={elegirFoto}
          />
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

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

        <AvisoParticipacion accion="dejar tu mensaje" />
      </form>
    </Card>
  );
}
