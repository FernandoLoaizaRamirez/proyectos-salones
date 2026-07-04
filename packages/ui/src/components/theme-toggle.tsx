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
      <span>{esOscuro ? "Claro" : "Oscuro"}</span>
    </Button>
  );
}
