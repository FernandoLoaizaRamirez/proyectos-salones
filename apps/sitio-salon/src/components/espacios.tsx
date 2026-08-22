import { Users } from "lucide-react";
import { espacios } from "@/lib/salon";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { Photo } from "./photo";

export function Espacios() {
  return (
    <section id="espacios" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeading
        eyebrow="Nuestros espacios"
        title={
          <>
            Cuatro escenarios, <span className="italic text-wine">una sola noche perfecta</span>
          </>
        }
        intro="Combina jardín, salón, terraza y capilla para diseñar la celebración a tu medida."
      />
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {espacios.map((e, i) => (
          <Reveal key={e.nombre} delay={i * 80} className="h-full">
            <article className="group h-full overflow-hidden rounded-[var(--radius)] border border-border bg-card">
              {/* Sin `label`: el nombre ya va como titulo de la tarjeta justo
                  debajo, y salia impreso DOS veces, una sobre la otra. */}
              <Photo src={e.foto} alt={e.nombre} aspect="aspect-[16/10]" framed={false} />
              <div className="p-6">
                {/* Apilado en celular: con un nombre de dos renglones el titulo
                    y la etiqueta dorada se encimaban. */}
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <h3 className="font-display text-2xl">{e.nombre}</h3>
                  <span className="eyebrow shrink-0">{e.etiqueta}</span>
                </div>
                <p className="mt-3 text-muted-foreground">{e.descripcion}</p>
                <p className="mt-4 flex items-center gap-2 text-sm text-wine">
                  <Users className="size-4" /> {e.capacidad}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
