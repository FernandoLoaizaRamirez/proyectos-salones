"use client";

/**
 * LA TARJETA DE APERTURA.
 *
 * La invitación no empieza desplazándose: empieza cerrada, con el nombre, la
 * fecha y un botón. Es lo que le da el gesto de "abrir un sobre", y además
 * resuelve un problema real: los navegadores del teléfono no dejan sonar música
 * si el visitante no ha tocado nada. Ese toque es este botón.
 *
 * Mientras está puesta, el cuerpo lleva la clase `bloqueado` para que no se
 * pueda hacer scroll por debajo.
 */
import * as React from "react";
import { fechaPuntos, tituloInvitacion, type Invitacion } from "@salones/core";
import { MarcoIntro } from "./botanica";
import { dibujarAhora } from "@/lib/revelados";

export function Intro({ inv, onAbrir }: { inv: Invitacion; onAbrir: () => void }) {
  const [saliendo, setSaliendo] = React.useState(false);
  const [fuera, setFuera] = React.useState(false);
  const marco = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    document.body.classList.add("bloqueado");
    dibujarAhora(marco.current?.querySelector("#marcoIntro") ?? null);
    return () => document.body.classList.remove("bloqueado");
  }, []);

  const abrir = () => {
    setSaliendo(true);
    document.body.classList.remove("bloqueado");
    window.scrollTo(0, 0);
    onAbrir();
    // Se retira del todo cuando termina el fundido, no antes: si desapareciera
    // de golpe se vería el corte.
    window.setTimeout(() => setFuera(true), 900);
  };

  if (fuera) return null;

  const eyebrow = inv.tipo === "xv" ? "Mis XV Años" : "Nuestra Boda";

  return (
    <div id="intro" className={saliendo ? "fuera" : undefined} ref={marco}>
      <div className="tarjeta-intro">
        <MarcoIntro />
        <p className="intro-eyebrow">{eyebrow}</p>
        <p id="introNombre">{tituloInvitacion(inv)}</p>
        <p id="introFecha">{fechaPuntos(inv.fechaISO)}</p>
        <button id="btnAbrir" type="button" onClick={abrir}>
          Abrir invitación
        </button>
      </div>
    </div>
  );
}
