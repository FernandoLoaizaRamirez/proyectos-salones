/**
 * Ruta del MÓDULO PLAYLIST dentro del portal (Server Component).
 *
 * La cáscara (tema del salón, cinta de navegación, pie con la siguiente
 * parada) y el candado del entitlement viven en `contextoModulo` + `AppShell`:
 * aquí solo se dice QUÉ módulo es esta pantalla.
 */
import { AppShell } from "@salones/ui";
import { FEATURES_CONOCIDAS as F } from "@salones/core";
import { contextoModulo, metadataModulo } from "@/lib/pantalla-modulo";
import { CapturaPerfil } from "@/components/captura-perfil";
import { EventoNoEncontrado, ExperienciaNoIncluida } from "@/components/pantallas";
import { PlaylistModulo } from "@/modulos/playlist/playlist-modulo";

export function generateMetadata({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  return metadataModulo(searchParams, "Playlist colaborativa");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await contextoModulo(searchParams, F.Playlist);
  if (ctx.tipo === "no-encontrado") return <EventoNoEncontrado />;

  return (
    <AppShell tema={ctx.config.tema} ancho="3xl" {...ctx.navegacion}>
      {/* El enlace personal (#) se captura llegue por la puerta que llegue. */}
      <CapturaPerfil evento={ctx.codigo} />
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Playlist colaborativa
      </h1>
      {ctx.habilitado ? (
        <PlaylistModulo evento={ctx.codigo} nombreEvento={ctx.config.nombre} />
      ) : (
        <ExperienciaNoIncluida que="La playlist colaborativa" />
      )}
    </AppShell>
  );
}
