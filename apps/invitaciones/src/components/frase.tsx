import { invitacion } from "@/lib/invitacion";
import { Reveal } from "./reveal";

export function Frase() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-28">
        <Reveal>
          <span className="mx-auto block h-10 w-px bg-gold/50" />
          <p className="mt-8 font-display text-2xl italic leading-relaxed text-foreground md:text-3xl">
            {invitacion.frase}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="eyebrow">Padres de la novia</p>
              <p className="mt-2 font-display text-xl">{invitacion.padres.novia.join(" · ")}</p>
            </div>
            <div>
              <p className="eyebrow">Padres del novio</p>
              <p className="mt-2 font-display text-xl">{invitacion.padres.novio.join(" · ")}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
