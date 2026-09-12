"use client";

/**
 * LA CASA DEL EVENTO: la portada que abre el invitado.
 *
 * REDISEÑO (sep 2026) — el problema no era visual, era conceptual: la portada
 * viejita pintaba hasta 14 tarjetas iguales agrupadas en 3 rejillas ("Mi
 * asistencia", "Vive el evento", "Información"). Cada tarjeta era idéntica a
 * las demás — icono, nombre, descripción, flecha — y esa igualdad es
 * exactamente lo que hace que un invitado piense "esta boda tiene 14
 * aplicaciones" en vez de "estoy en la boda de Ana y Rodrigo".
 *
 * Ahora la portada cuenta la historia de LA FIESTA, no el índice del software:
 *
 *   marca del salón → portada del evento → ¿confirmaste? / tu pase y tu mesa
 *   → el gran día (cronograma + ubicación) → comparte tus momentos (álbum +
 *   photobooth) → vive la fiesta (música + juegos) → déjales algo (mensajes +
 *   brindis) → antes de venir (lugar + vestimenta + preguntas)
 *
 * Cada bloque decide SOLO si mostrarse (según lo contratado) y CUÁNDO
 * mostrarse (según la fase del evento — antes / cerca / hoy / después, ver
 * `faseDeEvento`): la vestimenta no le sirve a quien ya está en la fiesta, y
 * la trivia no le sirve a quien todavía falta un mes. Con 3 funciones
 * contratadas la portada es corta; con las 14, sigue siendo UNA historia.
 *
 * El menú "Explorar" de la cinta (antes "Experiencias") sigue siendo el índice
 * completo para quien ya conoce la casa y quiere saltar directo — pero ya no
 * es la puerta de entrada.
 */
import * as React from "react";
import Link from "next/link";
import {
  Aperture,
  BookHeart,
  Camera,
  CircleHelp,
  Gamepad2,
  ListMusic,
  MapPin,
  Shirt,
  Wine,
} from "lucide-react";
import {
  CintaExperiencia,
  PieExperiencia,
  TemaScope,
  buttonVariants,
  cn,
  type ExperienciaEnlace,
} from "@salones/ui";
import {
  FEATURES_CONOCIDAS as F,
  faseDeEvento,
  tieneFuncion,
  codificarInvitadoEnlace,
  type FaseEvento,
} from "@salones/core";
import { MODULOS, enlaceModulo, esInterno } from "@/lib/modulos";
import { CapturaPerfil } from "@/components/captura-perfil";
import { HeroEvento } from "@/components/hero-evento";
import { LoTuyo } from "@/components/lo-tuyo";
import { EventoNoEncontrado } from "@/components/pantallas";
import { usePerfil } from "@/lib/perfil";
import { apuntarActividad } from "@/lib/actividad";
import { useInvitacion } from "@/modulos/info/use-invitacion";
import { loQueSigue } from "@/modulos/info/lib";
import type { ConfigEvento } from "@/lib/config-evento";

const TITULO_SECCION = "font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight";

/** El enlace de un módulo del directorio, con el `#` del perfil si es un puente. */
function enlaceDe(clave: string, evento: string, hashPerfil: string): string {
  const m = MODULOS.find((x) => x.clave === clave);
  if (!m) return "#";
  const href = enlaceModulo(m, evento);
  return esInterno(m) ? href : `${href}${hashPerfil}`;
}

