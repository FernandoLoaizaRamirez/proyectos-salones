import { estadisticas } from "@/lib/salon";
import { Reveal } from "./reveal";

export function Stats() {
  return (
    <section className="bg-wine text-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4">
        {estadisticas.map((s, i) => (
          <Reveal key={s.etiqueta} delay={i * 80} className="text-center">
            <div className="font-display text-5xl text-gold md:text-6xl">{s.valor}</div>
            <div className="mt-2 text-sm tracking-wide text-cream/80">{s.etiqueta}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
