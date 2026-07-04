import { Heart, Crown, Briefcase, PartyPopper } from "lucide-react";
import { tiposEvento } from "@/lib/salon";
import { RevealP } from "./reveal-premium";

const iconos = {
  boda: Heart,
  xv: Crown,
  corporativo: Briefcase,
  social: PartyPopper,
} as const;

export function EventosPremium() {
  return (
    <section id="eventos" className="relative overflow-hidden border-y border-gold/10 bg-[#0d0906]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <RevealP className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold" />
            Para cada celebración
            <span className="h-px w-8 bg-gold" />
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-4xl leading-tight text-cream md:text-5xl">
            Un lugar para <span className="italic text-gold">todo lo que importa</span>
          </h2>
        </RevealP>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiposEvento.map((t, i) => {
            const Icono = iconos[t.clave];
            return (
              <RevealP key={t.clave} delay={i * 90} className="h-full">
                <article className="group flex h-full flex-col items-center rounded-[var(--radius)] border border-border bg-card/50 p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold/40">
                  <span className="grid size-14 place-items-center rounded-full border border-gold/40 text-gold transition-colors group-hover:bg-gold group-hover:text-[#17110d]">
                    <Icono className="size-6" strokeWidth={1.5} />
                  </span>
                  <h3 className="mt-5 font-display text-2xl text-cream">{t.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t.descripcion}</p>
                </article>
              </RevealP>
            );
          })}
        </div>
      </div>
    </section>
  );
}
