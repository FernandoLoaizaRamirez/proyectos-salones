"use client";

import * as React from "react";
import {
  Aperture,
  Armchair,
  ArrowRight,
  BookHeart,
  CalendarCheck,
  Camera,
  Gamepad2,
  ListMusic,
  Mail,
  Sparkles,
  Wine,
} from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { experienciaEventos, type Vivencia } from "@/lib/salon";
import { conVitrina, leerOInventarVitrina } from "@/lib/vitrina";

/**
 * "LA EXPERIENCIA DE TUS EVENTOS" — el argumento que vende lo que ningún
 * folleto de la competencia puede enseñar.
 *
 * POR QUÉ EXISTE: hasta ahora el sitio vendía el LUGAR (espacios, capacidad,
 * paquetes) y la única puerta hacia lo digital era la del invitado, al final,
 * pensada para quien YA tiene un código. Quien viene a cotizar —los novios, la
 * mamá de la quinceañera— no se enteraba de que existe todo esto. Esta sección
 * se lo cuenta ANTES de que decida, y le deja probarlo de un toque.
 *
 * DÓNDE VA Y POR QUÉ: cierra el argumento comercial y desemboca en la puerta
 * del invitado, que va justo debajo. Las dos son el bloque digital del sitio:
 * primero se vende la experiencia, luego se entra a ella.
 *
 * CÓMO SE VE EN LAS DOS VERSIONES: usa los tokens del sitio (`bg-card`,
 * `text-gold`, `border-border`), que la clase `.premium` redefine sola. Por eso
 * este componente es UNO para las dos versiones, sin CSS propio — a diferencia
 * de `puerta-invitado.tsx`, que sí necesitó su pareja fondo/texto porque pinta
 * una franja de color macizo.
 */

/** El icono de cada vivencia. El contenido guarda su NOMBRE, no el componente. */
const ICONOS: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  CalendarCheck,
  Armchair,
  Camera,
  BookHeart,
  ListMusic,
  Aperture,
  Gamepad2,
  Wine,
};

const PORTAL_BASE =
  process.env.NEXT_PUBLIC_PORTAL_URL || "https://proyectos-salones-portal.vercel.app";

export function ExperienciaEventos() {
  /*
   * El código de vitrina de quien mira, igual que en la puerta del invitado:
   * empieza en null porque en el servidor no existe `localStorage`, y se
   * rellena tras montar. Hasta entonces el botón lleva al demo pelado — que es
   * exactamente lo que había antes.
   *
   * IMPORTA que lleve vitrina: `?e=demo` (la compartida) se enseña VACÍA a
   * propósito, y un salón que pulsa "Vive la experiencia" y encuentra un muro
   * sin mensajes se lleva justo la impresión contraria a la que se busca.
   */
  const [vitrina, setVitrina] = React.useState<string | null>(null);
  React.useEffect(() => {
    setVitrina(leerOInventarVitrina());
  }, []);

  return (
    <section id="experiencia" className="bg-muted/40 py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            eyebrow={experienciaEventos.eyebrow}
            title={experienciaEventos.titulo}
            intro={experienciaEventos.texto}
          />
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {experienciaEventos.vivencias.map((v: Vivencia, i: number) => {
            const Icono = ICONOS[v.icono] ?? Sparkles;
            return (
              <Reveal key={v.titulo} delay={i * 60}>
                {/* h-full: las celdas de la retícula se estiran parejas aunque
                    un texto ocupe dos líneas y otro tres. */}
                <div className="flex h-full flex-col gap-3 bg-card p-6">
                  <Icono className="size-5 text-gold" />
                  <h3 className="font-display text-xl leading-tight">{v.titulo}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{v.texto}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-14 flex flex-col items-center gap-4 text-center">
            <a
              href={conVitrina(PORTAL_BASE, vitrina)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              {experienciaEventos.cta}
              <ArrowRight className="size-4" />
            </a>
            <p className="text-sm text-muted-foreground">{experienciaEventos.ctaNota}</p>
            <p className="max-w-md text-xs text-muted-foreground/80">
              {experienciaEventos.nota}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
