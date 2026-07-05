import { invitacion } from "@/lib/invitacion";
import { Reveal } from "./reveal";

export function Vestimenta() {
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto grid max-w-4xl gap-10 px-6 py-24 md:grid-cols-2 md:py-28">
        <Reveal className="text-center md:text-left">
          <p className="eyebrow">Código de vestimenta</p>
          <p className="mt-3 font-display text-3xl italic">{invitacion.vestimenta}</p>
          <p className="mt-2 text-sm text-muted-foreground">{invitacion.vestimentaNota}</p>
        </Reveal>
        <Reveal delay={100} className="text-center md:text-left">
          <p className="eyebrow">Mesa de regalos</p>
          <p className="mt-3 leading-relaxed text-muted-foreground">{invitacion.regalos}</p>
        </Reveal>
      </div>
    </section>
  );
}
