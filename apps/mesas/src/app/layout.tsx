import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import "./globals.css";

/*
 * EL TITULO NO NOMBRA NINGUNA BODA. Antes decia el nombre de la muestra
 * quemada: al compartir el enlace de una boda REAL, la pestana y la vista
 * previa del mensaje ensenaban el nombre de OTRA pareja. El nombre del evento
 * si se ve dentro, en la cinta, sacado del evento de verdad.
 */
export const metadata: Metadata = {
  title: "Acomodo de mesas",
  description:
    "Organiza quién se sienta en cada mesa arrastrando a tus invitados. Comparte el acomodo por un enlace de solo lectura.",
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
