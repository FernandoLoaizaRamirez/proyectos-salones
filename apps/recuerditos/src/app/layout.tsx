import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { ThemeProvider } from "@salones/ui";
import { evento } from "@/lib/recuerditos";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Recuerditos · ${evento.nombre}`,
  description: "Crea tu recuerdo digital del evento y llévatelo a tu teléfono.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={display.variable}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
