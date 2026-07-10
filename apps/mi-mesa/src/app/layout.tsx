import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/mimesa";
import "./globals.css";

export const metadata: Metadata = {
  title: `¿En qué mesa me toca? · ${evento.nombre}`,
  description: "Escribe tu nombre y descubre en qué mesa te toca y quiénes te acompañan.",
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
