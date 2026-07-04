import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import { vendedor } from "@/lib/catalogo";
import "./globals.css";

export const metadata: Metadata = {
  title: `${vendedor.nombre} · Catálogo de apps para tu salón`,
  description: vendedor.tagline,
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
