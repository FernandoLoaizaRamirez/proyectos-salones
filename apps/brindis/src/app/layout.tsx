import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/brindis";
import "./globals.css";

export const metadata: Metadata = {
  title: `Brindis en video · ${evento.nombre}`,
  description: "Graba un brindis en video para los novios y compártelo al instante.",
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
