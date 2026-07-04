"use client";

import * as React from "react";
import { salon, espacios, heroFoto } from "@/lib/salon";
import { Particles } from "./particles";

/** Fotos que rotan en la portada (el recinto y sus espacios). */
const slides = [heroFoto, ...espacios.map((e) => e.foto)];
const SLIDE_MS = 6000;

/**
 * Portada inmersiva: carrusel cinematográfico con zoom lento (Ken Burns),
 * transiciones en fundido, partículas doradas, parallax con el cursor y el
 * scroll, y entrada escalonada del texto.
 */
export function HeroPremium() {
  const [idx, setIdx] = React.useState(0);
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

  React.useEffect(() => {
    if (reduce.current) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
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
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#100b08]"
    >
      {/* Carrusel de fondo (fundido + Ken Burns) */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${(scrollY * 0.2).toFixed(1)}px)` }}
      >
        {slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-[115%] w-full object-cover transition-opacity duration-[1400ms] ease-out ${
              i === idx ? "opacity-100" : "opacity-0"
            } ${i % 2 === 0 ? "kenburns" : "kenburns-rev"}`}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#100b08]/75 via-[#100b08]/45 to-[#100b08]/95" />
      <div className="absolute inset-0 z-[1] [background:radial-gradient(120%_90%_at_50%_115%,rgba(16,11,8,0.9),transparent_55%)]" />
      <Particles className="absolute inset-0 z-[2] h-full w-full" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />

      <div
        className="relative z-10 mx-auto w-full max-w-3xl px-6 text-center text-cream"
        style={{
          transform: `translate3d(${(-mx * 16).toFixed(1)}px, ${(-my * 12 - scrollY * 0.1).toFixed(1)}px, 0)`,
        }}
      >
        <p className="eyebrow fade-up mb-6 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-gold" /> {salon.ciudad}{" "}
          <span className="h-px w-8 bg-gold" />
        </p>
        <h1
          className="fade-up text-balance font-display text-5xl leading-[1.05] text-cream sm:text-6xl md:text-7xl"
          style={{ animationDelay: "0.08s" }}
        >
          {salon.nombre}
        </h1>
        <p
          className="fade-up mx-auto mt-6 max-w-xl font-display text-2xl italic text-gold"
          style={{ animationDelay: "0.16s" }}
        >
          {salon.lema}
        </p>
        <p
          className="fade-up mx-auto mt-5 max-w-xl text-cream/85"
          style={{ animationDelay: "0.24s" }}
        >
          {salon.descripcion}
        </p>
        <div
          className="fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "0.32s" }}
        >
          <a
            href="#contacto"
            className="rounded-[var(--radius)] bg-gold px-7 py-3 font-medium text-[#241d1a] transition-transform duration-300 hover:scale-[1.03]"
          >
            Agenda una visita
          </a>
          <a
            href="#galeria"
            className="rounded-[var(--radius)] border border-cream/40 px-7 py-3 text-cream transition-colors hover:border-gold hover:text-gold"
          >
            Conoce el recinto
          </a>
        </div>
      </div>

      {/* Indicadores del carrusel con barra de avance */}
      <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Ver foto ${i + 1} de ${slides.length}`}
            className="relative h-1.5 overflow-hidden rounded-full bg-cream/25 transition-[width] duration-500"
            style={{ width: i === idx ? "2.5rem" : "0.5rem" }}
          >
            {i === idx ? (
              <span
                key={idx}
                className="absolute inset-y-0 left-0 block bg-gold"
                style={{ animation: reduce.current ? "none" : `slideBar ${SLIDE_MS}ms linear` }}
              />
            ) : null}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[0.7rem] tracking-[0.3em] text-cream/70">
        <span className="inline-block rotate-180 animate-pulse [writing-mode:vertical-rl]">
          DESLIZA
        </span>
      </div>
    </section>
  );
}
