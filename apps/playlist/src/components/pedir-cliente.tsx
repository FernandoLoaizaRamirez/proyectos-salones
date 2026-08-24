"use client";

import * as React from "react";
import { Plus, ThumbsUp, Check, Music, ExternalLink, Loader2 } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { useCaracteristica } from "@salones/experiencia";
import { CARACTERISTICAS_CONOCIDAS } from "@salones/core";
import { useCanciones } from "@/lib/use-canciones";
import { evento, porVotos, plataformaDeLink, EstadoCancion } from "@/lib/playlist";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function PedirCliente() {
  const { canciones, cargado, yaVote, agregar, votar } = useCanciones();
  // El salon puede vender la playlist SIN votos: solo se piden canciones.
  const conVotos = useCaracteristica(CARACTERISTICAS_CONOCIDAS.PlaylistVotos);
  const [form, setForm] = React.useState({ titulo: "", artista: "", link: "", nombre: "" });
  const [error, setError] = React.useState("");
  const [agregada, setAgregada] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [errorVoto, setErrorVoto] = React.useState("");

  const pendientes = canciones
    .filter((c) => c.estado === EstadoCancion.Pendiente)
    .sort(porVotos);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return; // doble toque: una sola canción, no dos
    if (!form.titulo.trim()) {
      setError("Escribe al menos el nombre de la canción.");
      return;
    }
    setError("");
    setEnviando(true);
    const ok = await agregar({
      titulo: form.titulo.trim(),
      artista: form.artista.trim() || undefined,
      link: form.link.trim() || undefined,
      pedidaPor: form.nombre.trim() || undefined,
    });
    setEnviando(false);

    // Solo se limpia el formulario y se da las gracias si de verdad se guardó:
    // antes se decía "¡Agregada!" pasara lo que pasara, y con mala señal la
    // canción no llegaba nunca al DJ.
    if (!ok) {
      setError("No pudimos enviar tu canción. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setForm({ titulo: "", artista: "", link: "", nombre: "" });
    setAgregada(true);
    setTimeout(() => setAgregada(false), 2500);
  };

  const votarCancion = async (id: string) => {
    setErrorVoto("");
    if (!(await votar(id))) {
      setErrorVoto("No pudimos registrar tu voto. Revisa tu conexión e inténtalo otra vez.");
    }
  };

  return (
    /* `min-w-0`: hijo de un `grid place-items-center`. Con una canción de
       nombre largo, el celular ensanchaba la pantalla del invitado y la
       encogía: la letra salía chiquita y el lado derecho se salía. */
    <div className="w-full min-w-0 max-w-lg space-y-8">
      <div className="text-center">
        <p className="text-sm font-medium text-primary">Playlist colaborativa</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{evento.nombre}</h1>
        <p className="mt-1 text-muted-foreground">
          Pide tu canción y vota por las de los demás. ¡La música la elegimos entre todos!
        </p>
      </div>

      {/* Formulario para pedir */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Pide una canción</h2>
        <form onSubmit={enviar} className="mt-4 space-y-3">
          <input
            className={campo}
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Nombre de la canción *"
          />
          <input
            className={campo}
            value={form.artista}
            onChange={(e) => setForm({ ...form, artista: e.target.value })}
            placeholder="Artista (opcional)"
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
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
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

      {/* Lista para votar */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vota por tus favoritas</h2>
          <span className="text-sm text-muted-foreground">{pendientes.length} en cola</span>
        </div>
        {errorVoto ? <p className="mb-3 text-sm text-red-500">{errorVoto}</p> : null}
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
                    onClick={() => void votarCancion(c.id)}
                    disabled={votado}
                    hidden={!conVotos}
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
      </div>
    </div>
  );
}
