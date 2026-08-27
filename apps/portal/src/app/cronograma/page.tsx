/**
 * Ruta del MÓDULO CRONOGRAMA dentro del portal (Server Component).
 *
 * La cáscara y el candado del entitlement viven en `contextoModulo` +
 * `AppShell`: aquí solo se dice QUÉ módulo es esta pantalla.
 */
import { AppShell } from "@salones/ui";
import { FEATURES_CONOCIDAS as F } from "@salones/core";
import { contextoModulo, metadataModulo } from "@/lib/pantalla-modulo";
import { CapturaPerfil } from "@/components/captura-perfil";
import { EventoNoEncontrado, ExperienciaNoIncluida } from "@/components/pantallas";
import { CronogramaModulo } from "@/modulos/info/cronograma-modulo";

export function generateMetadata({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  return metadataModulo(searchParams, "Cronograma");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await contextoModulo(searchParams, F.Cronograma);
  if (ctx.tipo === "no-encontrado") return <EventoNoEncontrado />;

  return (
    <AppShell tema={ctx.config.tema} ancho="3xl" {...ctx.navegacion}>
      <CapturaPerfil evento={ctx.codigo} />
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Cronograma
      </h1>
      {ctx.habilitado ? (
        <CronogramaModulo evento={ctx.codigo} />
      ) : (
        <ExperienciaNoIncluida que="El cronograma" />
      )}
    </AppShell>
  );
}
