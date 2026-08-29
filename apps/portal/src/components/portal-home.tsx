"use client";

/**
 * LA CASA DEL EVENTO: la portada que abre el invitado.
 *
 * No es un menú de aplicaciones — es la entrada a una celebración. Primero la
 * marca del salón (la cinta), luego la portada del evento (foto, monograma,
 * fecha, cuenta regresiva) y solo después "Nuestra celebración": las
 * experiencias que ese evento tiene contratadas, contadas como partes de la
 * fiesta y no como software.
 *
 * El filtrado usa el motor de core (`tieneFuncion`) sobre los entitlements ya
 * resueltos: una función apagada NO aparece. Los módulos ya migrados abren
 * DENTRO del portal; los que aún no, hacen de puente a su app actual.
 */
import * as React from "react";
import Link from "next/link";
import {
  CintaExperiencia,
  PieExperiencia,
  TemaScope,
  type ExperienciaEnlace,
} from "@salones/ui";
import { tieneFuncion, codificarInvitadoEnlace } from "@salones/core";
import { ArrowUpRight } from "lucide-react";
import { GRUPOS, MODULOS, enlaceModulo, esInterno } from "@/lib/modulos";
import { CapturaPerfil } from "@/components/captura-perfil";
import { HeroEvento } from "@/components/hero-evento";
import { LoTuyo } from "@/components/lo-tuyo";
import { EventoNoEncontrado } from "@/components/pantallas";
import { usePerfil } from "@/lib/perfil";
import { apuntarActividad } from "@/lib/actividad";
import type { ConfigEvento } from "@/lib/config-evento";

const CLASES_TARJETA =
  "group flex items-center gap-4 rounded-[var(--radius)] border border-border bg-card p-5 transition hover:border-ring hover:shadow-sm";

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

  // El latido: se abrió la portada de un evento real (0031 — cuenta, jamás
  // espía). Una vez por visita; las vitrinas se saltan solas en el helper.
  React.useEffect(() => {
    apuntarActividad(config.codigo, "portal");
  }, [config.codigo]);

  // Enlace roto o código mal escrito: mejor decirlo claro que fingir un portal.
  if (config.estado === "no-encontrado") return <EventoNoEncontrado />;

  const disponibles = MODULOS.filter((m) => tieneFuncion(config.entitlements, m.clave));
  const experiencias: ExperienciaEnlace[] = disponibles.map((m) => ({
    nombre: m.nombre,
    href: enlaceModulo(m, config.codigo),
    grupo: m.grupoNombre,
  }));

  /*
   * LAS SECCIONES DE LA CELEBRACIÓN. Con 9 tarjetas una rejilla corrida
   * aguantaba; con 14 ya no se navega. Se agrupa como se vive: lo tuyo antes
   * de la fiesta, la fiesta, y la información práctica. Una sección sin
   * módulos contratados simplemente no se pinta.
   */
  const secciones = GRUPOS.map((g) => ({
    ...g,
    modulos: disponibles.filter((m) => m.grupo === g.clave),
  })).filter((g) => g.modulos.length > 0);

  return (
    <TemaScope tema={config.tema} className="flex min-h-screen flex-col">
      {/* El enlace personal (#) se captura llegue por la puerta que llegue. */}
      <CapturaPerfil evento={config.codigo} />

      {/*
       * La marca del SALÓN va arriba del todo y enlaza a su web: el invitado
       * tiene que ver de quién es la fiesta antes que de quién es el software.
       * Aquí la cinta no lleva "volver" — esta pantalla YA es el evento.
       */}
      <CintaExperiencia tema={config.tema} experiencias={experiencias} compartirUrl={enlaceParaCompartir(config.codigo)} />

      <main className="flex-1">
        <HeroEvento evento={config.codigo} tema={config.tema} />

        <div className="mx-auto w-full max-w-3xl px-6 py-14">
          {/* Lo personal primero: tu confirmación, tu mesa, lo que sigue. */}
          <LoTuyo config={config} />

          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Nuestra celebración
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Todo lo del evento, en un solo lugar. Elige por dónde empezar.
          </p>

          {secciones.length > 0 ? (
            secciones.map((seccion) => (
              <section key={seccion.clave} className="mt-8">
                <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  {seccion.nombre}
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {seccion.modulos.map((m) => {
                    const href = enlaceModulo(m, config.codigo);
                    const interno = esInterno(m);
                    const contenido = (
                      <>
                        {/*
                         * El icono va en el color del SALÓN, no en un degradado
                         * propio. Antes cada módulo traía el suyo (from-amber-500,
                         * from-teal-500, from-fuchsia-500...): nueve degradados
                         * distintos en una sola pantalla, encima del color de la
                         * marca. Se veía a plantilla, justo lo contrario de lo que
                         * se vende. Lo que distingue a cada experiencia es su ICONO
                         * y su NOMBRE; el color es de la casa.
                         */}
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
                          <m.icono className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="flex items-center gap-1 font-medium">
                            {m.nombre}
                            {interno ? null : (
                              <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-foreground" />
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">{m.descripcion}</p>
                        </div>
                      </>
                    );

                    // Migrado → se queda en el portal. Aún no → puente a su app,
                    // llevándose la identidad en el fragmento. En la MISMA pestaña:
                    // la cinta de allá ya trae el camino de vuelta, y abrir pestañas
                    // nuevas es la señal más fuerte de "esto es otra aplicación".
                    return interno ? (
                      <Link key={m.clave} href={href} className={CLASES_TARJETA}>
                        {contenido}
                      </Link>
                    ) : (
                      <a key={m.clave} href={`${href}${hashPerfil}`} className={CLASES_TARJETA}>
                        {contenido}
                      </a>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <p className="mt-8 text-sm text-muted-foreground">
              Las experiencias de este evento se están preparando.
            </p>
          )}

          {config.estado === "demo" ? (
            <p className="mt-12 text-center text-xs text-muted-foreground">
              Estás viendo una demostración con todas las experiencias encendidas.
            </p>
          ) : null}
        </div>
      </main>

      <div className="mx-auto w-full max-w-3xl">
        <PieExperiencia tema={config.tema} />
      </div>
    </TemaScope>
  );
}

/**
 * El enlace de ESTA celebración, para compartirlo entre invitados.
 *
 * Se arma con la dirección del despliegue y NO con `window.location`: el
 * portal se pinta primero en el servidor, y un enlace que solo existe en el
 * navegador haría que el botón de compartir apareciera después de hidratar
 * (React se queja y el botón parpadea).
 *
 * Ojo con lo que NO lleva: el fragmento (#) con la identidad personal del
 * invitado. Compartir "mi" enlace le pasaría al vecino mi nombre y mis cupos.
 */
function enlaceParaCompartir(codigo: string): string {
  const base = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://proyectos-salones-portal.vercel.app")
    .replace(/\/$/, "");
  return codigo && codigo !== "demo" ? `${base}/?e=${encodeURIComponent(codigo)}` : `${base}/`;
}
