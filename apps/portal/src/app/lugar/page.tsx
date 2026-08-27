/**
 * Ruta del MÓDULO LUGAR dentro del portal (Server Component).
 *
 * La cáscara y el candado del entitlement viven en `contextoModulo` +
 * `AppShell`: aquí solo se dice QUÉ módulo es esta pantalla.
 */
import { AppShell } from "@salones/ui";
import { FEATURES_CONOCIDAS as F } from "@salones/core";
import { contextoModulo, metadataModulo } from "@/lib/pantalla-modulo";
import { CapturaPerfil } from "@/components/captura-perfil";
import { EventoNoEncontrado, ExperienciaNoIncluida } from "@/components/pantallas";
import { LugarModulo } from "@/modulos/info/lugar-modulo";

export function generateMetadata({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  return metadataModulo(searchParams, "Lugar y cómo llegar");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await contextoModulo(searchParams, F.Lugar);
  if (ctx.tipo === "no-encontrado") return <EventoNoEncontrado />;

  return (
    <AppShell tema={ctx.config.tema} ancho="3xl" {...ctx.navegacion}>
      <CapturaPerfil evento={ctx.codigo} />
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Lugar y cómo llegar
      </h1>
      {ctx.habilitado ? (
        <LugarModulo evento={ctx.codigo} />
      ) : (
        <ExperienciaNoIncluida que="La información del lugar" />
      )}
    </AppShell>
  );
}
