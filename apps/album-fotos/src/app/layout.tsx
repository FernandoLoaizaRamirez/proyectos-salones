import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import "./globals.css";

const marca = process.env.NEXT_PUBLIC_BRAND_NAME;

export const metadata: Metadata = {
  title: marca ? `Álbum de Fotos · ${marca}` : "Álbum de Fotos del Evento",
  description: "Comparte y descarga las fotos del evento en un solo lugar.",
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
