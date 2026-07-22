"use client";

/**
 * CERRAR UN EVENTO — entregar el material y borrarlo.
 *
 * Cumple lo que promete el aviso de privacidad: que el salón pueda pedir la
 * entrega de todo el material de un evento y su borrado.
 *
 * LA REGLA DE SEGURIDAD: **no se puede borrar sin haber descargado antes.** El
 * botón de borrar sigue apagado hasta que la entrega se ha bajado en este
 * navegador. Es la diferencia entre "cerrar un evento" y "perder una boda".
 *
 * Encima de eso, el borrado exige escribir el código del evento a mano, y el
 * servidor vuelve a comprobar por su cuenta que quien llama es dueño o
 * administrador de ESE salón (ver la función `evento-cierre`).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  Search,
  Trash2,
  TriangleAlert,
  CheckCircle2,
} from "lucide-react";
import { Button, Card } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";

type Inventario = {
  evento: { codigo: string; nombre: string; estado: string };
  generado: string;
  resumen: {
    registros: number;
    porColeccion: Record<string, number>;
    archivos: number;
    bytes: number;
  };
  registros: { id: string; coleccion: string; dato: Record<string, unknown>; creado: string }[];
  archivos: { nombre: string; tamano: number; url: string }[];
};

const NOMBRES: Record<string, string> = {
  mensajes: "mensajes del muro",
  fotos: "fotos y videos",
  canciones: "canciones",
  respuestas: "confirmaciones",
  ranking: "resultados de dinámicas",
};

function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function descargarTexto(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CerrarEvento() {
  const router = useRouter();
  const [listo, setListo] = React.useState(false);
  const [codigo, setCodigo] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const [inv, setInv] = React.useState<Inventario | null>(null);
  const [error, setError] = React.useState("");
  const [entregado, setEntregado] = React.useState(false);
  const [descargando, setDescargando] = React.useState(0);
  const [confirmacion, setConfirmacion] = React.useState("");
  const [borrando, setBorrando] = React.useState(false);
  const [borrado, setBorrado] = React.useState<{ archivosBorrados: number } | null>(null);

  React.useEffect(() => {
    const supabase = obtenerSupabase();
    if (!supabase) {
      router.replace("/entrar");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/entrar");
      else setListo(true);
    });
  }, [router]);

  /** Llama a la función con la sesión del staff. */
  const llamar = React.useCallback(async (init: RequestInit, query = ""): Promise<Response> => {
    const supabase = obtenerSupabase();
    const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? "";
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    return fetch(`${url}/functions/v1/evento-cierre${query}`, {
      ...init,
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  }, []);

  const verInventario = async () => {
    setError("");
    setInv(null);
    setEntregado(false);
    setBorrado(null);
    setConfirmacion("");
    setCargando(true);
    try {
      const res = await llamar({ method: "GET" }, `?e=${encodeURIComponent(codigo.trim())}`);
      const dato = await res.json();
      if (!res.ok) {
        setError(dato?.error ?? "No pudimos leer el evento.");
        return;
      }
      setInv(dato as Inventario);
    } catch {
      setError("No pudimos conectar. ¿Está desplegada la función evento-cierre?");
    } finally {
      setCargando(false);
    }
  };

  /** La ENTREGA: los datos en JSON, la lista de enlaces, y los archivos. */
  const descargarTodo = async () => {
    if (!inv) return;
    const base = `evento-${inv.evento.codigo}`;

    descargarTexto(`${base}-datos.json`, JSON.stringify(inv, null, 2), "application/json");
    descargarTexto(
      `${base}-archivos.txt`,
      inv.archivos.map((a) => a.url).join("\n"),
      "text/plain",
    );

    // Los archivos, uno a uno. El navegador pide permiso una vez para descargas
    // múltiples. Con muchos archivos conviene además guardar el .txt de enlaces.
    setDescargando(inv.archivos.length);
    for (const archivo of inv.archivos) {
      const a = document.createElement("a");
      a.href = archivo.url;
      a.download = archivo.nombre.split("/").pop() ?? "archivo";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 250));
      setDescargando((n) => n - 1);
    }
    setEntregado(true);
  };

  const borrar = async () => {
    if (!inv) return;
    setError("");
    setBorrando(true);
    try {
      const res = await llamar({
        method: "POST",
        body: JSON.stringify({ e: inv.evento.codigo, confirmar: confirmacion.trim() }),
      });
      const dato = await res.json();
      if (!res.ok) {
        setError(dato?.error ?? "No se pudo borrar.");
        return;
      }
      setBorrado(dato);
      setInv(null);
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setBorrando(false);
    }
  };

  if (!listo) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Panel
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Cerrar un evento</h1>
      <p className="mt-2 text-muted-foreground">
        Entrega todo el material a los anfitriones y, si quieres, bórralo del servidor. Es lo que
        promete el aviso de privacidad.
      </p>

      {/* Buscar */}
      <Card className="mt-8 p-5">
        <label htmlFor="codigo" className="text-sm font-medium">
          Código del evento
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="boda-garcia-x7k2"
            className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <Button onClick={verInventario} disabled={!codigo.trim() || cargando}>
            {cargando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Ver
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      </Card>

      {borrado ? (
        <Card className="mt-6 border-green-500/40 bg-green-500/5 p-5">
          <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="size-5" /> Evento cerrado
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Se borraron {borrado.archivosBorrados} archivo
            {borrado.archivosBorrados === 1 ? "" : "s"} y todos los registros. El evento quedó
            cerrado: sus enlaces ya no abren nada.
          </p>
        </Card>
      ) : null}

      {/* Inventario */}
      {inv ? (
        <>
          <Card className="mt-6 p-5">
            <h2 className="font-medium">{inv.evento.nombre}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Código {inv.evento.codigo} · {inv.evento.estado}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[var(--radius)] bg-muted p-3">
                <dt className="text-muted-foreground">Archivos</dt>
                <dd className="text-lg font-medium">
                  {inv.resumen.archivos}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({pesoLegible(inv.resumen.bytes)})
                  </span>
                </dd>
              </div>
              <div className="rounded-[var(--radius)] bg-muted p-3">
                <dt className="text-muted-foreground">Registros</dt>
                <dd className="text-lg font-medium">{inv.resumen.registros}</dd>
              </div>
            </dl>

            {Object.keys(inv.resumen.porColeccion).length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {Object.entries(inv.resumen.porColeccion).map(([clave, n]) => (
                  <li key={clave}>
                    {n} {NOMBRES[clave] ?? clave}
                  </li>
                ))}
              </ul>
            ) : null}

            <Button className="mt-5 w-full" onClick={descargarTodo} disabled={descargando > 0}>
              {descargando > 0 ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Descargando… quedan {descargando}
                </>
              ) : (
                <>
                  <Download className="size-4" /> Descargar la entrega completa
                </>
              )}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Baja un archivo con todos los datos, una lista con los enlaces de los archivos, y los
              archivos uno a uno. El navegador puede pedirte permiso para descargas múltiples.
            </p>
          </Card>

          {/* Borrado */}
          <Card className="mt-6 border-red-500/40 p-5">
            <h2 className="flex items-center gap-2 font-medium text-red-600 dark:text-red-400">
              <TriangleAlert className="size-5" /> Borrar todo del servidor
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Se borran los {inv.resumen.archivos} archivos y los {inv.resumen.registros} registros,
              y el evento queda cerrado. <strong>No hay vuelta atrás.</strong>
            </p>

            {!entregado ? (
              <p className="mt-4 rounded-[var(--radius)] bg-muted p-3 text-sm text-muted-foreground">
                Primero descarga la entrega. El borrado se activa después.
              </p>
            ) : (
              <>
                <label htmlFor="confirmar" className="mt-4 block text-sm">
                  Para confirmar, escribe{" "}
                  <code className="rounded bg-muted px-1 py-0.5">{inv.evento.codigo}</code>
                </label>
                <input
                  id="confirmar"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  className="mt-2 w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <Button
                  variant="outline"
                  className="mt-3 w-full border-red-500/50 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                  disabled={confirmacion.trim() !== inv.evento.codigo || borrando}
                  onClick={borrar}
                >
                  {borrando ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Borrando…
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" /> Borrar el evento para siempre
                    </>
                  )}
                </Button>
              </>
            )}
          </Card>
        </>
      ) : null}
    </main>
  );
}
