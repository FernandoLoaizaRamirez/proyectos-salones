"use client";

import * as React from "react";
import { Particles } from "./particles";
import { Monograma } from "../monograma";
import { salon } from "@/lib/salon";

/** Intro animada (solo en la versión inmersiva): monograma + partículas, luego se desvanece. */
export function Preloader() {
  const [done, setDone] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setDone(true), reduce ? 300 : 1700);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setHidden(true), 750);
    return () => clearTimeout(t);
  }, [done]);

  if (hidden) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#1a120f] transition-opacity duration-700 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Particles className="absolute inset-0 h-full w-full opacity-70" />
      <div className="relative flex flex-col items-center gap-4">
        <Monograma className="pre-in size-20 text-gold" />
        <span
          className="pre-in font-display text-2xl italic text-cream/90"
          style={{ animationDelay: "0.15s" }}
        >
          {salon.nombre}
        </span>
        <span className="pre-line h-px w-24 bg-gold/60" />
      </div>
    </div>
  );
}
