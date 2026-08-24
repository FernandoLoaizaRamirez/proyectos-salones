/**
 * La pantalla del INVITADO de esta app, dentro de la cáscara compartida.
 *
 * La cabecera hecha a mano (con el cuadrito "SR" quemado y el botón de
 * claro/oscuro) la sustituye `CascaraEvento`: trae la marca del salón, el menú
 * de experiencias, el regreso al evento y el tema de la boda. El nombre del
 * evento ya no se pinta aquí — lo lleva la cinta, sacado del evento real.
 */
import { CascaraEvento } from "@salones/experiencia";
import { JugarCliente } from "@/components/jugar-cliente";

export default function JugarPage() {
  return (
    <CascaraEvento modulo="dinamicas" ancho="3xl">
      <h1 className="mb-8 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Dinámicas y juegos
      </h1>
      <JugarCliente />
    </CascaraEvento>
  );
}
