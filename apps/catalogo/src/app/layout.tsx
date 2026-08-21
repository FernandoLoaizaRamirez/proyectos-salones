import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { vendedor } from "@/lib/catalogo";
import "./globals.css";

/*
 * El catálogo se comparte POR WHATSAPP: antes de abrirlo, el dueño del salón ve
 * la tarjetita de vista previa. Sin estos datos salía pelona (solo la dirección
 * web), y un enlace así no lo abre nadie. La imagen la genera
 * `opengraph-image.tsx`.
 */
const descripcion =
  "Fotos, mensajes, canciones y juegos que tus invitados comparten con la pura cámara de su celular. 12 apps con demos que puedes probar ahorita. Desde $500 por evento.";

/* Sin `metadataBase` la dirección de la estampa sale relativa y WhatsApp no la
   descarga: la vista previa aparecería sin imagen. Se puede cambiar el dominio
   con `NEXT_PUBLIC_SITIO_URL` sin tocar el código. */
const sitio = process.env.NEXT_PUBLIC_SITIO_URL ?? "https://suite-salones.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(sitio),
  title: `${vendedor.nombre} · Catálogo de apps para tu salón`,
  description: descripcion,
  openGraph: {
    title: "Lo que hace que elijan tu salón y no el de enfrente",
    description: descripcion,
    siteName: vendedor.nombre,
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lo que hace que elijan tu salón y no el de enfrente",
    description: descripcion,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
