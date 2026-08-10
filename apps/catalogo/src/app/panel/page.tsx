"use client";

/**
 * PANEL — inicio del operador, ya con sesión.
 *
 * Solo accesible con sesión iniciada: si no la hay, redirige a /entrar. Muestra
 * quién entró, su SALÓN y su ROL (leídos del token, `app_metadata`, del paso
 * 1.1b), y da acceso al generador de eventos. El nombre del salón se consulta en
 * `tenants`, que la RLS (0008) solo deja ver al staff de ese salón.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  LogOut,
  Loader2,
  Building2,
  BadgeCheck,
  CalendarDays,
  PackageCheck,
  Stethoscope,
} from "lucide-react";
import { Button, Card } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";
import { leerIdentidad, type Identidad } from "@/lib/sesion";
import { TarjetaPersonalizacion } from "./tarjeta-personalizacion";
import { camposPendientes } from "@/lib/legal";
import { AvisoPendiente } from "../legal/aviso-pendiente";

/** Qué datos legales del salón siguen sin rellenar. Vacío = listo. */
const pendientesLegales = camposPendientes();

/** Nombre bonito del rol para mostrar (los roles internos son owner/admin/staff). */
function etiquetaRol(rol: Identidad["rol"]): string {
  return rol === "owner" ? "Dueño" : rol === "admin" ? "Administrador" : "Staff";
}

export default function Panel() {
  const router = useRouter();
  const [email, setEmail] = React.useState<string | null>(null);
  const [identidad, setIdentidad] = React.useState<Identidad | null>(null);
  const [salon, setSalon] = React.useState<string | null>(null);
  const [cargando, setCargando] = React.useState(true);

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
      const user = data.session.user;
      setEmail(user.email ?? "(sin correo)");
      const id = leerIdentidad(user);
      setIdentidad(id);
      setCargando(false);

      // El nombre del salón: la RLS (0008) deja al staff ver SU tenant. Si aún no
      // está aplicada o el usuario no está ligado, queda en null (se usa un rótulo
      // genérico).
      if (id) {
        const { data: t } = await supabase
          .from("tenants")
          .select("nombre")
          .eq("id", id.tenantId)
          .maybeSingle();
        setSalon((t as { nombre: string } | null)?.nombre ?? null);
      }
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

          {identidad ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                <Building2 className="size-3.5 text-primary" />
                {salon ?? "Tu salón"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                <BadgeCheck className="size-3.5 text-primary" />
                {etiquetaRol(identidad.rol)}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Tu usuario aún no está ligado a un salón.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={salir}>
          <LogOut className="size-4" /> Cerrar sesión
        </Button>
      </div>

      <Card className="mt-8 flex items-center gap-4 p-6">
        <CalendarDays className="size-8 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Mis eventos</h2>
          <p className="text-sm text-muted-foreground">
            Tus eventos, cómo va cada uno y las pantallas del salón.
          </p>
        </div>
        <Link href="/eventos">
          <Button size="sm">Abrir</Button>
        </Link>
      </Card>

      <Card className="mt-4 flex items-center gap-4 p-6">
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

      {/*
       * EL AVISO DE LO QUE FALTA RELLENAR, en su sitio.
       *
       * Al sacarlo de las páginas públicas (que es lo correcto: allí publicaba
       * una ruta del proyecto y jerga de programador), se quedó sin ningún sitio
       * donde verse. O sea que la variante `interno` de `AvisoPendiente` existía
       * pero no la pintaba nadie, y el recordatorio de qué falta se perdía.
       *
       * Aquí sí: el panel está detrás del acceso del personal, así que este es
       * el único público al que ese detalle le sirve para algo.
       */}
      {pendientesLegales.length > 0 ? (
        <div className="mt-4">
          <AvisoPendiente campos={pendientesLegales} interno />
        </div>
      ) : null}

      <TarjetaPersonalizacion />
    </main>
  );
}
