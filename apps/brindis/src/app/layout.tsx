import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import "./globals.css";

/*
 * ⚠️ EL TÍTULO NO NOMBRA NINGUNA BODA. Antes decía "· el evento", que es
 * la muestra quemada: al compartir el enlace de una boda REAL, la pestaña y la
 * vista previa del mensaje enseñaban el nombre de OTRA pareja. El nombre del
 * evento sí se ve dentro, en la cinta, sacado del evento de verdad.
 */
/*
 * EL TITULO NO NOMBRA NINGUNA BODA. Antes decia "· el evento", que es
 * la muestra quemada: al compartir el enlace de una boda REAL, la pestana y la
 * vista previa del mensaje ensenaban el nombre de OTRA pareja. El nombre del
 * evento si se ve dentro, en la cinta, sacado del evento de verdad.
 */
/*
 * EL TITULO NO NOMBRA NINGUNA BODA. Antes decia el nombre de la muestra
 * quemada: al compartir el enlace de una boda REAL, la pestana y la vista
 * previa del mensaje ensenaban el nombre de OTRA pareja. El nombre del evento
 * si se ve dentro, en la cinta, sacado del evento de verdad.
 */
export const metadata: Metadata = {
  title: "Brindis en video",
  description: "Graba un brindis en video para los novios y compártelo al instante.",
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
