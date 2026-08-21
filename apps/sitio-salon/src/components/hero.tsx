import { salon, heroFoto } from "@/lib/salon";

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Foto de fondo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroFoto}
        alt={`Salón de gala de ${salon.nombre}`}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      {/* Velo oscuro para que el texto se lea bien */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1a120f]/70 via-[#1a120f]/55 to-[#1a120f]/85" />

      <div className="mx-auto w-full max-w-3xl px-6 text-center text-cream">
        <p className="eyebrow mb-6 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-gold" /> {salon.ciudad}{" "}
          <span className="h-px w-8 bg-gold" />
        </p>
        <h1 className="text-balance font-display text-5xl leading-[1.05] text-cream sm:text-6xl md:text-7xl">
          {salon.nombre}
        </h1>
        <p className="mx-auto mt-6 max-w-xl font-display text-2xl italic text-gold">{salon.lema}</p>
        <p className="mx-auto mt-5 max-w-xl text-cream/85">{salon.descripcion}</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#contacto"
            className="rounded-[var(--radius)] bg-gold px-7 py-3 font-medium text-[#241d1a] transition-opacity hover:opacity-90"
          >
            Agenda una visita
          </a>
          <a
            href="#galeria"
            className="rounded-[var(--radius)] border border-cream/40 px-7 py-3 text-cream transition-colors hover:bg-cream/10"
          >
            Conoce el recinto
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] text-cream/70">
        <span className="inline-block rotate-180 [writing-mode:vertical-rl]">DESLIZA</span>
      </div>
    </section>
  );
}
