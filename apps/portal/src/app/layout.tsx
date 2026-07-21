import type { Metadata } from "next";
import { ThemeProvider } from "@salones/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal del evento",
  description: "Todo lo de tu evento, en un solo lugar.",
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
