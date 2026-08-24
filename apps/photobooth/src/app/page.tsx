/**
 * El PHOTOBOOTH, dentro de la cáscara compartida.
 *
 * La cabecera propia —con el cuadrito "SR" quemado, que seguía diciendo "SR"
 * aunque el salón se llamara de otra forma— la sustituye `CascaraEvento`:
 * marca del salón, menú de experiencias, regreso al evento y el tema de la
 * boda. Compartir también lo lleva ya la cinta.
 */
import { CascaraEvento } from "@salones/experiencia";
import { PhotoboothCliente, PieBooth } from "@/components/photobooth-cliente";

export default function Page() {
  return (
    <CascaraEvento modulo="photobooth" ancho="3xl">
      <h1 className="mb-8 text-center font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Photobooth
      </h1>
      <div className="grid place-items-center">
        <PhotoboothCliente />
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">
        <PieBooth />
      </p>
    </CascaraEvento>
  );
}
