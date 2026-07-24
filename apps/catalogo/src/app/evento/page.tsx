"use client";

/**
 * GENERADOR DE EVENTOS — herramienta del operador (requiere sesión).
 *
 * El alta es AUTENTICADA: exige iniciar sesión y GUARDA el evento en la base
 * (tabla `events`), atado a tu salón. La RLS por tenant (migración 0008) asegura
 * que el evento quede en TU salón y no en otro: el cliente manda `tenant_id` y el
 * servidor lo valida contra el que lleva tu token (`app_metadata`, del paso 1.1b).
 *
 * El contrato de enlaces `?e=<codigo>` queda IDÉNTICO: el invitado no nota ningún
 * cambio; sigue entrando por su enlace como siempre.
 *
 * URL de esta página: /evento  (guárdala en tus favoritos).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Copy, Check, MessageCircle, Sparkles, Loader2, ShieldAlert } from "lucide-react";
import { Button, Card } from "@salones/ui";
import { productos } from "@/lib/catalogo";
import { obtenerSupabase } from "@/lib/supabase";
import { leerIdentidad, type Identidad } from "@/lib/sesion";

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
  const router = useRouter();
  const [cargando, setCargando] = React.useState(true);
  const [identidad, setIdentidad] = React.useState<Identidad | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);

  const [nombre, setNombre] = React.useState("");
  const [codigo, setCodigo] = React.useState("");
  const [copiado, setCopiado] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState("");

  // Exige sesión (como /panel): sin sesión → a /entrar. Con sesión, lee la
  // identidad (salón + rol) que viaja en el token.
  React.useEffect(() => {
    const supabase = obtenerSupabase();
    if (!supabase) {
      router.replace("/entrar");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/entrar");
        return;
      }
      setIdentidad(leerIdentidad(data.session.user));
      setUserId(data.session.user.id);
      setCargando(false);
    });
  }, [router]);

  // Crea el evento: genera un código y lo INSERTA en `events`. La RLS valida que
  // el tenant_id sea el de tu salón (with check tenant_id = app_tenant_id()).
  const crear = async () => {
    const supabase = obtenerSupabase();
    if (!supabase || !identidad) return;
    setError("");
    setGuardando(true);
    const azar = Math.random().toString(36).slice(2, 7);
    const slug = aSlug(nombre) || "evento";
    const nuevoCodigo = `${slug}-${azar}`;
    const { error: eIns } = await supabase.from("events").insert({
      tenant_id: identidad.tenantId,
      codigo: nuevoCodigo,
      nombre: nombre.trim() || "Evento sin nombre",
      created_by: userId,
    });
    setGuardando(false);
    if (eIns) {
      setError(
        eIns.code === "23505"
          ? "Ese código ya existe; intenta otra vez (se genera uno nuevo al azar)."
          : `No se pudo guardar el evento: ${eIns.message}`,
      );
      return;
    }
    setCodigo(nuevoCodigo);
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

  if (cargando) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium text-primary">Herramienta del operador</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Generador de eventos</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Crea un evento nuevo (se guarda en tu salón) y comparte sus enlaces. Cada evento vive en su
        propia burbuja: lo que suben sus invitados no se mezcla con nada más.
      </p>

      {!identidad ? (
        // Con sesión pero SIN salón ligado: no puede crear (la RLS lo rechazaría).
        <Card className="mt-8 flex items-start gap-4 p-6">
          <ShieldAlert className="size-6 shrink-0 text-amber-500" />
          <div>
            <h2 className="font-semibold">Tu usuario aún no está ligado a un salón</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Para crear eventos, un administrador debe darte de alta en un salón (alta técnica:
              script <code>vincular-staff</code>). En cuanto quedes ligado, aquí podrás crearlos.
            </p>
          </div>
        </Card>
      ) : (
        <>
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
              <Button onClick={crear} disabled={guardando} className="shrink-0">
                {guardando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {guardando ? "Guardando…" : "Crear evento"}
              </Button>
            </div>

            {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

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
                El brindis en video junta los videos en su propia galería, ya separada por evento
                como el resto. Los QR de cada pantalla ya salen con el código: se generan dentro de
                cada app con su botón de compartir.
              </p>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
