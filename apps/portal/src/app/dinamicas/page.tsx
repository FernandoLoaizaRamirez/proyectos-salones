/**
 * Ruta del MÓDULO DINÁMICAS dentro del portal (Server Component).
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
import { DinamicasModulo } from "@/modulos/dinamicas/dinamicas-modulo";

export function generateMetadata({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  return metadataModulo(searchParams, "Dinámicas y juegos");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await contextoModulo(searchParams, F.Dinamicas);
  if (ctx.tipo === "no-encontrado") return <EventoNoEncontrado />;

  return (
    <AppShell tema={ctx.config.tema} ancho="3xl" className="max-w-2xl" {...ctx.navegacion}>
      {/* El enlace personal (#) se captura llegue por la puerta que llegue. */}
      <CapturaPerfil evento={ctx.codigo} />
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Dinámicas y juegos
      </h1>
      {ctx.habilitado ? (
        <DinamicasModulo evento={ctx.codigo} nombreEvento={ctx.config.nombre} />
      ) : (
        <ExperienciaNoIncluida que="Las dinámicas y juegos" />
      )}
    </AppShell>
  );
}
