"use client";

/**
 * MÓDULO PLAYLIST montado DENTRO del portal (segundo módulo migrado).
 *
 * El invitado pide canciones y vota por las de los demás; la lista se ordena por
 * votos y se actualiza en vivo. Habla con el lugar central por `@salones/sync`
 * con el código del evento que trae el portal: en local queda en el dispositivo;
 * con el servicio gestionado, las peticiones de todos los teléfonos caen en la
 * MISMA lista (la que ve el DJ).
 *
 * Los votos propios se guardan en este dispositivo (localStorage) POR EVENTO,
 * para no votar dos veces ni mezclar eventos.
 */
import * as React from "react";
import { Plus, ThumbsUp, Check, Music, ExternalLink, Loader2 } from "lucide-react";
import { Button, Card, cn, guardarLocal } from "@salones/ui";
import { obtenerSync } from "@salones/sync";
import {
  COLECCION_CANCIONES,
  EstadoCancion,
  cancionesDemo,
  claveVotos,
  nuevoIdCancion,
  plataformaDeLink,
  porVotos,
  type Cancion,
} from "./lib";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function PlaylistModulo({
  evento,
  nombreEvento,
}: {
  evento: string;
  nombreEvento: string;
}) {
  const [canciones, setCanciones] = React.useState<Cancion[]>([]);
  const [misVotos, setMisVotos] = React.useState<string[]>([]);
  const [cargado, setCargado] = React.useState(false);
  const [form, setForm] = React.useState({ titulo: "", artista: "", link: "", nombre: "" });
  const [error, setError] = React.useState("");
  const [agregada, setAgregada] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [errorVoto, setErrorVoto] = React.useState("");

  // Referencias a lo último, para no cerrar sobre valores viejos.
  const cancionesRef = React.useRef<Cancion[]>([]);
  cancionesRef.current = canciones;
  const misVotosRef = React.useRef<string[]>([]);
  misVotosRef.current = misVotos;

  React.useEffect(() => {
    // Votos de este dispositivo para ESTE evento.
    try {
      const guardados = localStorage.getItem(claveVotos(evento));
      setMisVotos(guardados ? (JSON.parse(guardados) as string[]) : []);
    } catch {
      setMisVotos([]);
    }

    const sync = obtenerSync();
    const cancelar = sync.suscribir<Cancion>(evento, COLECCION_CANCIONES, setCanciones);
    setCargado(true);

    // Solo en la demostración local: si no hay nada, sembramos ejemplos.
    if (sync.nombre === "local") {
      void sync.listar<Cancion>(evento, COLECCION_CANCIONES).then((items) => {
        if (items.length === 0) {
          for (const c of cancionesDemo()) void sync.guardar(evento, COLECCION_CANCIONES, c);
        }
      });
    }
    return cancelar;
  }, [evento]);

  React.useEffect(() => {
    if (cargado) guardarLocal(claveVotos(evento), JSON.stringify(misVotos));
  }, [misVotos, cargado, evento]);

  const yaVote = (id: string) => misVotos.includes(id);

  /* ---- Nada de "guardar y confiar" (arreglado el 6 ago 2026) ---------------
   * Las dos acciones lanzaban el guardado con `void` y seguían como si hubiera
   * funcionado: con mala cobertura la canción no llegaba nunca al DJ y la
   * pantalla decía "¡Agregada!" igual. Y al VOTAR se apuntaba el voto en este
   * teléfono aunque fallara, dejando el botón muerto para siempre. */

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return; // doble toque: una sola canción, no dos
    if (!form.titulo.trim()) {
      setError("Escribe al menos el nombre de la canción.");
      return;
    }
    setError("");
    const c: Cancion = {
      id: nuevoIdCancion(),
      titulo: form.titulo.trim(),
      votos: 1, // quien la pide ya cuenta con su voto
      estado: EstadoCancion.Pendiente,
      fecha: Date.now(),
      ...(form.artista.trim() ? { artista: form.artista.trim() } : {}),
      ...(form.link.trim() ? { link: form.link.trim() } : {}),
      ...(form.nombre.trim() ? { pedidaPor: form.nombre.trim() } : {}),
    };

    setEnviando(true);
    try {
      await obtenerSync().guardar(evento, COLECCION_CANCIONES, c);
    } catch {
      setError("No pudimos enviar tu canción. Revisa tu conexión e inténtalo de nuevo.");
      return;
    } finally {
      setEnviando(false);
    }

    setMisVotos((v) => (v.includes(c.id) ? v : [...v, c.id]));
    setForm({ titulo: "", artista: "", link: "", nombre: "" });
    setAgregada(true);
    setTimeout(() => setAgregada(false), 2500);
  };

  const votar = async (id: string) => {
    if (misVotosRef.current.includes(id)) return;
    const actual = cancionesRef.current.find((c) => c.id === id);
    if (!actual) return;
    setErrorVoto("");
    try {
      await obtenerSync().guardar(evento, COLECCION_CANCIONES, {
        ...actual,
        votos: actual.votos + 1,
      });
    } catch {
      // Sin apuntar nada: así puede volver a intentarlo.
      setErrorVoto("No pudimos registrar tu voto. Revisa tu conexión e inténtalo otra vez.");
      return;
    }
    setMisVotos((v) => (v.includes(id) ? v : [...v, id]));
  };

  const pendientes = canciones.filter((c) => c.estado === EstadoCancion.Pendiente).sort(porVotos);

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Pide una canción</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Para el evento {nombreEvento}. ¡La música la elegimos entre todos!
        </p>
        <form onSubmit={agregar} className="mt-4 space-y-3">
          <input
            className={campo}
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Nombre de la canción *"
            maxLength={80}
          />
          <input
            className={campo}
            value={form.artista}
            onChange={(e) => setForm({ ...form, artista: e.target.value })}
            placeholder="Artista (opcional)"
            maxLength={60}
          />
          <input
            className={campo}
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
            placeholder="Pega un link de Spotify/YouTube (opcional)"
            inputMode="url"
          />
          <input
            className={campo}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Tu nombre (opcional)"
            maxLength={40}
          />
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Enviando…
              </>
            ) : agregada ? (
              <>
                <Check className="size-4" /> ¡Agregada! Vota más abajo
              </>
            ) : (
              <>
                <Plus className="size-4" /> Agregar a la lista
              </>
            )}
          </Button>
        </form>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vota por tus favoritas</h2>
          <span className="text-sm text-muted-foreground">{pendientes.length} en cola</span>
        </div>

        {errorVoto ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{errorVoto}</p>
        ) : null}

        {!cargado ? null : pendientes.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Aún no hay canciones. ¡Sé el primero en pedir una!
          </p>
        ) : (
          <div className="space-y-2">
            {pendientes.map((c) => {
              const plataforma = plataformaDeLink(c.link);
              const votado = yaVote(c.id);
              return (
                <Card key={c.id} className="flex items-center gap-3 p-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-muted text-muted-foreground">
                    <Music className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.titulo}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {c.artista || "Artista no especificado"}
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
                  <button
                    type="button"
                    onClick={() => void votar(c.id)}
                    disabled={votado}
                    aria-label={votado ? `Ya votaste por ${c.titulo}` : `Votar por ${c.titulo}`}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border px-3 py-2 text-sm font-medium transition-colors",
                      votado
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border hover:border-ring hover:bg-muted",
                    )}
                  >
                    <ThumbsUp className={cn("size-4", votado && "fill-current")} />
                    {c.votos}
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