export function PortalHome({ config }: { config: ConfigEvento }) {
  const evento = config.codigo;
  /*
   * La identidad para los PUENTES. Los módulos internos comparten el perfil por
   * localStorage, pero photobooth y brindis viven en otro dominio y allá ese
   * almacén no existe: la identidad viaja en el fragmento (#) del enlace, igual
   * que en el enlace personal del anfitrión — y el # nunca toca el servidor.
   */
  const perfil = usePerfil(evento);
  const hashPerfil = perfil
    ? `#${codificarInvitadoEnlace({ id: perfil.id ?? "", nombre: perfil.nombre, cupos: perfil.cupos ?? 1 })}`
    : "";
  const sufijo = evento && evento !== "demo" ? `?e=${encodeURIComponent(evento)}` : "";

  // El reloj: en qué momento de la historia está esta fiesta. Arranca en
  // "antes" y se corrige tras montar — el servidor no sabe el día del
  // navegador, y decidirlo en el SSR desincronizaría la hidratación.
  const [ahora, setAhora] = React.useState<Date | null>(null);
  React.useEffect(() => setAhora(new Date()), []);
  const fechaEvento = config.fecha ?? config.tema.evento?.fechaISO ?? null;
  const fase = faseDeEvento(fechaEvento, ahora ?? new Date(0));

  // El latido: se abrió la portada de un evento real (0031 — cuenta, jamás
  // espía). Una vez por visita; las vitrinas se saltan solas en el helper.
  React.useEffect(() => {
    apuntarActividad(config.codigo, "portal");
  }, [config.codigo]);

  // Enlace roto o código mal escrito: mejor decirlo claro que fingir un portal.
  if (config.estado === "no-encontrado") return <EventoNoEncontrado />;

  const tiene = (clave: string) => tieneFuncion(config.entitlements, clave);

  // El menú "Explorar" de la cinta: el índice COMPLETO, para quien ya conoce
  // la casa. Sigue viniendo del directorio entero — no es lo que cuenta la
  // portada, es el atajo de quien vuelve.
  const disponibles = MODULOS.filter((m) => tiene(m.clave));
  const experiencias: ExperienciaEnlace[] = disponibles.map((m) => ({
    nombre: m.nombre,
    href: enlaceModulo(m, config.codigo),
    grupo: m.grupoNombre,
  }));

  return (
    <TemaScope tema={config.tema} className="flex min-h-screen flex-col">
      <CapturaPerfil evento={config.codigo} />

      <CintaExperiencia tema={config.tema} experiencias={experiencias} compartirUrl={enlaceParaCompartir(config.codigo)} />

      <main className="flex-1">
        <HeroEvento evento={config.codigo} tema={config.tema} fase={fase} />

        <div className="mx-auto w-full max-w-3xl px-6 py-14">
          <LoTuyo config={config} />

          {/*
           * EL DÍA DEL EVENTO EL ORDEN SE INVIERTE. El resto de la semana, el
           * cronograma manda (es lo que se está preparando); el día de la
           * fiesta, lo que manda es "¿qué hago ahora mismo": foto, canción,
           * trivia, mensaje" — el itinerario completo pierde su lugar de honor
           * y se vuelve una referencia compacta ("ahora sigue: X"), no una
           * lista para leer de arriba abajo.
           */}
          {fase === "hoy" ? (
            <>
              <BloqueComparteMomentos
                mostrar
                tieneAlbum={tiene(F.Album)}
                tienePhotobooth={tiene(F.Photobooth)}
                hrefAlbum={`/album${sufijo}`}
                hrefPhotobooth={enlaceDe(F.Photobooth, evento, hashPerfil)}
              />
              <BloqueViveLaFiesta
                mostrar
                tienePlaylist={tiene(F.Playlist)}
                tieneDinamicas={tiene(F.Dinamicas)}
                hrefPlaylist={`/playlist${sufijo}`}
                hrefDinamicas={`/dinamicas${sufijo}`}
              />
              <BloqueDejaAlgo
                fase={fase}
                tieneMuro={tiene(F.Muro)}
                tieneBrindis={tiene(F.Brindis)}
                tieneAlbum={tiene(F.Album)}
                hrefMuro={`/muro${sufijo}`}
                hrefBrindis={enlaceDe(F.Brindis, evento, hashPerfil)}
                hrefAlbum={`/album${sufijo}`}
              />
              <BloqueElGranDia evento={evento} sufijo={sufijo} mostrar={tiene(F.Cronograma)} compacto />
            </>
          ) : (
            <>
              <BloqueElGranDia evento={evento} sufijo={sufijo} mostrar={fase !== "despues" && tiene(F.Cronograma)} />

              <BloqueComparteMomentos
                mostrar={fase !== "despues"}
                tieneAlbum={tiene(F.Album)}
                tienePhotobooth={tiene(F.Photobooth)}
                hrefAlbum={`/album${sufijo}`}
                hrefPhotobooth={enlaceDe(F.Photobooth, evento, hashPerfil)}
              />

              <BloqueViveLaFiesta
                mostrar={fase === "cerca"}
                tienePlaylist={tiene(F.Playlist)}
                tieneDinamicas={tiene(F.Dinamicas)}
                hrefPlaylist={`/playlist${sufijo}`}
                hrefDinamicas={`/dinamicas${sufijo}`}
              />

              <BloqueDejaAlgo
                fase={fase}
                tieneMuro={tiene(F.Muro)}
                tieneBrindis={tiene(F.Brindis)}
                tieneAlbum={tiene(F.Album)}
                hrefMuro={`/muro${sufijo}`}
                hrefBrindis={enlaceDe(F.Brindis, evento, hashPerfil)}
                hrefAlbum={`/album${sufijo}`}
              />
            </>
          )}

          <BloqueAntesDeVenir
            evento={evento}
            sufijo={sufijo}
            mostrar={fase === "antes" || fase === "cerca"}
            tieneLugar={tiene(F.Lugar)}
            tieneVestimenta={tiene(F.Vestimenta)}
            tieneFaq={tiene(F.Faq)}
          />

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

/** Botón de acción, con la voz del salón (color de marca, no del módulo). */
function BotonAccion({
  href,
  icono: Icono,
  children,
  variante = "primary",
  externo = false,
}: {
  href: string;
  icono: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  variante?: "primary" | "outline";
  externo?: boolean;
}) {
  const clases = cn(buttonVariants({ variant: variante, size: "lg" }), "w-full sm:w-auto");
  const contenido = (
    <>
      <Icono className="size-4" /> {children}
    </>
  );
  return externo ? (
    <a href={href} className={clases}>
      {contenido}
    </a>
  ) : (
    <Link href={href} className={clases}>
      {contenido}
    </Link>
  );
}

/**
 * EL GRAN DÍA — el cronograma, contado como parte de la fiesta y no como una
 * app de "Cronograma" aislada. Cruza con la ubicación: el próximo momento
 * enlaza a cómo llegar, en vez de obligar a buscar esa información aparte.
 */
function BloqueElGranDia({
  evento,
  sufijo,
  mostrar,
  compacto = false,
}: {
  evento: string;
  sufijo: string;
  mostrar: boolean;
  /** El día de la fiesta: sin la lista completa, solo "ahora sigue" y los enlaces. */
  compacto?: boolean;
}) {
  const inv = useInvitacion(evento);
  const [ahora, setAhora] = React.useState<Date | null>(null);
  React.useEffect(() => setAhora(new Date()), []);

  if (!mostrar || inv === "cargando" || !inv || inv.itinerario.length === 0) return null;

  const sigue = ahora ? loQueSigue(inv, ahora) : null;
  const proximos = inv.itinerario.slice(0, 3);
  const sede = inv.recepcion.lugar || inv.recepcion.direccion ? inv.recepcion : inv.ceremonia;

  return (
    <section className="mt-12">
      <h2 className={TITULO_SECCION}>El gran día</h2>
      {sigue ? (
        <p className="mt-1 text-sm font-medium text-primary">
          {sigue.yaEmpezo ? "Ahora sigue" : "Empieza con"}: {sigue.momento.titulo} · {sigue.momento.hora}
        </p>
      ) : null}

      {compacto ? null : (
        <ol className="mt-5 space-y-3">
          {proximos.map((m) => (
            <li key={`${m.hora}-${m.titulo}`} className="flex items-baseline gap-4 text-sm">
              <span className="w-16 shrink-0 font-medium tabular-nums text-primary">{m.hora}</span>
              <span className="min-w-0 flex-1">{m.titulo}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link href={`/cronograma${sufijo}`} className="font-medium text-primary hover:underline">
          Ver el plan completo →
        </Link>
        {sede.lugar ? (
          <Link
            href={`/lugar${sufijo}`}
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <MapPin className="size-3.5" /> {sede.lugar}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** COMPARTE TUS MOMENTOS — álbum y photobooth, una sola invitación. */
function BloqueComparteMomentos({
  mostrar,
  tieneAlbum,
  tienePhotobooth,
  hrefAlbum,
  hrefPhotobooth,
}: {
  mostrar: boolean;
  tieneAlbum: boolean;
  tienePhotobooth: boolean;
  hrefAlbum: string;
  hrefPhotobooth: string;
}) {
  if (!mostrar || (!tieneAlbum && !tienePhotobooth)) return null;
  return (
    <section className="mt-12">
      <h2 className={TITULO_SECCION}>Comparte tus momentos</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {tieneAlbum && tienePhotobooth
          ? "Sube tus fotos, o tómate una especial en el photobooth — las dos terminan en el mismo álbum."
          : tieneAlbum
            ? "Sube tus fotos de la noche, junto a las de todos los invitados."
            : "Tómate una foto especial con los marcos del evento."}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {tieneAlbum ? (
          <BotonAccion href={hrefAlbum} icono={Camera}>
            Subir una foto
          </BotonAccion>
        ) : null}
        {tienePhotobooth ? (
          <BotonAccion href={hrefPhotobooth} icono={Aperture} variante="outline" externo>
            Abrir el photobooth
          </BotonAccion>
        ) : null}
      </div>
    </section>
  );
}

/** VIVE LA FIESTA — música y juegos, lo que está pasando ahora mismo. */
function BloqueViveLaFiesta({
  mostrar,
  tienePlaylist,
  tieneDinamicas,
  hrefPlaylist,
  hrefDinamicas,
}: {
  mostrar: boolean;
  tienePlaylist: boolean;
  tieneDinamicas: boolean;
  hrefPlaylist: string;
  hrefDinamicas: string;
}) {
  if (!mostrar || (!tienePlaylist && !tieneDinamicas)) return null;
  return (
    <section className="mt-12">
      <h2 className={TITULO_SECCION}>Vive la fiesta</h2>
      <p className="mt-2 text-sm text-muted-foreground">Lo que está pasando ahora, desde tu teléfono.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {tienePlaylist ? (
          <BotonAccion href={hrefPlaylist} icono={ListMusic}>
            Pedir una canción
          </BotonAccion>
        ) : null}
        {tieneDinamicas ? (
          <BotonAccion href={hrefDinamicas} icono={Gamepad2} variante="outline">
            Jugar trivia y dinámicas
          </BotonAccion>
        ) : null}
      </div>
    </section>
  );
}

/** DÉJALES ALGO — muro y brindis fundidos en un solo recuerdo para los novios. */
function BloqueDejaAlgo({
  fase,
  tieneMuro,
  tieneBrindis,
  tieneAlbum,
  hrefMuro,
  hrefBrindis,
  hrefAlbum,
}: {
  fase: FaseEvento;
  tieneMuro: boolean;
  tieneBrindis: boolean;
  tieneAlbum: boolean;
  hrefMuro: string;
  hrefBrindis: string;
  hrefAlbum: string;
}) {
  const despues = fase === "despues";
  if (!tieneMuro && !tieneBrindis && !(despues && tieneAlbum)) return null;

  return (
    <section className="mt-12">
      <h2 className={TITULO_SECCION}>{despues ? "Los recuerdos de este día" : "Déjales algo"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {despues
          ? "Las fotos, los mensajes y los brindis de todos, en un solo lugar."
          : "Un mensaje, un brindis en video — lo que quieras dejarles."}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {despues && tieneAlbum ? (
          <BotonAccion href={hrefAlbum} icono={Camera}>
            Ver el álbum
          </BotonAccion>
        ) : null}
        {tieneMuro ? (
          <BotonAccion href={hrefMuro} icono={BookHeart} variante={despues ? "outline" : "primary"}>
            {despues ? "Leer los mensajes" : "Escribir un mensaje"}
          </BotonAccion>
        ) : null}
        {tieneBrindis ? (
          <BotonAccion href={hrefBrindis} icono={Wine} variante="outline" externo>
            {despues ? "Ver los brindis" : "Grabar un brindis"}
          </BotonAccion>
        ) : null}
      </div>
    </section>
  );
}

/** ANTES DE VENIR — lugar, vestimenta y preguntas, en un solo bloque editorial. */
function BloqueAntesDeVenir({
  evento,
  sufijo,
  mostrar,
  tieneLugar,
  tieneVestimenta,
  tieneFaq,
}: {
  evento: string;
  sufijo: string;
  mostrar: boolean;
  tieneLugar: boolean;
  tieneVestimenta: boolean;
  tieneFaq: boolean;
}) {
  const inv = useInvitacion(evento);
  if (!mostrar || (!tieneLugar && !tieneVestimenta && !tieneFaq)) return null;
  if (inv === "cargando") return null;

  const sede = inv ? (inv.recepcion.lugar || inv.recepcion.direccion ? inv.recepcion : inv.ceremonia) : null;

  return (
    <section className="mt-12 rounded-[var(--radius)] border border-border bg-card p-6 sm:p-8">
      <h2 className={TITULO_SECCION}>Antes de venir</h2>
      <p className="mt-2 text-sm text-muted-foreground">Todo lo que necesitas saber para el gran día.</p>

      {inv && (inv.vestimenta || sede?.lugar) ? (
        <ul className="mt-5 space-y-2 text-sm">
          {sede?.lugar ? (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" /> {sede.lugar}
            </li>
          ) : null}
          {inv.vestimenta ? (
            <li className="flex items-center gap-2">
              <Shirt className="size-4 shrink-0 text-primary" /> {inv.vestimenta}
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {tieneLugar ? (
          <Link href={`/lugar${sufijo}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
            <MapPin className="size-4" /> Cómo llegar
          </Link>
        ) : null}
        {tieneVestimenta ? (
          <Link href={`/vestimenta${sufijo}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
            <Shirt className="size-4" /> Código de vestimenta
          </Link>
        ) : null}
        {tieneFaq ? (
          <Link href={`/faq${sufijo}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
            <CircleHelp className="size-4" /> Preguntas frecuentes
          </Link>
        ) : null}
      </div>
    </section>
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
