"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./button";

/** Botón para alternar entre tema claro y oscuro. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = React.useState(false);

  React.useEffect(() => setMontado(true), []);

  const esOscuro = montado && resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Cambiar tema claro u oscuro"
      onClick={() => setTheme(esOscuro ? "light" : "dark")}
    >
      {esOscuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {/* El texto se esconde en el celular: en 390 px este botón le robaba el
          ancho al título del evento, que acababa cortado. El `aria-label` de
          arriba mantiene el nombre para quien usa lector de pantalla. */}
      <span className="hidden sm:inline">{esOscuro ? "Claro" : "Oscuro"}</span>
    </Button>
  );
}
