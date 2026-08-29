/**
 * EL PORTAL DEL ORGANIZADOR (Server Component) — la casa de los novios.
 *
 * No es un módulo vendible del invitado (no está en el directorio ni en
 * entitlements a propósito): es la otra cara del evento, y su candado no es
 * un plan sino LA LLAVE de anfitrión — el módulo cliente la exige y sin ella
 * enseña la puerta. Aquí solo se resuelve el tema (la marca de SU boda: este
 * portal se siente suyo, no del software) y la cáscara.
 */
import { CintaExperiencia, PieExperiencia, TemaScope } from "@salones/ui";
import type { Metadata } from "next";
import { resolverConfigEvento } from "@/lib/config-evento";
import { EventoNoEncontrado } from "@/components/pantallas";
import { OrganizadorModulo } from "@/modulos/organizador/organizador-modulo";

const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}): Promise<Metadata> {
  const { e } = await searchParams;
  const codigo = e && CODIGO_VALIDO.test(e) ? e : "demo";
  const config = await resolverConfigEvento(codigo);
  if (config.estado === "no-encontrado") return { title: "Evento no encontrado" };
  const evento = config.tema.evento?.nombre || config.nombre;
  return { title: `Portal del organizador · ${evento}` };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const codigo = e && CODIGO_VALIDO.test(e) ? e : "demo";
  const config = await resolverConfigEvento(codigo);
  if (config.estado === "no-encontrado") return <EventoNoEncontrado />;

  const sufijo = codigo && codigo !== "demo" ? `?e=${encodeURIComponent(codigo)}` : "";

  return (
    <TemaScope tema={config.tema} className="flex min-h-screen flex-col">
      <CintaExperiencia
        tema={config.tema}
        volverHref={`/${sufijo}`}
        volverEtiqueta="Ver el portal de tus invitados"
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-primary">
          Portal del organizador
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {config.tema.evento?.nombre || config.nombre}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu evento, del lado de quien lo organiza: cómo va, quién viene y tus herramientas.
        </p>
        <div className="mt-8">
          <OrganizadorModulo evento={codigo} nombreEvento={config.nombre} />
        </div>
      </main>
      <div className="mx-auto w-full max-w-3xl">
        <PieExperiencia tema={config.tema} />
      </div>
    </TemaScope>
  );
}
