import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Parisienne } from "next/font/google";
import "./globals.css";

/*
 * Las tres letras del diseño "acuarela botánica":
 *   · Cormorant Garamond — la serif de los nombres y los títulos.
 *   · Jost — la de leer, en minúsculas y con mucho espaciado.
 *   · Parisienne — la caligráfica de los rótulos ("Con cariño", "La espera").
 *
 * Van por `next/font` y no por un enlace a Google: así el archivo se sirve
 * desde el mismo dominio, la letra no parpadea al cargar y no se le manda a
 * Google la visita de cada invitado.
 */
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
  display: "swap",
});

const script = Parisienne({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
  display: "swap",
});

/**
 * Título y descripción GENÉRICOS a propósito.
 *
 * Los datos de cada invitación se leen ya en el navegador (con el código del
 * evento), así que aquí todavía no se sabe de quién es la boda. La página pone
 * el título de verdad en cuanto los carga; lo de aquí es lo que se ve el primer
 * instante y en los buscadores, y para eso conviene que no diga los nombres de
 * nadie.
 */
export const metadata: Metadata = {
  title: "Invitación digital",
  description: "Todos los detalles del evento y la confirmación de asistencia, en un solo enlace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-MX"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable} ${script.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
