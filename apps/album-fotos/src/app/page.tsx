/**
 * El ÁLBUM del evento, dentro de la cáscara compartida.
 *
 * La cabecera propia (logo genérico + botón de claro/oscuro) y el pie con
 * "Demo de…" los sustituye `CascaraEvento`: marca del salón, menú de
 * experiencias, regreso al evento y el tema de la boda. El título ya no dice
 * el nombre del evento —lo lleva la cinta— para no repetirlo dos veces en la
 * misma pantalla.
 */
import { CascaraEvento } from "@salones/experiencia";
import { Album } from "@/components/album";
import { Compartir } from "@/components/compartir";
import { PanelAnfitrion } from "@/components/panel-anfitrion";

export default function Page() {
  return (
    <CascaraEvento modulo="album" ancho="5xl">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Álbum de fotos
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {/* "recuerdos" y no "fotos y videos": esta portada se pinta en el
              servidor, antes de saber si el evento tiene el paquete de video,
              y prometer videos que luego no se pueden subir sería peor que
              no nombrarlos. */}
          Sube tus recuerdos de la noche y míralos junto a los de todos.
        </p>
      </div>

      {/* Solo aparece para quien organiza; para un invitado no se dibuja nada. */}
      <div className="mb-8 space-y-4">
        <PanelAnfitrion />
        <Compartir />
      </div>

      <Album />
    </CascaraEvento>
  );
}
