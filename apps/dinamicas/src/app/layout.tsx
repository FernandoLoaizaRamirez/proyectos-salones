import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/dinamicas";
import "./globals.css";

export const metadata: Metadata = {
  title: `Dinámicas y juegos · ${evento.nombre}`,
  description: "Trivia de los novios, bingo de boda y rompehielos para animar la fiesta.",
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
