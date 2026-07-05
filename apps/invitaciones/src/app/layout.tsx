import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { invitacion, tituloEvento } from "@/lib/invitacion";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

export const metadata: Metadata = {
  title: `${tituloEvento()} · Invitación`,
  description: `Te invitamos a celebrar: ${tituloEvento()}. ${invitacion.fechaTexto}, ${invitacion.ciudad}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
