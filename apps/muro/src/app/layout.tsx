import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/muro";
import "./globals.css";

export const metadata: Metadata = {
  title: `Muro de mensajes · ${evento.nombre}`,
  description:
    "Deja tu mensaje y tu firma para los novios. Un libro de firmas digital que se proyecta en la fiesta.",
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
