import { RevealP } from "./reveal-premium";
import { salon } from "@/lib/salon";

export function IntroPremium() {
  return (
    <section className="relative overflow-hidden border-y border-gold/10 bg-[#0d0906]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/5 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <RevealP>
          <p className="eyebrow mb-6">Bienvenida</p>
          <p className="text-balance font-display text-3xl leading-snug text-cream md:text-4xl">
            Desde {salon.fundacion}, en {salon.nombre} convertimos fechas en recuerdos: un recinto
            de gala donde cada boda, cada XV años y cada celebración se vive{" "}
            <span className="italic text-gold">como una sola vez en la vida.</span>
          </p>
        </RevealP>
      </div>
    </section>
  );
}
