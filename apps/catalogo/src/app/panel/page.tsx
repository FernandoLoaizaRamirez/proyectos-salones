"use client";

/**
 * PANEL — inicio del operador, ya con sesión.
 *
 * Solo accesible con sesión iniciada: si no la hay, redirige a /entrar. Por ahora
 * muestra quién entró y da acceso al generador de eventos. En pasos siguientes de
 * la Fase 1 mostrará el salón (tenant) y su rol, y el generador exigirá sesión.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, LogOut, Loader2, PackageCheck, Stethoscope } from "lucide-react";
import { Button, Card } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";
import { TarjetaPersonalizacion } from "./tarjeta-personalizacion";

export default function Panel() {
  const router = useRouter();
  const [email, setEmail] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);

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
      setEmail(data.session.user.email ?? "(sin correo)");
      setCargando(false);
    });
  }, [router]);

  const salir = async () => {
    await obtenerSupabase()?.auth.signOut();
    router.replace("/entrar");
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Panel del operador</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tu panel</h1>
          <p className="mt-2 text-muted-foreground">
            Sesión iniciada como <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={salir}>
          <LogOut className="size-4" /> Cerrar sesión
        </Button>
      </div>

      <Card className="mt-8 flex items-center gap-4 p-6">
        <KeyRound className="size-8 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Generador de eventos</h2>
          <p className="text-sm text-muted-foreground">
            Crea el código de un evento nuevo y comparte sus enlaces.
          </p>
        </div>
        <Link href="/evento">
          <Button size="sm">Abrir</Button>
        </Link>
      </Card>

      <Card className="mt-4 flex items-center gap-4 p-6">
        <Stethoscope className="size-8 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">¿Está todo bien?</h2>
          <p className="text-sm text-muted-foreground">
            Revisa un evento antes de que empiece y mira los últimos fallos.
          </p>
        </div>
        <Link href="/panel/diagnostico">
          <Button size="sm" variant="outline">
            Abrir
          </Button>
        </Link>
      </Card>

      <Card className="mt-4 flex items-center gap-4 p-6">
        <PackageCheck className="size-8 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Cerrar un evento</h2>
          <p className="text-sm text-muted-foreground">
            Entrega todo el material a los anfitriones y bórralo del servidor.
          </p>
        </div>
        <Link href="/evento/cerrar">
          <Button size="sm" variant="outline">
            Abrir
          </Button>
        </Link>
      </Card>

      <TarjetaPersonalizacion />
    </main>
  );
}
