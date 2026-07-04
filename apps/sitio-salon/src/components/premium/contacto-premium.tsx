import * as React from "react";
import { MapPin, Phone, Mail, Clock, AtSign } from "lucide-react";
import { salon } from "@/lib/salon";
import { RevealP } from "./reveal-premium";
import { ContactForm } from "../contact-form";

export function ContactoPremium() {
  return (
    <section id="contacto" className="relative overflow-hidden border-t border-gold/10 bg-[#0b0705]">
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-gold/5 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <RevealP className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold" />
            Contacto
            <span className="h-px w-8 bg-gold" />
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-4xl leading-tight text-cream md:text-5xl">
            Agenda tu <span className="italic text-gold">visita al recinto</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Cuéntanos de tu evento y con gusto te mostramos cada espacio en persona.
          </p>
        </RevealP>
        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <RevealP from="left">
            <div className="rounded-[var(--radius)] border border-border bg-card/40 p-6 md:p-8">
              <ContactForm />
            </div>
          </RevealP>

          <RevealP from="right" delay={100} className="h-full">
            <div className="grid gap-4">
              <Info
                icon={<MapPin className="size-5 text-gold" />}
                title="Ubicación"
                text={salon.direccion}
              />
              <Info
                icon={<Phone className="size-5 text-gold" />}
                title="Teléfono"
                text={salon.telefono}
              />
              <Info icon={<Mail className="size-5 text-gold" />} title="Correo" text={salon.email} />
              <Info
                icon={<Clock className="size-5 text-gold" />}
                title="Horario"
                text={salon.horario}
              />
              <Info
                icon={<AtSign className="size-5 text-gold" />}
                title="Instagram"
                text={"@" + salon.instagram}
              />
            </div>
          </RevealP>
        </div>
      </div>
    </section>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4 rounded-[var(--radius)] border border-border bg-card/50 p-4 transition-colors hover:border-gold/30">
      <span className="mt-0.5">{icon}</span>
      <div>
        <div className="text-sm font-medium text-cream">{title}</div>
        <div className="text-sm text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}
