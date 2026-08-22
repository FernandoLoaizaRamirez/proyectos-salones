"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";
import { salon, puertaInvitado } from "@/lib/salon";
import { conVitrina, leerOInventarVitrina } from "@/lib/vitrina";

/**
 * LA PUERTA DEL INVITADO — el eslabón que faltaba entre la web y el evento.
 *
 * POR QUÉ EXISTE: hasta hoy el sitio del salón y el portal del invitado eran dos
 * islas. El sitio tenía UN solo enlace hacia afuera (WhatsApp) y no mencionaba
 * en ninguna parte que existieran el álbum, la invitación o el resto. Un salón
 * que veía su propia página no tenía forma de saber qué le estábamos vendiendo,
 * y un invitado que llegaba a la web el día del evento se topaba con un folleto.
 *
 * DE DÓNDE SALE LA IDEA: de Hummingbird Nest Ranch (California), el único de los
 * ocho salones de gama alta que revisamos que le habla al INVITADO en su portada
 * —y lo pone justo después del llamado de venta, no antes, para no estorbarle al
 * novio que sí viene a cotizar. Ellos usan ese espacio para dar indicaciones de
 * estacionamiento. Nosotros ponemos ahí las nueve experiencias del evento.
 *
 * DE DÓNDE SALEN SUS COLORES: de `.puerta`, en globals.css — no de los tokens
 * generales. Este componente es UNO SOLO para las dos versiones del sitio, y
 * cada tema le da a los mismos tokens un papel distinto, así que ninguno sirve
 * para las dos. `--wine` en la premium no es el vino: es #e0a0ad, un rosa claro
 * que allí hace de texto sobre negro (con `bg-wine text-cream` la sección salía
 * rosa pálido con letras crema: 1.13 de contraste, medido, ilegible). Y
 * `--primary` tampoco: en la premium es el ORO, y la sección quedaba como un
 * bloque de oro macizo, gritando mucho más que sus vecinas.
 *
 * Por eso `.puerta` declara su propia pareja fondo/texto por tema: franja de
 * vino en la clásica, fondo oscuro con filos y botón dorados en la premium.
 *
 * POR QUÉ VA AL FINAL: la página se lee de arriba abajo como un argumento de
 * venta (espacios → eventos → cifras → galería → paquetes → testimonios →
 * contacto). Meter la puerta del invitado antes rompería ese hilo: el visitante
 * de la portada NO es el invitado, es quien contrata. El invitado llega aquí
 * buscando, y buscar hasta abajo no le cuesta nada.
 */

// La dirección del portal se puede apuntar por variable de entorno (para probar
// contra uno local); si no, la publicada en producción. Mismo patrón que usan
// apps/invitaciones y apps/pases-qr, para no inventar una tercera forma.
const PORTAL_BASE =
  process.env.NEXT_PUBLIC_PORTAL_URL || "https://proyectos-salones-portal.vercel.app";

export function PuertaInvitado() {
  const [codigo, setCodigo] = React.useState("");
  const [error, setError] = React.useState("");

  /*
   * El código de vitrina de quien mira. Empieza en null A PROPÓSITO: en el
   * servidor no existe `localStorage`, y si el primer dibujado no coincidiera
   * con el del servidor, React se quejaría de la hidratación. Se rellena justo
   * después de montar, y hasta entonces el enlace apunta al demo pelado — que
   * es exactamente lo que había antes.
   */
  const [vitrina, setVitrina] = React.useState<string | null>(null);
  React.useEffect(() => {
    setVitrina(leerOInventarVitrina());
  }, []);

  const entrar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Los códigos viajan en papel y por WhatsApp: llegan con espacios de sobra y
    // con mayúsculas de teclado de celular. Se normaliza aquí y no en el portal
    // para que el invitado nunca vea un "evento no encontrado" por un espacio.
    const limpio = codigo.trim().toLowerCase();
    if (!limpio) {
      setError("Escribe el código que viene en tu invitación.");
      return;
    }
    setError("");
    window.location.href = `${PORTAL_BASE}/?e=${encodeURIComponent(limpio)}`;
  };

  return (
    <section id="invitados" className="puerta">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-28">
        <Reveal>
          {/*
           * Se repiten a mano las propiedades de `.eyebrow` en vez de usar la
           * clase: `.eyebrow` fija `color: var(--gold)` y le gana a la utilidad
           * de color. En la premium `--gold` ES el fondo de esta sección, así
           * que el antetítulo salía oro sobre oro — contraste 1.00, medido:
           * invisible. Aquí el color tiene que seguir al fondo, no al tema.
           */}
          <span className="flex items-center justify-center gap-3 font-sans text-xs uppercase tracking-[0.28em] text-[var(--puerta-sobre-75)]">
            <span className="h-px w-8 bg-[var(--puerta-sobre-40)]" />
            {puertaInvitado.eyebrow}
            <span className="h-px w-8 bg-[var(--puerta-sobre-40)]" />
          </span>

          <h2 className="mt-6 text-balance font-display text-4xl leading-tight md:text-5xl">
            {puertaInvitado.titulo}
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-[var(--puerta-sobre-80)]">{puertaInvitado.texto}</p>

          <form
            onSubmit={entrar}
            className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
            aria-label="Entrar al portal del evento"
          >
            <label htmlFor="pi-codigo" className="sr-only">
              Código de tu invitación
            </label>
            <input
              id="pi-codigo"
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder={puertaInvitado.ejemplo}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby={error ? "pi-error" : undefined}
              className="flex-1 rounded-full border border-[var(--puerta-sobre-30)] bg-[var(--puerta-sobre-10)] px-5 py-3 text-center text-sm text-[var(--puerta-sobre)] placeholder:text-[var(--puerta-sobre-50)] outline-none focus:border-[var(--puerta-realce)] focus:ring-2 focus:ring-[var(--puerta-sobre-30)] sm:text-left"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-full bg-[var(--puerta-realce)] px-6 py-3 text-sm font-medium text-[var(--puerta-realce-fg)] transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--puerta-sobre-50)] focus:ring-offset-2 focus:ring-offset-[var(--puerta-fondo)]"
            >
              Entrar <ArrowRight className="size-4" />
            </button>
          </form>

          {error ? (
            <p id="pi-error" role="alert" className="mt-3 text-sm font-medium text-[var(--puerta-realce)]">
              {error}
            </p>
          ) : null}

          <p className="mt-8 text-sm text-[var(--puerta-sobre-75)]">
            ¿No tienes código?{" "}
            <a
              href={conVitrina(PORTAL_BASE, vitrina)}
              className="underline decoration-[var(--puerta-sobre-50)] underline-offset-4 transition-opacity hover:opacity-80"
            >
              Mira cómo se ve por dentro
            </a>
          </p>

          <p className="mt-2 text-xs text-[var(--puerta-sobre-80)]">
            Las experiencias que verás dependen de lo que haya contratado quien organiza tu evento en{" "}
            {salon.nombre}.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
