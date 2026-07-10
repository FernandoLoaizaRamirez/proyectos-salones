import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/photobooth";
import "./globals.css";

export const metadata: Metadata = {
  title: `Photobooth · ${evento.nombre}`,
  description:
    "Tómate una foto con el marco del evento y descárgala o compártela al instante.",
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
