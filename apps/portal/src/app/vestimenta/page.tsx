/**
 * Ruta del MÓDULO CÓDIGO DE VESTIMENTA dentro del portal (Server Component).
 *
 * La cáscara y el candado del entitlement viven en `contextoModulo` +
 * `AppShell`: aquí solo se dice QUÉ módulo es esta pantalla.
 */
import { AppShell } from "@salones/ui";
import { FEATURES_CONOCIDAS as F } from "@salones/core";
import { contextoModulo, metadataModulo } from "@/lib/pantalla-modulo";
import { CapturaPerfil } from "@/components/captura-perfil";
import { EventoNoEncontrado, ExperienciaNoIncluida } from "@/components/pantallas";
import { VestimentaModulo } from "@/modulos/info/vestimenta-modulo";

export function generateMetadata({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  return metadataModulo(searchParams, "Código de vestimenta");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const ctx = await contextoModulo(searchParams, F.Vestimenta);
  if (ctx.tipo === "no-encontrado") return <EventoNoEncontrado />;

  return (
    <AppShell tema={ctx.config.tema} ancho="3xl" {...ctx.navegacion}>
      <CapturaPerfil evento={ctx.codigo} />
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Código de vestimenta
      </h1>
      {ctx.habilitado ? (
        <VestimentaModulo evento={ctx.codigo} />
      ) : (
        <ExperienciaNoIncluida que="El código de vestimenta" />
      )}
    </AppShell>
  );
}
