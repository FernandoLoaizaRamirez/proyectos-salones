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
