/**
 * HOME del portal del evento (Server Component).
 *
 * Lee el código del evento del enlace (`?e=<codigo>`), resuelve su config
 * (funciones habilitadas + branding) y delega el render al componente de cliente
 * `PortalHome`, que aplica el branding y muestra los módulos disponibles.
 *
 * Sin `?e=` (o con uno inválido) usa el evento "demo": el portal se ve igual, con
 * todos los módulos, para poder mostrarlo.
 */
import { resolverConfigEvento } from "@/lib/config-evento";
import { PortalHome } from "@/components/portal-home";

/** Solo letras, números y guiones, como el resto de la suite. */
const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const codigo = e && CODIGO_VALIDO.test(e) ? e : "demo";
  const config = await resolverConfigEvento(codigo);
  return <PortalHome config={config} />;
}
