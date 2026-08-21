import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { salon } from "@/lib/salon";
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
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const marca = process.env.NEXT_PUBLIC_BRAND_NAME ?? salon.nombre;

export const metadata: Metadata = {
  // Sin `metadataBase`, Next avisa en cada build y las direcciones de la tarjeta
  // salen relativas: WhatsApp y Facebook las descartan y vuelve el enlace pelón.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://salones-teal.vercel.app"),
  title: `${marca} · Bodas, XV años y eventos de gala`,
  description: salon.descripcion,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: marca,
    title: `${marca} · ${salon.lema}`,
    description: salon.descripcion,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
