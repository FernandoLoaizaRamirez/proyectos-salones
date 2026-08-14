/**
 * Ruta del MÓDULO ÁLBUM dentro del portal (Server Component).
 *
 * Resuelve la config del evento (`?e=`) y HACE VALER el entitlement en el
 * SERVIDOR: si la función "album" no está habilitada para el evento, el módulo
 * ni siquiera se renderiza (esconder la tarjeta en la home no basta).
 */
import Link from "next/link";
import { ArrowLeft, Lock, SearchX } from "lucide-react";
import { tieneFuncion, FEATURES_CONOCIDAS as F } from "@salones/core";
import { BrandingScope, Card, type BrandingSalon } from "@salones/ui";
import { resolverConfigEvento } from "@/lib/config-evento";
import { AlbumModulo } from "@/modulos/album/album-modulo";

const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const codigo = e && CODIGO_VALIDO.test(e) ? e : "demo";
  const config = await resolverConfigEvento(codigo);

  if (config.estado === "no-encontrado") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">No encontramos este evento</h1>
        <p className="mt-2 text-muted-foreground">
          Revisa el enlace que te compartieron: puede que el código esté incompleto.
        </p>
      </main>
    );
  }

  const branding: BrandingSalon = config.branding ?? { nombre: config.nombre };
  const habilitado = tieneFuncion(config.entitlements, F.Album);
  const volver = codigo === "demo" ? "/" : `/?e=${encodeURIComponent(codigo)}`;

  return (
    <BrandingScope branding={branding} className="min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href={volver}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver al portal
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Álbum de fotos</h1>
        <p className="mt-2 mb-8 text-muted-foreground">{config.nombre}</p>

        {habilitado ? (
          // El paquete de VIDEO se vende aparte del álbum (migración 0017): un
          // video pesa como cien fotos. Se resuelve aquí, en el servidor, con los
          // mismos entitlements que deciden si el módulo entero se pinta.
          <AlbumModulo
            evento={codigo}
            nombreEvento={config.nombre}
            conVideo={tieneFuncion(config.entitlements, F.Video)}
          />
        ) : (
          <Card className="flex items-start gap-4 p-6">
            <Lock className="size-6 shrink-0 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">Esta experiencia no está activa</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                El álbum de fotos no está incluido en este evento.
              </p>
            </div>
          </Card>
        )}
      </main>
    </BrandingScope>
  );
}
