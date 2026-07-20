"use client";

/**
 * MIS EVENTOS — la lista de eventos del salón (requiere sesión).
 *
 * Hasta ahora el operador creaba un evento en /evento y, si cerraba la pestaña,
 * se quedaba sin su código. Aquí están todos los de su salón: la RLS por tenant
 * (migración 0008) hace que cada quien vea solo los suyos.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronRight, Loader2, Plus, ShieldAlert } from "lucide-react";
import { Button, Card } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";
import { leerIdentidad } from "@/lib/sesion";
import { listarEventos, type EventoFila } from "@/lib/eventos";

/** "2027-03-20" → "20 mar 2027" (y sin fecha, el día en que se creó). */
function fechaBonita(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function MisEventos() {
  const router = useRouter();
  const [cargando, setCargando] = React.useState(true);
  const [vinculado, setVinculado] = React.useState(true);
  const [eventos, setEventos] = React.useState<EventoFila[]>([]);

  React.useEffect(() => {
    const supabase = obtenerSupabase();
    if (!supabase) {
      router.replace("/entrar");
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/entrar");
        return;
      }
      setVinculado(Boolean(leerIdentidad(data.session.user)));
      setEventos(await listarEventos(supabase));
      setCargando(false);
    });
  }, [router]);

  if (cargando) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Panel del operador</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mis eventos</h1>
          <p className="mt-2 text-muted-foreground">
            Entra a un evento para ver cómo va y abrir sus pantallas.
          </p>
        </div>
        <Link href="/evento">
          <Button size="sm">
            <Plus className="size-4" /> Crear evento
          </Button>
        </Link>
      </div>

      {!vinculado ? (
        <Card className="mt-8 flex items-start gap-4 p-6">
          <ShieldAlert className="size-6 shrink-0 text-amber-500" />
          <div>
            <h2 className="font-semibold">Tu usuario aún no está ligado a un salón</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mientras no lo esté, aquí no aparecerá ningún evento aunque los hayas creado.
            </p>
          </div>
        </Card>
      ) : eventos.length === 0 ? (
        <Card className="mt-8 p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-primary">
            <CalendarDays className="size-6" />
          </div>
          <h2 className="mt-4 font-semibold">Todavía no hay eventos</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Crea el primero y aquí tendrás su código, sus enlaces y cómo va durante la fiesta.
          </p>
          <Link href="/evento">
            <Button className="mt-6">
              <Plus className="size-4" /> Crear mi primer evento
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-8 space-y-2">
          {eventos.map((e) => (
            <Link key={e.id} href={`/eventos/${encodeURIComponent(e.codigo)}`}>
              <Card className="flex items-center gap-4 p-5 transition-colors hover:border-ring">
                <div className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-muted text-primary">
                  <CalendarDays className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{e.nombre}</span>
                    {e.estado !== "activo" ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Cerrado
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    <code>{e.codigo}</code>
                    {fechaBonita(e.fecha) ? ` · ${fechaBonita(e.fecha)}` : ""}
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
