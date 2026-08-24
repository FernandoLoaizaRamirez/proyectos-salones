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
        {/*
          EL INVITADO ARRANCA EN CLARO, con el tema de su salón. El componente
          compartido sigue teniendo "dark" por defecto (lo usa el panel, que es
          una herramienta de trabajo); aquí se pisa porque la experiencia de una
          boda no puede abrir como un panel de software. Las pantallas de staff
          de esta app (proyección, DJ, escáner) conservan el botón de
          claro/oscuro: quien las opera lo elige una vez.
        */}
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      </body>
    </html>
  );
}
