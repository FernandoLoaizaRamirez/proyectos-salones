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
 * ⚠️ ESA REGLA ESTUVO ROTA (arreglado el 5 ago 2026). La pantalla apuntaba un
 * enlace a cada archivo del almacén y daba la entrega por hecha al terminar el
 * bucle, SIN COMPROBAR NADA. Dos fallos encadenados:
 *   1. desde el corte de la 0013 el almacén es privado y esas direcciones ya no
 *      abrían nada, y
 *   2. aunque hubieran abierto, el navegador IGNORA `download` en archivos de
 *      otro dominio: los abre en una pestaña en vez de guardarlos.
 * O sea, se encendía el botón de borrar una boda cuyas fotos no se habían
 * bajado. Ahora se descarga con `descargarAlbum` (fetch → blob, el mismo camino
 * que ya usaba el álbum del panel) y **`entregado` solo se enciende si no falló
 * ni un archivo**.
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
  XCircle,
} from "lucide-react";
import { Button, Card } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";
import { descargarAlbum, type ResultadoDescarga } from "@/lib/album";

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
  /** `url` viene FIRMADA y caduca. Vacía = el servidor no pudo firmarla. */
  archivos: { nombre: string; tamano: number; url: string }[];
  /** Cuántos archivos quedaron sin dirección utilizable. Ausente = función vieja. */
  sinFirmar?: number;
  vigenciaSeg?: number;
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
  const [avance, setAvance] = React.useState<{ hechas: number; total: number } | null>(null);
  const [resultado, setResultado] = React.useState<ResultadoDescarga | null>(null);
  /** Lo lee `descargarAlbum` entre archivo y archivo para poder detenerse. */
  const cancelar = React.useRef(false);
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
    setResultado(null);
    setAvance(null);
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

  /**
   * La ENTREGA: los datos en JSON, la lista de enlaces, y los archivos.
   *
   * Los dos primeros se fabrican aquí mismo, así que siempre se guardan bien.
   * Los archivos se bajan de verdad, uno a uno, contando aciertos y fallos: de
   * ese recuento —y solo de él— depende que se encienda el botón de borrar.
   */
  const descargarTodo = async () => {
    if (!inv) return;
    setError("");
    setResultado(null);
    const base = `evento-${inv.evento.codigo}`;

    descargarTexto(`${base}-datos.json`, JSON.stringify(inv, null, 2), "application/json");
    descargarTexto(
      `${base}-archivos.txt`,
      inv.archivos.map((a) => a.url || `(sin dirección) ${a.nombre}`).join("\n"),
      "text/plain",
    );

    // Un archivo sin dirección firmada no se intenta: `fetch("")` pediría ESTA
    // misma página y respondería 200, o sea, se contaría como acierto y bajaría
    // una página HTML disfrazada de foto. Se cuenta como fallo de entrada.
    const conUrl = inv.archivos.filter((a) => a.url);
    const sinUrl = inv.archivos.length - conUrl.length;

    cancelar.current = false;
    setAvance({ hechas: 0, total: conUrl.length });

    const r = await descargarAlbum(
      conUrl.map((a, i) => ({
        id: a.nombre,
        nombre: a.nombre.split("/").pop() || `archivo-${i + 1}`,
        url: a.url,
        tipo: "",
      })),
      (hechas, total) => setAvance({ hechas, total }),
      () => !cancelar.current,
    );

    setAvance(null);
    const fallidas = r.fallidas + sinUrl;
    setResultado({ ...r, fallidas });
    // LA REGLA, ahora de verdad: solo se considera entregado si TODOS los
    // archivos se guardaron y no se detuvo a medias.
    setEntregado(fallidas === 0 && !r.cancelada);
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

            <Button className="mt-5 w-full" onClick={descargarTodo} disabled={avance !== null}>
              {avance ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Descargando… {avance.hechas} de{" "}
                  {avance.total}
                </>
              ) : (
                <>
                  <Download className="size-4" />{" "}
                  {resultado ? "Reintentar la entrega" : "Descargar la entrega completa"}
                </>
              )}
            </Button>

            {avance ? (
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => {
                  cancelar.current = true;
                }}
              >
                Detener
              </Button>
            ) : null}

            <p className="mt-2 text-xs text-muted-foreground">
              Baja un archivo con todos los datos, una lista con los enlaces, y los archivos uno a
              uno. El navegador puede pedirte permiso para descargas múltiples.
            </p>

            {resultado ? (
              resultado.fallidas === 0 && !resultado.cancelada ? (
                <p className="mt-3 flex items-start gap-2 rounded-[var(--radius)] bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Entrega completa: se guardaron {resultado.guardadas} archivo
                    {resultado.guardadas === 1 ? "" : "s"} en esta computadora. Revísalos antes de
                    borrar nada.
                  </span>
                </p>
              ) : (
                <p className="mt-3 flex items-start gap-2 rounded-[var(--radius)] bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {resultado.cancelada
                      ? `Entrega detenida: se guardaron ${resultado.guardadas} de ${inv.resumen.archivos}.`
                      : `Se guardaron ${resultado.guardadas} archivos, pero ${resultado.fallidas} no se pudieron bajar.`}{" "}
                    El borrado sigue bloqueado. Vuelve a intentarlo; si sigue fallando, revisa tu
                    conexión o avisa antes de tocar nada.
                  </span>
                </p>
              )
            ) : null}
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
