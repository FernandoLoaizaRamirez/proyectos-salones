"use client";

/**
 * Último recurso: reventó el armazón de la app.
 *
 * `global-error` SUSTITUYE al layout raíz, así que aquí no se carga la hoja de
 * estilos. Por eso `PantallaErrorGrave` va con estilos en línea; si usara clases
 * de Tailwind, esto saldría como texto sin formato.
 */
import { PantallaErrorGrave } from "@salones/ui";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <PantallaErrorGrave reset={reset} />
      </body>
    </html>
  );
}
