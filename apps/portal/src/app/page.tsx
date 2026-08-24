/**
 * HOME del portal del evento (Server Component).
 *
 * Lee el código del evento del enlace (`?e=<codigo>`), resuelve su config
 * (funciones habilitadas + tema del salón y del evento) y delega el render a
 * `PortalHome`, que pinta la casa de la celebración.
 *
 * Sin `?e=` (o con uno inválido) usa el evento "demo": el portal se ve igual,
 * con todas las experiencias, para poder mostrarlo.
 */
import type { Metadata } from "next";
import { resolverConfigEvento } from "@/lib/config-evento";
import { PortalHome } from "@/components/portal-home";

/** Solo letras, números y guiones, como el resto de la suite. */
const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

function codigoDe(e?: string): string {
  return e && CODIGO_VALIDO.test(e) ? e : "demo";
}

/**
 * La ficha del enlace, POR EVENTO. Lo que ve quien recibe el WhatsApp antes
 * de decidir si abre: el nombre real de la boda y su tarjeta con monograma y
 * colores del salón, en vez de un "Portal del evento" para todos.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}): Promise<Metadata> {
  const { e } = await searchParams;
  const codigo = codigoDe(e);
  const config = await resolverConfigEvento(codigo);

  if (config.estado === "no-encontrado") {
    return { title: "Evento no encontrado" };
  }

  const titulo = config.tema.evento?.nombre || config.nombre;
  const salon = config.tema.salon.nombre;
  const descripcion =
    config.tema.evento?.frase ||
    "Tu mesa, las fotos, la música y el muro de mensajes. Todo en un solo lugar.";
  const imagen = `/api/og?e=${encodeURIComponent(codigo)}`;

  return {
    title: `${titulo} · ${salon}`,
    description: descripcion,
    openGraph: {
      type: "website",
      locale: "es_MX",
      title: `${titulo} · ${salon}`,
      description: descripcion,
      images: [{ url: imagen, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [imagen] },
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const config = await resolverConfigEvento(codigoDe(e));
  return <PortalHome config={config} />;
}
