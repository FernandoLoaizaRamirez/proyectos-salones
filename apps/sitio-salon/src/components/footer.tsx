import { salon } from "@/lib/salon";
import { Monograma } from "./monograma";

const enlaces = [
  { href: "#espacios", label: "Espacios" },
  { href: "#eventos", label: "Eventos" },
  { href: "#galeria", label: "Galería" },
  { href: "#paquetes", label: "Paquetes" },
  { href: "#contacto", label: "Contacto" },
];

export function Footer() {
  return (
    <footer className="bg-[#241d1a] text-cream/80">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <Monograma className="size-10 text-gold" />
              <span className="font-display text-2xl italic text-cream">{salon.nombre}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-cream/60">
              {salon.lema}. {salon.ciudad}.
            </p>
          </div>
          <div>
            <h4 className="eyebrow">Explora</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {enlaces.map((e) => (
                <li key={e.href}>
                  <a href={e.href} className="transition-colors hover:text-gold">
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="eyebrow">Contacto</h4>
            <ul className="mt-4 space-y-2 text-sm text-cream/70">
              <li>{salon.direccion}</li>
              <li>{salon.telefono}</li>
              <li>{salon.email}</li>
              <li>@{salon.instagram}</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-cream/10 pt-6 text-xs text-cream/50 sm:flex-row">
          <span>
            © {salon.fundacion}–2026 {salon.nombre}. Sitio de demostración.
          </span>
          <span>Hecho con la suite Proyectos Salones</span>
        </div>
      </div>
    </footer>
  );
}
