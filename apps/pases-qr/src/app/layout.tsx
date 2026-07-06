import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/evento";
import "./globals.css";

export const metadata: Metadata = {
  title: `Pases con QR · ${evento.nombre}`,
  description: "Pases de invitado con código QR y control de acceso en la entrada.",
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
