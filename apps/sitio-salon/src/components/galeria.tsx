import { galeria } from "@/lib/salon";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { Photo } from "./photo";

export function Galeria() {
  return (
    <section id="galeria" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <SectionHeading
        eyebrow="Galería"
        title={
          <>
            Momentos en <span className="italic text-wine">Santa Renata</span>
          </>
        }
        intro="Un vistazo al recinto y a los detalles que hacen memorable cada evento."
      />
      <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3">
        {galeria.map((g, i) => (
          <Reveal key={g.foto} delay={(i % 3) * 60}>
            <Photo label={g.caption} src={g.foto} alt={g.caption} aspect="aspect-[4/5]" />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
