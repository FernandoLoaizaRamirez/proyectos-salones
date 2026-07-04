import { estadisticas } from "@/lib/salon";
import { Reveal } from "../reveal";
import { CountUp } from "./count-up";

export function StatsPremium() {
  return (
    <section className="relative overflow-hidden bg-wine text-cream">
      <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-20 md:grid-cols-4">
        {estadisticas.map((s, i) => (
          <Reveal key={s.etiqueta} delay={i * 80} className="text-center">
            <div className="font-display text-5xl text-gold md:text-6xl">
              <CountUp value={s.valor} />
            </div>
            <div className="mt-2 text-sm tracking-wide text-cream/80">{s.etiqueta}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
