import { Check } from "lucide-react";
import { paquetes } from "@/lib/salon";
import { RevealP } from "./reveal-premium";

export function PaquetesPremium() {
  return (
    <section id="paquetes" className="relative overflow-hidden border-y border-gold/10 bg-[#0d0906]">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <RevealP className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold" />
            Paquetes
            <span className="h-px w-8 bg-gold" />
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-4xl leading-tight text-cream md:text-5xl">
            Experiencias a la <span className="italic text-gold">medida de tu evento</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Tres formas de vivir Santa Renata. Cada paquete se personaliza contigo.
          </p>
        </RevealP>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {paquetes.map((p, i) => (
            <RevealP key={p.nombre} delay={i * 100} className="h-full">
              <article
                className={`relative flex h-full flex-col rounded-[var(--radius)] border p-8 transition-all duration-300 hover:-translate-y-1 ${
                  p.destacado
                    ? "gold-glow border-gold/60 bg-card lg:-translate-y-3 lg:scale-[1.02]"
                    : "border-border bg-card/50 hover:border-gold/30"
                }`}
              >
                {p.destacado ? (
                  <span className="mb-4 self-start rounded-full bg-gold px-3 py-1 text-xs tracking-wide text-[#17110d]">
                    Más solicitado
                  </span>
                ) : null}
                <h3 className="font-display text-3xl text-cream">{p.nombre}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.resumen}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">desde</span>
                  <span className="font-display text-4xl text-gold">{p.precioDesde}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.incluye.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-cream/85">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contacto"
                  className={`mt-8 rounded-[var(--radius)] px-5 py-3 text-center text-sm transition-transform duration-300 hover:scale-[1.02] ${
                    p.destacado
                      ? "bg-gold text-[#17110d]"
                      : "border border-gold/40 text-gold hover:bg-gold/10"
                  }`}
                >
                  Solicitar cotización
                </a>
              </article>
            </RevealP>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Precios de referencia en pesos mexicanos. La cotización final depende de la fecha, el
          número de invitados y los servicios elegidos.
        </p>
      </div>
    </section>
  );
}
