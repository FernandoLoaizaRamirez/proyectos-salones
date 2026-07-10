import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/playlist";
import "./globals.css";

export const metadata: Metadata = {
  title: `Playlist colaborativa · ${evento.nombre}`,
  description:
    "Pide tu canción y vota por las de los demás. La música de la fiesta la eligen todos.",
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
