import { Heart, Crown, Briefcase, PartyPopper } from "lucide-react";
import { tiposEvento } from "@/lib/salon";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

const iconos = {
  boda: Heart,
  xv: Crown,
  corporativo: Briefcase,
  social: PartyPopper,
} as const;

export function Eventos() {
  return (
    <section id="eventos" className="border-y border-border bg-cream/40">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <SectionHeading
          eyebrow="Para cada celebración"
          title={
            <>
              Un lugar para <span className="italic text-wine">todo lo que importa</span>
            </>
          }
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiposEvento.map((t, i) => {
            const Icono = iconos[t.clave];
            return (
              <Reveal key={t.clave} delay={i * 80} className="h-full">
                <article className="flex h-full flex-col items-center rounded-[var(--radius)] border border-border bg-card p-8 text-center transition-shadow hover:shadow-md">
                  <span className="grid size-14 place-items-center rounded-full border border-gold/40 text-wine">
                    <Icono className="size-6" strokeWidth={1.5} />
                  </span>
                  <h3 className="mt-5 font-display text-2xl">{t.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t.descripcion}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
