/**
 * EL SALUDO DEL ENLACE PERSONAL.
 *
 * Solo se pinta cuando el invitado llegó con SU enlace (el que reparte el
 * anfitrión, con su nombre y sus lugares en el `#`): una tarjeta chica entre
 * la portada y el saludo general que convierte la invitación de "para todos"
 * en "para ti". Sin enlace personal devuelve `null` y la página queda idéntica
 * a como era: lo personal nunca deja hueco.
 */
import type { InvitadoEnlace } from "@salones/core";
import { Rincon } from "./botanica";

export function SaludoPersonal({ invitado }: { invitado: InvitadoEnlace | null }) {
  if (!invitado) return null;
  return (
    <section id="personal" className="compacta">
      <Rincon donde="si" />
      <div className="env">
        <div className="caja rev">
          <p className="eyebrow">Invitación especial para</p>
          <p id="personalNombre">{invitado.nombre}</p>
          <p className="texto">
            {/* Un cupo es una persona (se le habla de tú); varios suelen ser
                una familia o una pareja, y ahí el "su" queda natural. */}
            {invitado.cupos === 1
              ? "Hemos reservado un lugar en tu honor."
              : `Hemos reservado ${invitado.cupos} lugares en su honor.`}
          </p>
        </div>
      </div>
    </section>
  );
}
