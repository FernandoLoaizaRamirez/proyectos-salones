import { invitacion, tituloEvento } from "@/lib/invitacion";
import { CuentaRegresiva } from "./cuenta-regresiva";

export function Hero() {
  const eyebrow = invitacion.tipo === "xv" ? "Mis XV años" : "Nos casamos";
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={invitacion.fotoPortada}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#20241c]/70 via-[#20241c]/55 to-[#20241c]/85" />

      <p className="eyebrow mb-6 text-cream/90">{eyebrow}</p>
      <h1 className="font-display text-6xl italic leading-none text-cream sm:text-7xl md:text-8xl">
        {tituloEvento()}
      </h1>
      <p className="mt-6 flex items-center gap-3 text-cream/90">
        <span className="h-px w-8 bg-gold" />
        {invitacion.fechaTexto}
        <span className="h-px w-8 bg-gold" />
      </p>

      <div className="mt-10">
        <CuentaRegresiva fechaISO={invitacion.fechaISO} />
      </div>

      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-[0.7rem] tracking-[0.3em] text-cream/70">
        <span className="inline-block rotate-180 animate-pulse [writing-mode:vertical-rl]">
          DESLIZA
        </span>
      </div>
    </section>
  );
}
