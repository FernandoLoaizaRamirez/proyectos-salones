"use client";

import * as React from "react";
import { salon, heroFoto } from "@/lib/salon";
import { Particles } from "./particles";

export function HeroPremium() {
  const [scrollY, setScrollY] = React.useState(0);
  const [mx, setMx] = React.useState(0);
  const [my, setMy] = React.useState(0);
  const reduce = React.useRef(false);

  React.useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce.current) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const onMouse = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    setMx((e.clientX - r.left) / r.width - 0.5);
    setMy((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section
      id="inicio"
      onMouseMove={onMouse}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroFoto}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-30 h-[125%] w-full object-cover"
        style={{ transform: `translateY(${(scrollY * 0.25).toFixed(1)}px) scale(1.12)` }}
      />
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#1a120f]/75 via-[#1a120f]/60 to-[#1a120f]/90" />
      <Particles className="absolute inset-0 -z-10 h-full w-full" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />

      <div
        className="mx-auto w-full max-w-3xl px-6 text-center text-cream"
        style={{
          transform: `translate3d(${(-mx * 16).toFixed(1)}px, ${(-my * 12 - scrollY * 0.12).toFixed(1)}px, 0)`,
        }}
      >
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

      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-[0.7rem] tracking-[0.3em] text-cream/70">
        <span className="inline-block rotate-180 animate-pulse [writing-mode:vertical-rl]">
          DESLIZA
        </span>
      </div>
    </section>
  );
}
