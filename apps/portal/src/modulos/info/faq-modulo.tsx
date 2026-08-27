"use client";

/**
 * MÓDULO PREGUNTAS FRECUENTES (dentro del portal).
 *
 * Las dudas de siempre —estacionamiento, niños, regalos, horas— contestadas
 * una vez por los organizadores en vez de cien veces por WhatsApp. Se pintan
 * con <details>: abre y cierra sin JavaScript propio, con el teclado y con el
 * lector de pantalla funcionando de fábrica.
 */
import { ChevronDown, CircleHelp } from "lucide-react";
import { EmptyState } from "@salones/ui";
import { useInvitacion } from "./use-invitacion";

export function FaqModulo({ evento }: { evento: string }) {
  const inv = useInvitacion(evento);

  if (inv === "cargando") return null;

  const preguntas = inv ? inv.faq.filter((p) => p.pregunta.trim() && p.respuesta.trim()) : [];

  if (preguntas.length === 0) {
    return (
      <EmptyState
        icon={<CircleHelp className="size-8" />}
        title="Las preguntas frecuentes se publicarán pronto"
        description="Mientras tanto, cualquier duda se la puedes preguntar directo a los organizadores."
      />
    );
  }

  return (
    <div className="space-y-3">
      {preguntas.map((p) => (
        <details
          key={p.pregunta}
          className="group rounded-[var(--radius)] border border-border bg-card open:border-ring/60"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
            {p.pregunta}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{p.respuesta}</p>
        </details>
      ))}
    </div>
  );
}
