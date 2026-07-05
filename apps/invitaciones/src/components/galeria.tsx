import { invitacion } from "@/lib/invitacion";
import { Reveal } from "./reveal";

export function Galeria() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-28">
        <Reveal className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold" />
            Nosotros
            <span className="h-px w-8 bg-gold" />
          </p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Momentos juntos</h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-3">
          {invitacion.fotos.map((f, i) => (
            <Reveal key={f} delay={(i % 3) * 70}>
              <div className="group aspect-[4/5] overflow-hidden rounded-[var(--radius)] border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
