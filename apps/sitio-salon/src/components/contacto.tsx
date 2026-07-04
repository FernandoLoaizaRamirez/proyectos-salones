import * as React from "react";
import { MapPin, Phone, Mail, Clock, AtSign } from "lucide-react";
import { salon } from "@/lib/salon";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { ContactForm } from "./contact-form";

export function Contacto() {
  return (
    <section id="contacto" className="border-t border-border bg-cream/40">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <SectionHeading
          eyebrow="Contacto"
          title={
            <>
              Agenda tu <span className="italic text-wine">visita al recinto</span>
            </>
          }
          intro="Cuéntanos de tu evento y con gusto te mostramos cada espacio en persona."
        />
        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={100} className="h-full">
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
              <Info
                icon={<Mail className="size-5 text-gold" />}
                title="Correo"
                text={salon.email}
              />
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
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-4 rounded-[var(--radius)] border border-border bg-card p-4">
      <span className="mt-0.5">{icon}</span>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}
