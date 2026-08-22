"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { Monograma } from "../monograma";
import { salon } from "@/lib/salon";

const enlaces = [
  { href: "#espacios", label: "Espacios" },
  { href: "#eventos", label: "Eventos" },
  { href: "#galeria", label: "Galería" },
  { href: "#paquetes", label: "Paquetes" },
  { href: "#contacto", label: "Contacto" },
  { href: "#invitados", label: "Invitados" },
];

/** Barra de navegación de la versión inmersiva: vidrio oscuro + acentos dorados. */
export function NavPremium() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-gold/15 bg-[#100b08]/80 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#inicio" className="flex items-center gap-3">
          <Monograma className="size-9 text-gold" />
          <span className="font-display text-xl italic leading-none text-cream">{salon.nombre}</span>
        </a>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          {enlaces.map((e) => (
            <a
              key={e.href}
              href={e.href}
              className="text-sm text-cream/85 transition-colors hover:text-gold"
            >
              {e.label}
            </a>
          ))}
          <a
            href="#contacto"
            className="rounded-[var(--radius)] border border-gold/70 bg-gold/10 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-[#17110d]"
          >
            Agenda tu visita
          </a>
        </nav>

        <button
          /* `-m-2 p-2`: mismo caso que la clasica, 24 px es muy poco para un dedo. */
          className="-m-2 p-2 text-cream md:hidden"
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-gold/15 bg-[#100b08]/95 px-6 py-4 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-4">
            {enlaces.map((e) => (
              <a
                key={e.href}
                href={e.href}
                onClick={() => setOpen(false)}
                className="text-sm text-cream/85"
              >
                {e.label}
              </a>
            ))}
            <a
              href="#contacto"
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius)] bg-gold px-4 py-2 text-center text-sm text-[#17110d]"
            >
              Agenda tu visita
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
