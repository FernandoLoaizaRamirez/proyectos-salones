import { Quote } from "lucide-react";
import { testimonios } from "@/lib/salon";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

export function Testimonios() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeading
        eyebrow="Testimonios"
        title={
          <>
            Lo que dicen <span className="italic text-wine">quienes ya celebraron</span>
          </>
        }
      />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {testimonios.map((t, i) => (
          <Reveal key={t.autor} delay={i * 90} className="h-full">
            <figure className="flex h-full flex-col rounded-[var(--radius)] border border-border bg-card p-8">
              <Quote className="size-8 text-gold/60" />
              <blockquote className="mt-4 flex-1 font-display text-xl italic leading-relaxed">
                “{t.cita}”
              </blockquote>
              <figcaption className="mt-6">
                <div className="font-medium">{t.autor}</div>
                <div className="text-sm text-muted-foreground">{t.evento}</div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
