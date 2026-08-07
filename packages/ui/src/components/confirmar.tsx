"use client";

/**
 * CONFIRMAR — el diálogo que se pone delante de lo que no tiene vuelta atrás.
 *
 * POR QUÉ EXISTE (auditoría del 5 ago 2026):
 *   En las 14 apps no había NI UNA confirmación. El caso peor era el botón
 *   "Reiniciar" del acomodo de mesas: borraba el plano entero de un clic, sin
 *   preguntar y sin deshacer, el día del evento y con prisa. Lo mismo en la
 *   lista de la puerta.
 *
 * DOS NIVELES, a propósito:
 *   · Normal            → "¿Seguro?" con dos botones. Para quitar una cosa.
 *   · `escribirParaConfirmar` → además hay que TECLEAR una palabra. Para lo que
 *     borra el trabajo de toda una tarde. Teclear obliga a leer, que es justo lo
 *     que un diálogo de "¿Seguro? [Sí]" no consigue cuando se va con prisa.
 *
 * El foco arranca en CANCELAR y Escape cancela: si alguien viene dándole a Enter
 * sin mirar, no destruye nada.
 */

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "./button";
import { cn } from "../lib/cn";

export type ConfirmarProps = {
  abierto: boolean;
  titulo: string;
  /** Qué va a pasar exactamente. Concreto: "se borran las 12 mesas". */
  descripcion?: React.ReactNode;
  /** Texto del botón que destruye. Debe decir QUÉ hace, no "Aceptar". */
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Si se indica, hay que teclearlo tal cual para desbloquear el botón. */
  escribirParaConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function Confirmar({
  abierto,
  titulo,
  descripcion,
  textoConfirmar = "Sí, continuar",
  textoCancelar = "Cancelar",
  escribirParaConfirmar,
  onConfirmar,
  onCancelar,
}: ConfirmarProps) {
  const [escrito, setEscrito] = React.useState("");
  const cancelarRef = React.useRef<HTMLButtonElement>(null);
  const idTitulo = React.useId();

  // Cada vez que se abre, se empieza de cero: que no quede la palabra tecleada
  // de la vez anterior y el botón salga ya desbloqueado.
  React.useEffect(() => {
    if (abierto) setEscrito("");
  }, [abierto]);

  React.useEffect(() => {
    if (!abierto) return;
    cancelarRef.current?.focus();
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    document.addEventListener("keydown", alTecla);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTecla);
      document.body.style.overflow = previo;
    };
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  const bloqueado = Boolean(escribirParaConfirmar) && escrito.trim() !== escribirParaConfirmar;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="w-full max-w-md rounded-[var(--radius)] border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <TriangleAlert className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-lg font-semibold">
              {titulo}
            </h2>
            {descripcion ? (
              <div className="mt-1 text-sm text-muted-foreground">{descripcion}</div>
            ) : null}
          </div>
        </div>

        {escribirParaConfirmar ? (
          <label className="mt-4 block text-sm">
            Para confirmar, escribe{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              {escribirParaConfirmar}
            </code>
            <input
              value={escrito}
              onChange={(e) => setEscrito(e.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelarRef} variant="outline" onClick={onCancelar}>
            {textoCancelar}
          </Button>
          <Button
            variant="outline"
            disabled={bloqueado}
            onClick={onConfirmar}
            className={cn(
              "border-red-500/50 text-red-600 hover:bg-red-500/10 dark:text-red-400",
              bloqueado && "opacity-50",
            )}
          >
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
