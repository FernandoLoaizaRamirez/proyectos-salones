"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { Monograma } from "./monograma";
import { salon } from "@/lib/salon";

const enlaces = [
  { href: "#espacios", label: "Espacios" },
  { href: "#eventos", label: "Eventos" },
  { href: "#galeria", label: "Galería" },
  { href: "#paquetes", label: "Paquetes" },
  { href: "#contacto", label: "Contacto" },
];

export function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sobre la portada (sin scroll) el texto va claro; ya con scroll, oscuro.
  const light = !scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#inicio" className="flex items-center gap-3">
          <Monograma className={`size-9 ${light ? "text-gold" : "text-wine"}`} />
          <span
            className={`font-display text-xl italic leading-none ${light ? "text-cream" : "text-foreground"}`}
          >
            {salon.nombre}
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {enlaces.map((e) => (
            <a
              key={e.href}
              href={e.href}
              className={`text-sm transition-colors ${
                light ? "text-cream/90 hover:text-gold" : "text-foreground/80 hover:text-wine"
              }`}
            >
              {e.label}
            </a>
          ))}
          <a
            href="#contacto"
            className={`rounded-[var(--radius)] px-4 py-2 text-sm transition-opacity hover:opacity-90 ${
              light ? "bg-gold text-[#241d1a]" : "bg-wine text-primary-foreground"
            }`}
          >
            Agenda tu visita
          </a>
        </nav>

        <button
          className={`md:hidden ${light ? "text-cream" : "text-foreground"}`}
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-border bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {enlaces.map((e) => (
              <a key={e.href} href={e.href} onClick={() => setOpen(false)} className="text-sm">
                {e.label}
              </a>
            ))}
            <a
              href="#contacto"
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius)] bg-wine px-4 py-2 text-center text-sm text-primary-foreground"
            >
              Agenda tu visita
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
