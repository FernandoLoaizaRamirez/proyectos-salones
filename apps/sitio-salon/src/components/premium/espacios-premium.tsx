"use client";

import * as React from "react";
import { Users, ArrowUpRight } from "lucide-react";
import { espacios } from "@/lib/salon";
import { RevealP } from "./reveal-premium";

/**
 * Espacios como vitrina interactiva: al pasar el cursor (o tocar) un espacio,
 * la gran imagen cambia con un fundido suave y se actualiza la información.
 * Muy distinto de la cuadrícula estática de la versión clásica.
 */
export function EspaciosPremium() {
  const [active, setActive] = React.useState(0);
  const e = espacios[active]!;

  return (
    <section id="espacios" className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
      <RevealP>
        <p className="eyebrow flex items-center gap-3">
          <span className="h-px w-8 bg-gold" />
          Nuestros espacios
        </p>
        <h2 className="mt-4 max-w-2xl text-balance font-display text-4xl leading-tight text-cream md:text-5xl">
          Cuatro escenarios, <span className="italic text-gold">una sola noche perfecta</span>
        </h2>
      </RevealP>

      <div className="mt-14 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-stretch">
        {/* Imagen grande que cambia según el espacio activo */}
        <RevealP
          from="scale"
          className="relative min-h-[22rem] overflow-hidden rounded-[var(--radius)] border border-gold/15 lg:min-h-[32rem]"
        >
          {espacios.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.foto}
              src={s.foto}
              alt={s.nombre}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
                i === active ? "scale-100 opacity-100" : "scale-105 opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0705]/90 via-[#0b0705]/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <span className="eyebrow">{e.etiqueta}</span>
            <h3 className="mt-2 font-display text-3xl text-cream md:text-4xl">{e.nombre}</h3>
            <p className="mt-3 max-w-lg text-sm text-cream/80">{e.descripcion}</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-gold">
              <Users className="size-4" /> {e.capacidad}
            </p>
          </div>
        </RevealP>

        {/* Selector de espacios */}
        <div className="flex flex-col gap-3">
          {espacios.map((s, i) => (
            <button
              key={s.nombre}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`group flex items-center justify-between gap-4 rounded-[var(--radius)] border px-5 py-5 text-left transition-all duration-300 ${
                i === active
                  ? "border-gold/60 bg-gold/10"
                  : "border-border bg-card/40 hover:border-gold/30"
              }`}
            >
              <span>
                <span
                  className={`font-display text-xl transition-colors ${
                    i === active ? "text-gold" : "text-cream"
                  }`}
                >
                  {s.nombre}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{s.capacidad}</span>
              </span>
              <ArrowUpRight
                className={`size-5 shrink-0 transition-all duration-300 ${
                  i === active
                    ? "translate-x-0 text-gold opacity-100"
                    : "-translate-x-1 text-muted-foreground opacity-0 group-hover:opacity-70"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
