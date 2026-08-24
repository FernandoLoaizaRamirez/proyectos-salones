/**
 * El BRINDIS en video, dentro de la cáscara compartida.
 *
 * Era la parada peor del recorrido: cabecera con el cuadrito "SR" quemado, el
 * nombre de OTRA boda ("Ana & Rodrigo" de la muestra) y un pie que decía "Demo
 * de Suite para Salones" — el nombre del proveedor delante del invitado. Todo
 * eso lo sustituye `CascaraEvento`, que trae la marca del salón de verdad y el
 * camino de regreso al evento.
 */
import { CascaraEvento } from "@salones/experiencia";
import { BrindisCliente } from "@/components/brindis-cliente";

export default function Page() {
  return (
    <CascaraEvento modulo="brindis" ancho="3xl">
      <h1 className="mb-8 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Brindis en video
      </h1>
      <div className="grid place-items-center">
        <BrindisCliente />
      </div>
      <p className="mx-auto mt-10 max-w-md text-center text-xs text-muted-foreground">
        Tu video se graba en tu teléfono y solo sale de él si pulsas “Enviar a los novios”:
        entonces se guarda en el álbum del evento, donde lo ven los anfitriones.
      </p>
    </CascaraEvento>
  );
}
