import { salon, estadisticas } from "@/lib/salon";
import { RevealP } from "./reveal-premium";
import { CountUp } from "./count-up";

/** Cifra clave del salón sobre una franja oscura, con marca de agua y halos dorados. */
export function StatsPremium() {
  const marca = salon.nombre.split(" ").slice(-1)[0];
  return (
    <section className="relative overflow-hidden bg-[#0b0705] py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display italic leading-none text-gold/[0.06]"
        style={{ fontSize: "clamp(80px, 20vw, 260px)" }}
      >
        {marca}
      </div>
      <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        {estadisticas.map((s, i) => (
          <RevealP key={s.etiqueta} delay={i * 90} className="text-center">
            <div className="font-display text-5xl text-gold md:text-6xl">
              <CountUp value={s.valor} />
            </div>
            <div className="mt-2 text-sm tracking-wide text-cream/75">{s.etiqueta}</div>
          </RevealP>
        ))}
      </div>
    </section>
  );
}
