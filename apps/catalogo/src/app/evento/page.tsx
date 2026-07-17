"use client";

/**
 * GENERADOR DE EVENTOS — herramienta del operador (no aparece en la vitrina).
 *
 * Aquí creas el código de un evento nuevo (p. ej. "boda-garcia-x7k2p") y
 * obtienes los enlaces de todas las apps conectadas, listos para mandar al
 * cliente. El código funciona como "llave por enlace": es aleatorio y difícil
 * de adivinar, así el contenido de cada evento vive en su propia burbuja.
 *
 * URL de esta página: /evento  (guárdala en tus favoritos).
 */

import * as React from "react";
import { KeyRound, Copy, Check, MessageCircle, Sparkles } from "lucide-react";
import { Button, Card } from "@salones/ui";
import { productos } from "@/lib/catalogo";

/** Apps conectadas al lugar central y sus pantallas relevantes. */
const APPS_CONECTADAS: { id: string; rutas: { titulo: string; path: string }[] }[] = [
  {
    id: "muro",
    rutas: [
      { titulo: "Muro — pantalla del anfitrión", path: "/" },
      { titulo: "Muro — firmar (invitados)", path: "/firmar" },
    ],
  },
  {
    id: "playlist",
    rutas: [
      { titulo: "Playlist — panel del DJ", path: "/" },
      { titulo: "Playlist — pedir canción (invitados)", path: "/pedir" },
    ],
  },
  {
    id: "rsvp",
    rutas: [{ titulo: "RSVP — tablero del anfitrión (de ahí salen los enlaces por invitado)", path: "/" }],
  },
  {
    id: "dinamicas",
    rutas: [
      { titulo: "Dinámicas — tablero del anfitrión", path: "/" },
      { titulo: "Dinámicas — jugar (invitados)", path: "/jugar" },
    ],
  },
  {
    id: "album-fotos",
    rutas: [{ titulo: "Álbum del evento — subir y ver (todos)", path: "/" }],
  },
];

/** Convierte "Boda García 2027" en "boda-garcia-2027". */
function aSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Base de una app (su demoUrl del catálogo, sin la barra final). */
function baseDe(id: string): string {
  return (productos.find((p) => p.id === id)?.demoUrl ?? "").replace(/\/$/, "");
}

export default function GeneradorEvento() {
  const [nombre, setNombre] = React.useState("");
  const [codigo, setCodigo] = React.useState("");
  const [copiado, setCopiado] = React.useState("");

  const generar = () => {
    const azar = Math.random().toString(36).slice(2, 7);
    const slug = aSlug(nombre) || "evento";
    setCodigo(`${slug}-${azar}`);
    setCopiado("");
  };

  const enlaces = React.useMemo(() => {
    if (!codigo) return [];
    return APPS_CONECTADAS.flatMap((app) => {
      const base = baseDe(app.id);
      if (!base) return [];
      return app.rutas.map((r) => ({
        titulo: r.titulo,
        url: `${base}${r.path === "/" ? "/" : r.path}?e=${codigo}`,
      }));
    });
  }, [codigo]);

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  const mensajeCompleto = () =>
    [
      `Enlaces del evento (código: ${codigo})`,
      "",
      ...enlaces.map((e) => `• ${e.titulo}\n${e.url}`),
      "",
      "Guarda este mensaje: quien tenga estos enlaces entra al evento.",
    ].join("\n");

  const whatsapp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(mensajeCompleto())}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium text-primary">Herramienta del operador</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Generador de eventos</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Crea el código de un evento nuevo y comparte sus enlaces. Cada evento vive en su propia
        burbuja: lo que suben sus invitados no se mezcla con nada más.
      </p>

      <Card className="mt-8 p-6">
        <label className="mb-1.5 block text-sm font-medium">Nombre del evento</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Boda García · 21 mar 2027"
            maxLength={60}
          />
          <Button onClick={generar} className="shrink-0">
            <Sparkles className="size-4" /> Generar código
          </Button>
        </div>

        {codigo ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[var(--radius)] bg-muted px-4 py-3">
            <KeyRound className="size-4 shrink-0 text-primary" />
            <code className="text-sm font-semibold">{codigo}</code>
            <Button variant="ghost" size="sm" onClick={() => copiar(codigo, "codigo")}>
              {copiado === "codigo" ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
            <span className="text-xs text-muted-foreground">
              Guárdalo: es la llave del evento.
            </span>
          </div>
        ) : null}
      </Card>

      {enlaces.length > 0 ? (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Enlaces del evento</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copiar(mensajeCompleto(), "todo")}>
                {copiado === "todo" ? (
                  <>
                    <Check className="size-4" /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" /> Copiar todo
                  </>
                )}
              </Button>
              <Button size="sm" onClick={whatsapp}>
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {enlaces.map((e) => (
              <Card key={e.url} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.url}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copiar(e.url, e.url)}>
                  {copiado === e.url ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            El brindis en video junta los videos en su propia galería (aún sin separación por
            evento). Los QR de cada pantalla ya salen con el código: se generan dentro de cada app
            con su botón de compartir.
          </p>
        </div>
      ) : null}
    </main>
  );
}
