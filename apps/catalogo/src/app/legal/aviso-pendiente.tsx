import { AlertTriangle } from "lucide-react";

/**
 * Mientras falten datos obligatorios, se dice en grande. Un aviso de privacidad
 * sin responsable identificado no cumple: es peor publicarlo a medias que no
 * publicarlo.
 */
export function AvisoPendiente({ campos }: { campos: string[] }) {
  return (
    <div className="mt-6 rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="size-4 shrink-0" /> Estos documentos todavía no están listos
        para publicarse
      </p>
      <p className="mt-2 text-sm text-amber-700/90 dark:text-amber-400/90">
        Faltan por rellenar: {campos.join(", ")}. Se editan en{" "}
        <code className="rounded bg-amber-500/15 px-1 py-0.5">src/lib/legal.ts</code>. Además, un
        abogado debe revisar los textos antes de usarlos con un cliente real.
      </p>
    </div>
  );
}
