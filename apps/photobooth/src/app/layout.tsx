import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import "./globals.css";

// Genérica a propósito (igual que la invitación): esta app ya sirve a
// cualquier evento, y poner aquí los nombres de la muestra dejaría "Ana &
// Rodrigo" en la pestaña de una boda real. El nombre de verdad lo pinta el
// cliente en el encabezado.
export const metadata: Metadata = {
  title: "Photobooth",
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
