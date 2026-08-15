"use client";

/**
 * LA INVITACIÓN, DE PRINCIPIO A FIN.
 *
 * El diseño es el de la plantilla "clásica" (acuarela botánica): tarjeta de
 * apertura, portada a pantalla completa, y de ahí hacia abajo las secciones
 * separadas por guardas florales que se van dibujando solas.
 *
 * Los datos son los que capturó el salón en su panel (ver `@/lib/cargar`), y
 * cada sección decide sola si se dibuja: una boda sin padrinos, sin mesa de
 * regalos o sin nota enseña una invitación más corta, no una con huecos.
 *
 * Lo que NO está aquí, y es a propósito: el ÁLBUM de fotos de los invitados y
 * el MURO de mensajes. Son productos aparte del catálogo, así que esta
 * invitación se vende y se usa sola, sin dar por hecho lo que no se contrató.
 * Lo que SÍ hay es un puente al portal del evento al final (ver
 * `@/components/portal`): el portal ya esconde solo lo no contratado, así que
 * enlazarlo no regala nada.
 *
 * Y si el invitado llegó con su ENLACE PERSONAL (su nombre y sus lugares en el
 * `#`), la invitación se vuelve suya: lo saluda por su nombre, le precarga el
 * RSVP y le dice en qué mesa va. Sin enlace personal, todo eso se esconde solo
 * y la página es idéntica a la de siempre.
 */
import * as React from "react";
import { tituloInvitacion } from "@salones/core";
import { Guarda } from "@/components/botanica";
import { Intro } from "@/components/intro";
import { Portada } from "@/components/portada";
import { Saludo, Cita, Conteo, Padres, Padrinos } from "@/components/bloques";
import { Recintos } from "@/components/recintos";
import { Itinerario } from "@/components/itinerario";
import { Vestimenta } from "@/components/vestimenta";
import { Regalos } from "@/components/regalos";
import { Nota } from "@/components/nota";
import { Rsvp } from "@/components/rsvp";
import { Cierre } from "@/components/cierre";
import { Musica } from "@/components/musica";
import { SaludoPersonal } from "@/components/invitado";
import { TuMesa } from "@/components/mesa";
import { Portal } from "@/components/portal";
import { useInvitacion } from "@/lib/cargar";
import { useInvitadoPersonal } from "@/lib/invitado";
import { useRevelados } from "@/lib/revelados";

export default function Page() {
  const estado = useInvitacion();
  const [abierta, setAbierta] = React.useState(false);
  const hayDatos = estado.fase === "lista" || estado.fase === "muestra";
  const inv = hayDatos ? estado.inv : null;

  // La identidad del enlace personal (si la hay) se lee aquí una sola vez y
  // baja por props: la usan el saludo, el RSVP, "Tu lugar" y el puente al portal.
  const invitado = useInvitadoPersonal(hayDatos ? estado.codigo : null);

  // "Tu lugar" avisa cuando ya está en el árbol (espera su lectura del acomodo).
  const [mesaLista, setMesaLista] = React.useState(false);
  const alAparecerMesa = React.useCallback(() => setMesaLista(true), []);

  // La señal repite el pase de revelado por las secciones que se montan tarde:
  // el saludo personal (espera el `#`) y "Tu lugar" (espera al servidor).
  useRevelados(hayDatos, `${invitado ? "p" : ""}${mesaLista ? "m" : ""}`);

  // El acento de CADA invitación. Se pone en la raíz —y no en un contenedor—
  // porque la tarjeta de apertura vive fuera del cuerpo de la página y también
  // tiene que ir del color del evento.
  React.useEffect(() => {
    if (!inv?.color) return;
    document.documentElement.style.setProperty("--magenta", inv.color);
  }, [inv?.color]);

  /*
   * EL TÍTULO DE LA PESTAÑA, con los nombres del evento.
   *
   * Se escribe a mano sobre `document.title` y NO como etiqueta `<title>` en el
   * árbol: Next ya pone la suya —la genérica, que es la que ven WhatsApp y los
   * buscadores cuando se comparte el enlace— y de las dos manda la primera de
   * la cabecera, que siempre es la suya. Comprobado en el navegador: con la
   * etiqueta quedaban tres títulos y ganaba el genérico.
   *
   * El repaso a los 300 ms es porque Next reescribe el título AL TERMINAR de
   * montar, después de este efecto; sin él, el nombre de la boda aparecía un
   * instante y se perdía.
   */
  React.useEffect(() => {
    if (!inv) return;
    const suyo = `${tituloInvitacion(inv)} · Invitación`;
    document.title = suyo;
    const t = window.setTimeout(() => {
      document.title = suyo;
    }, 300);
    return () => window.clearTimeout(t);
  }, [inv]);

  if (estado.fase === "cargando") {
    return (
      <main className="pantalla">
        <p className="solo-lectores">Cargando la invitación…</p>
      </main>
    );
  }

  if (estado.fase === "preparando") return <EnPreparacion />;
  if (!inv) return null;

  return (
    <>
      <div id="lienzo" aria-hidden="true" />
      <div id="grano" aria-hidden="true" />

      <Intro inv={inv} onAbrir={() => setAbierta(true)} />

      <main id="pagina">
        <Portada inv={inv} />
        <SaludoPersonal invitado={invitado} />
        <Saludo inv={inv} />
        <Guarda id="g1" />
        <Cita inv={inv} />
        <Conteo inv={inv} />
        <Padres inv={inv} />
        <Padrinos inv={inv} />
        <Guarda id="g2" />
        <Recintos inv={inv} />
        <Itinerario inv={inv} />
        <Guarda id="g3" />
        <Vestimenta inv={inv} />
        <Regalos inv={inv} />
        <Nota inv={inv} />
        <TuMesa codigo={estado.codigo} invitado={invitado} onAparece={alAparecerMesa} />
        <Rsvp inv={inv} codigo={estado.codigo} invitado={invitado} />
        <Portal codigo={estado.codigo} invitado={invitado} />
        <Cierre inv={inv} />
      </main>

      <Musica url={inv.musica} abierta={abierta} />
    </>
  );
}

/**
 * Hay evento, pero todavía no hay datos capturados.
 *
 * Aquí NO se enseña la invitación de muestra: los invitados de esta boda verían
 * los nombres de otra gente y la fecha equivocada. Mejor una portada sobria que
 * dice la verdad y no descubre nada de nadie.
 */
function EnPreparacion() {
  return (
    <>
      <div id="lienzo" aria-hidden="true" />
      <div id="grano" aria-hidden="true" />
      <main className="pantalla">
        <div>
          <p className="eyebrow">Invitación digital</p>
          <h1>Se está preparando</h1>
          <p>
            Esta invitación todavía no está lista. Guarda el enlace: en cuanto los anfitriones
            terminen de prepararla, la verás aquí mismo.
          </p>
        </div>
      </main>
    </>
  );
}
