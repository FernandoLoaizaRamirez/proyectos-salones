import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://proyectos-salones-portal.vercel.app",
  ),
  title: "Portal del evento",
  description: "Tu mesa, las fotos, la música y el muro de mensajes. Todo en un solo lugar.",
  openGraph: {
    type: "website",
    locale: "es_MX",
    title: "Portal del evento",
    // El enlace del portal se reenvía DE INVITADO A INVITADO por WhatsApp: es el
    // camino por el que más gente entra. Sin tarjeta, ese reenvío parecía spam.
    description: "Tu mesa, las fotos, la música y el muro de mensajes. Todo en un solo lugar.",
  },
  twitter: { card: "summary_large_image" },
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
