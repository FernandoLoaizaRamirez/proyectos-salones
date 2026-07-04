import { Reveal } from "./reveal";
import { salon } from "@/lib/salon";

export function Intro() {
  return (
    <section className="border-y border-border bg-cream/40">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-28">
        <Reveal>
          <p className="eyebrow mb-6">Bienvenida</p>
          <p className="text-balance font-display text-3xl leading-snug md:text-4xl">
            Desde {salon.fundacion}, en {salon.nombre} convertimos fechas en recuerdos: un recinto
            de gala donde cada boda, cada XV años y cada celebración se vive{" "}
            <span className="italic text-wine">como una sola vez en la vida.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
