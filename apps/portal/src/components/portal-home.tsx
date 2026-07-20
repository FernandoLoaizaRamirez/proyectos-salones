"use client";

/**
 * Cara del portal del evento: aplica el branding del salón y muestra las
 * experiencias (módulos) HABILITADAS para el evento.
 *
 * El filtrado usa el motor de core (`tieneFuncion`) sobre los entitlements ya
 * resueltos: una función apagada NO aparece. Los módulos ya migrados al portal
 * (p. ej. el muro) abren DENTRO; los que aún no, hacen de puente a su app actual.
 */
import Link from "next/link";
import { BrandingScope, type BrandingSalon } from "@salones/ui";
import { tieneFuncion } from "@salones/core";
import { ArrowUpRight, PartyPopper } from "lucide-react";
import { MODULOS, enlaceModulo, esInterno } from "@/lib/modulos";
import type { ConfigEvento } from "@/lib/config-evento";

const CLASES_TARJETA =
  "group block rounded-[var(--radius)] border border-border bg-card p-5 transition hover:border-ring hover:shadow-sm";

export function PortalHome({ config }: { config: ConfigEvento }) {
  const disponibles = MODULOS.filter((m) => tieneFuncion(config.entitlements, m.clave));
  const branding: BrandingSalon = config.branding ?? { nombre: config.nombre };

  return (
    <BrandingScope branding={branding} className="min-h-screen">
      <main className="mx-auto max-w-3xl px-6 py-14">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <PartyPopper className="size-4" />
          Portal del evento
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{branding.nombre}</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Todo lo del evento, en un solo lugar. Elige una experiencia:
        </p>

        {disponibles.length > 0 ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {disponibles.map((m) => {
              const href = enlaceModulo(m, config.codigo);
              const interno = esInterno(m);
              const contenido = (
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-gradient-to-br ${m.acento} text-white`}
                  >
                    <m.icono className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="flex items-center gap-1 font-semibold">
                      {m.nombre}
                      {interno ? null : (
                        <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-foreground" />
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground">{m.descripcion}</p>
                  </div>
                </div>
              );

              // Migrado → se queda en el portal. Aún no → puente a su app.
              return interno ? (
                <Link key={m.clave} href={href} className={CLASES_TARJETA}>
                  {contenido}
                </Link>
              ) : (
                <a
                  key={m.clave}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={CLASES_TARJETA}
                >
                  {contenido}
                </a>
              );
            })}
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground">
            Este evento aún no tiene experiencias activas.
          </p>
        )}
      </main>
    </BrandingScope>
  );
}
