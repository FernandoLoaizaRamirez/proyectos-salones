"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { galeria } from "@/lib/salon";
import { SectionHeading } from "../section-heading";
import { Photo } from "../photo";
import { Parallax } from "./parallax";
import { Particles } from "./particles";

export function GaleriaPremium() {
  const [idx, setIdx] = React.useState<number | null>(null);
  const open = idx !== null;

  const close = React.useCallback(() => setIdx(null), []);
  const go = React.useCallback(
    (d: number) =>
      setIdx((i) => (i === null ? i : (i + d + galeria.length) % galeria.length)),
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
      <SectionHeading
        eyebrow="Galería"
        title={
          <>
            Momentos en <span className="italic text-wine">Santa Renata</span>
          </>
        }
        intro="Toca cualquier foto para verla en grande."
      />
      <div className="mt-14 grid grid-cols-2 items-start gap-4 md:grid-cols-3">
        {galeria.map((g, i) => (
          <Parallax key={g.foto} speed={i % 2 === 0 ? 0.1 : -0.06}>
            <button
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Ver ${g.caption} en grande`}
              className="block w-full cursor-zoom-in rounded-[var(--radius)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Photo label={g.caption} src={g.foto} alt={g.caption} aspect="aspect-[4/5]" />
            </button>
          </Parallax>
        ))}
      </div>

      {open && actual ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={actual.caption}
          onClick={close}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1a120f]/95 p-6 backdrop-blur-sm"
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
          <figure className="relative z-0 max-w-4xl" onClick={(e) => e.stopPropagation()}>
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
