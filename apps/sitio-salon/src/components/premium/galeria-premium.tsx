"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { galeria } from "@/lib/salon";
import { RevealP } from "./reveal-premium";
import { Particles } from "./particles";

/** Alturas variadas para dar ritmo tipo mosaico (masonry). */
const aspects = [
  "aspect-[4/5]",
  "aspect-[4/3]",
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/5]",
  "aspect-[4/3]",
];

export function GaleriaPremium() {
  const [idx, setIdx] = React.useState<number | null>(null);
  const open = idx !== null;

  const close = React.useCallback(() => setIdx(null), []);
  const go = React.useCallback(
    (d: number) => setIdx((i) => (i === null ? i : (i + d + galeria.length) % galeria.length)),
    [],
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, go]);

  const actual = idx === null ? null : galeria[idx];

  return (
    <section id="galeria" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <RevealP className="text-center">
        <p className="eyebrow flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-gold" />
          Galería
          <span className="h-px w-8 bg-gold" />
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-4xl leading-tight text-cream md:text-5xl">
          Momentos en <span className="italic text-gold">Santa Renata</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Toca cualquier foto para verla en pantalla completa.
        </p>
      </RevealP>

      <div className="mt-14 columns-2 gap-4 md:columns-3">
        {galeria.map((g, i) => (
          <RevealP key={g.foto} delay={(i % 3) * 80} className="mb-4 break-inside-avoid">
            <button
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Ver ${g.caption} en grande`}
              className={`group relative block w-full cursor-zoom-in overflow-hidden rounded-[var(--radius)] border border-gold/10 ${aspects[i % aspects.length]} focus:outline-none focus-visible:ring-2 focus-visible:ring-gold`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.foto}
                alt={g.caption}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0705]/80 via-transparent to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-90" />
              <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-gold/50 bg-[#100b08]/40 text-gold opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                <Plus className="size-4" />
              </span>
              <span className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-left font-display text-lg italic text-cream opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                {g.caption}
              </span>
            </button>
          </RevealP>
        ))}
      </div>

      {open && actual ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={actual.caption}
          onClick={close}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0b0705]/95 p-6 backdrop-blur-md"
        >
          <Particles className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
          <button
            onClick={close}
            aria-label="Cerrar"
            className="absolute right-5 top-5 z-10 grid size-11 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:bg-cream/10"
          >
            <X className="size-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Anterior"
            className="absolute left-4 z-10 grid size-11 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:bg-cream/10 md:left-8"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Siguiente"
            className="absolute right-4 z-10 grid size-11 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:bg-cream/10 md:right-8"
          >
            <ChevronRight className="size-5" />
          </button>
          <figure
            key={idx}
            className="fade-up relative z-0 max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={actual.foto}
              alt={actual.caption}
              className="max-h-[80vh] w-auto rounded-[var(--radius)] object-contain shadow-2xl"
            />
            <figcaption className="mt-4 text-center font-display text-xl italic text-cream">
              {actual.caption}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </section>
  );
}
