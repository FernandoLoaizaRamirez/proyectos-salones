import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/rsvp";
import "./globals.css";

export const metadata: Metadata = {
  title: `Confirmación de asistencia · ${evento.nombre}`,
  description: "Confirma tu asistencia al evento en línea, en un clic.",
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
