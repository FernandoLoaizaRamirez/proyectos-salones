import { Check } from "lucide-react";
import { paquetes } from "@/lib/salon";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

export function Paquetes() {
  return (
    <section id="paquetes" className="border-y border-border bg-cream/40">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <SectionHeading
          eyebrow="Paquetes"
          title={
            <>
              Experiencias a la <span className="italic text-wine">medida de tu evento</span>
            </>
          }
          intro="Tres formas de vivir Santa Renata. Cada paquete se personaliza contigo."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {paquetes.map((p, i) => (
            <Reveal key={p.nombre} delay={i * 90} className="h-full">
              <article
                className={`flex h-full flex-col rounded-[var(--radius)] border p-8 ${
                  p.destacado
                    ? "border-gold bg-card shadow-lg ring-1 ring-gold/30"
                    : "border-border bg-card"
                }`}
              >
                {p.destacado ? (
                  <span className="mb-4 self-start rounded-full bg-wine px-3 py-1 text-xs tracking-wide text-primary-foreground">
                    Más solicitado
                  </span>
                ) : null}
                <h3 className="font-display text-3xl">{p.nombre}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.resumen}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">desde</span>
                  <span className="font-display text-4xl text-wine">{p.precioDesde}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.incluye.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contacto"
                  className={`mt-8 rounded-[var(--radius)] px-5 py-3 text-center text-sm transition-opacity hover:opacity-90 ${
                    p.destacado
                      ? "bg-wine text-primary-foreground"
                      : "border border-wine/40 text-wine"
                  }`}
                >
                  Solicitar cotización
                </a>
              </article>
            </Reveal>
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
