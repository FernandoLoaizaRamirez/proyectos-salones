import { invitacion } from "@/lib/invitacion";
import { Reveal } from "./reveal";

export function Itinerario() {
  const items = invitacion.itinerario;
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-2xl px-6 py-24 md:py-28">
        <Reveal className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold" />
            Itinerario
            <span className="h-px w-8 bg-gold" />
          </p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">El plan de la noche</h2>
        </Reveal>
        <div className="mt-14">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="flex items-stretch gap-5">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-3 shrink-0 rounded-full bg-gold" />
                  {i < items.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
                </div>
                <div className="flex flex-1 items-baseline justify-between gap-4 pb-8">
                  <span className="font-display text-xl">{it.titulo}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{it.hora}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
