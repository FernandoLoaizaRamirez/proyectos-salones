/**
 * "MI MESA": el invitado busca su nombre y descubre dónde se sienta.
 *
 * La cabecera propia y el pie con "Demo de…" los sustituye `CascaraEvento`:
 * marca del salón, menú de experiencias, regreso al evento y el tema de la
 * boda. El nombre del evento lo lleva la cinta, sacado del evento real.
 */
import { CascaraEvento } from "@salones/experiencia";
import { MiMesaCliente } from "@/components/mi-mesa-cliente";

export default function Page() {
  return (
    <CascaraEvento modulo="mesas" ancho="3xl">
      <h1 className="mb-8 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Encuentra tu mesa
      </h1>
      <div className="grid place-items-center">
        <MiMesaCliente />
      </div>
    </CascaraEvento>
  );
}
