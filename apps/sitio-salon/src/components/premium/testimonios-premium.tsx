"use client";

import * as React from "react";
import { Quote } from "lucide-react";
import { testimonios } from "@/lib/salon";
import { RevealP } from "./reveal-premium";

const ROTATE_MS = 5500;

/** Testimonios que rotan solos, con transición en fundido y control por puntos. */
export function TestimoniosPremium() {
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % testimonios.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <RevealP>
        <p className="eyebrow flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-gold" />
          Testimonios
          <span className="h-px w-8 bg-gold" />
        </p>
        <Quote className="mx-auto mt-8 size-10 text-gold/50" />
        <div className="relative mt-6 min-h-[12rem] md:min-h-[10rem]">
          {testimonios.map((t, i) => (
            <blockquote
              key={t.autor}
              className={`absolute inset-0 flex flex-col items-center justify-start transition-all duration-700 ease-out ${
                i === idx
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-3 opacity-0"
              }`}
            >
              <p className="text-balance font-display text-2xl italic leading-relaxed text-cream md:text-3xl">
                “{t.cita}”
              </p>
              <footer className="mt-6">
                <div className="font-medium text-gold">{t.autor}</div>
                <div className="text-sm text-muted-foreground">{t.evento}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      </RevealP>
      <div className="mt-8 flex items-center justify-center gap-2">
        {testimonios.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Ver testimonio ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === idx ? "w-6 bg-gold" : "w-1.5 bg-cream/30 hover:bg-cream/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
