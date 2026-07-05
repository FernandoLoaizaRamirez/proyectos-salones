import { MapPin, Clock } from "lucide-react";
import { invitacion } from "@/lib/invitacion";
import { Reveal } from "./reveal";

export function Detalles() {
  const lugares = [invitacion.ceremonia, invitacion.recepcion];
  return (
    <section id="detalles" className="border-y border-border bg-background">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-28">
        <Reveal className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold" />
            Detalles
            <span className="h-px w-8 bg-gold" />
          </p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Cuándo y dónde</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {lugares.map((e, i) => (
            <Reveal key={e.titulo} delay={i * 100}>
              <div className="flex h-full flex-col items-center rounded-[var(--radius)] border border-border bg-card p-8 text-center">
                <h3 className="font-display text-2xl italic text-gold">{e.titulo}</h3>
                <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4 text-sage" /> {e.hora}
                </p>
                <p className="mt-4 font-display text-xl">{e.lugar}</p>
                <p className="mt-1 text-sm text-muted-foreground">{e.direccion}</p>
                <a
                  href={e.mapa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/60 px-5 py-2.5 text-sm text-gold transition-colors hover:bg-gold hover:text-white"
                >
                  <MapPin className="size-4" /> Cómo llegar
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
