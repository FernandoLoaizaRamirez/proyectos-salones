"use client";

/**
 * REVISIÓN DE UN EVENTO — "¿está todo bien?"
 *
 * Pensada para mirarla LA MAÑANA DEL EVENTO, no durante. Hace de verdad, de
 * punta a punta, lo mismo que hará el teléfono de un invitado: pedir el pase,
 * leer el contenido, pedir permiso de subida. Si algo está roto, sale aquí en
 * vez de salir en un WhatsApp enfadado a las once de la noche.
 *
 * Debajo, los últimos fallos que han reportado las apps (migración 0011).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Stethoscope, Inbox } from "lucide-react";
import { Button, Card, EmptyState } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";

type Prueba = { nombre: string; ok: boolean; detalle: string };
type ErrorApp = {
  id: number;
  creado: string;
  app: string;
  evento: string | null;
  tipo: string;
  mensaje: string | null;
  ruta: string | null;
  repeticiones: number;
};

const TIPOS: Record<string, string> = {
  "sin-pase": "No se pudo obtener el pase del evento",
  "sin-pase-anfitrion": "No se pudo obtener el pase de anfitrión",
  sondeo: "Fallo al refrescar el contenido",
  subida: "Fallo al subir un archivo",
};

export default function Diagnostico() {
  const router = useRouter();
  const [listo, setListo] = React.useState(false);
  const [codigo, setCodigo] = React.useState("");
  const [cargando, setCargando] = React.useState(false);
  const [pruebas, setPruebas] = React.useState<Prueba[] | null>(null);
  const [errores, setErrores] = React.useState<ErrorApp[]>([]);
  const [error, setError] = React.useState("");

  const consultar = React.useCallback(async (evento?: string) => {
    setError("");
    setCargando(true);
    try {
      const supabase = obtenerSupabase();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? "";
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
      const res = await fetch(
        `${url}/functions/v1/diagnostico${evento ? `?e=${encodeURIComponent(evento)}` : ""}`,
        { headers: { apikey: anon, Authorization: `Bearer ${token}` } },
      );
      const dato = await res.json();
      if (!res.ok) {
        setError(dato?.error ?? "No pudimos consultar el diagnóstico.");
        return;
      }
      setPruebas(dato.pruebas?.length ? dato.pruebas : null);
      setErrores(dato.errores ?? []);
    } catch {
      setError("No pudimos conectar. ¿Está desplegada la función diagnostico?");
    } finally {
      setCargando(false);
    }
  }, []);

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
      setListo(true);
      void consultar();
    });
  }, [router, consultar]);

  if (!listo) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const todoBien = pruebas?.every((p) => p.ok) ?? false;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Panel
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">¿Está todo bien?</h1>
      <p className="mt-2 text-muted-foreground">
        Comprueba un evento de punta a punta, igual que lo hará el teléfono de un invitado.
        Míralo la mañana del evento.
      </p>

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
          <Button onClick={() => consultar(codigo.trim())} disabled={!codigo.trim() || cargando}>
            {cargando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Stethoscope className="size-4" />
            )}
            Revisar
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      </Card>

      {pruebas ? (
        <Card className={`mt-6 p-5 ${todoBien ? "border-green-500/40" : "border-red-500/40"}`}>
          <h2 className="font-medium">{todoBien ? "Todo funciona" : "Hay algo que revisar"}</h2>
          <ul className="mt-4 space-y-3">
            {pruebas.map((p) => (
              <li key={p.nombre} className="flex items-start gap-3">
                {p.ok ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <p className="text-sm font-medium">{p.nombre}</p>
                  <p className="text-sm text-muted-foreground">{p.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <h2 className="mt-10 text-lg font-medium">Últimos fallos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Lo que han reportado las apps de tus eventos. Se borran solos a los 30 días.
      </p>

      {errores.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Inbox className="size-8" />}
            title="Sin fallos registrados"
            description="Cuando algo falle en una de tus apps, aparecerá aquí."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {errores.map((e) => (
            <li key={e.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{TIPOS[e.tipo] ?? e.tipo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.creado).toLocaleString("es-MX")}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.app}
                  {e.evento ? ` · ${e.evento}` : ""}
                  {e.ruta ? ` · ${e.ruta}` : ""}
                  {e.repeticiones > 1 ? ` · se repitió ${e.repeticiones} veces` : ""}
                </p>
                {e.mensaje ? (
                  <p className="mt-2 rounded-[var(--radius)] bg-muted p-2 font-mono text-xs">
                    {e.mensaje}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
