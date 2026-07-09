import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/mesas";
import "./globals.css";

export const metadata: Metadata = {
  title: `Acomodo de mesas · ${evento.nombre}`,
  description:
    "Organiza quién se sienta en cada mesa arrastrando a tus invitados. Comparte el acomodo por un enlace de solo lectura.",
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
