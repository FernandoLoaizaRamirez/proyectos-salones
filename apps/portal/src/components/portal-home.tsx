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
import { BrandingScope, PieLegal, type BrandingSalon } from "@salones/ui";
import { tieneFuncion, codificarInvitadoEnlace } from "@salones/core";
import { ArrowUpRight, PartyPopper, SearchX } from "lucide-react";
import { MODULOS, enlaceModulo, esInterno } from "@/lib/modulos";
import { CapturaPerfil } from "@/components/captura-perfil";
import { HeroEvento } from "@/components/hero-evento";
import { MarcaSalon } from "@/components/marca-salon";
import { usePerfil } from "@/lib/perfil";
import type { ConfigEvento } from "@/lib/config-evento";

const CLASES_TARJETA =
  "group block rounded-[var(--radius)] border border-border bg-card p-5 transition hover:border-ring hover:shadow-sm";

export function PortalHome({ config }: { config: ConfigEvento }) {
  /*
   * La identidad para los PUENTES. Los módulos internos comparten el perfil por
   * localStorage, pero photobooth y brindis viven en otro dominio y allá ese
   * almacén no existe: la identidad viaja en el fragmento (#) del enlace, igual
   * que en el enlace personal del anfitrión — y el # nunca toca el servidor.
   * Llega tras montar (usePerfil arranca en null), así que los enlaces se
   * completan solos en cuanto se conoce el perfil.
   */
  const perfil = usePerfil(config.codigo);
  const hashPerfil = perfil
    ? `#${codificarInvitadoEnlace({ id: perfil.id ?? "", nombre: perfil.nombre, cupos: perfil.cupos ?? 1 })}`
    : "";
  // Enlace roto o código mal escrito: mejor decirlo claro que fingir un portal.
  if (config.estado === "no-encontrado") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">No encontramos este evento</h1>
        <p className="mt-2 text-muted-foreground">
          Revisa el enlace que te compartieron: puede que el código esté incompleto.
        </p>
      </main>
    );
  }

  const disponibles = MODULOS.filter((m) => tieneFuncion(config.entitlements, m.clave));
  const branding: BrandingSalon = config.branding ?? { nombre: config.nombre };

  return (
    <BrandingScope branding={branding} className="min-h-screen">
      <main className="mx-auto max-w-3xl px-6 py-14">
        {/* El enlace personal (#) se captura llegue por la puerta que llegue. */}
        <CapturaPerfil evento={config.codigo} />

        {/* La casa de quien organiza va PRIMERO: el invitado tiene que ver de
            quien es la fiesta antes que de quien es el software. */}
        <MarcaSalon branding={branding} salon={config.salon} />

        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <PartyPopper className="size-4" />
          Portal del evento
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{config.nombre}</h1>

        {/* El saludo personal y los datos reales del evento (cuenta regresiva). */}
        <HeroEvento evento={config.codigo} />

        <p className="mt-6 max-w-xl text-muted-foreground">
          Todo lo del evento, en un solo lugar. Elige una experiencia:
        </p>

        {disponibles.length > 0 ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {disponibles.map((m) => {
              const href = enlaceModulo(m, config.codigo);
              const interno = esInterno(m);
              const contenido = (
                <div className="flex items-center gap-4">
                  {/*
                   * El icono va en el color del SALON, no en un degradado propio.
                   * Antes cada modulo traia el suyo (from-amber-500, from-teal-500,
                   * from-fuchsia-500...): nueve degradados distintos en una sola
                   * pantalla, encima del color de la marca. Se veia a plantilla,
                   * justo lo contrario de lo que se vende. Lo que distingue a cada
                   * experiencia es su ICONO y su NOMBRE; el color es de la casa.
                   */}
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
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

              // Migrado → se queda en el portal. Aún no → puente a su app,
              // llevándose la identidad en el fragmento (los internos no la
              // necesitan: comparten el perfil por localStorage).
              return interno ? (
                <Link key={m.clave} href={href} className={CLASES_TARJETA}>
                  {contenido}
                </Link>
              ) : (
                <a
                  key={m.clave}
                  href={`${href}${hashPerfil}`}
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

        {config.estado === "demo" ? (
          <p className="mt-10 text-xs text-muted-foreground">
            Modo demostración: se muestran todas las experiencias. Al conectar el servicio, cada
            evento mostrará solo las que tenga contratadas.
          </p>
        ) : null}

        {/*
         * La portada del portal es la pantalla por la que pasa TODO invitado, y
         * hasta ahora era la única puerta que no llevaba a ninguna parte: el
         * aviso pegado al botón solo lo ve quien va a subir algo, y quien no
         * sube nada también sale en las fotos de los demás.
         */}
        <PieLegal />
      </main>
    </BrandingScope>
  );
}
