import type { Invitacion } from "@salones/core";
import { Rincon } from "./botanica";

/**
 * La línea de tiempo con medallones.
 *
 * Cada momento puede traer su propia foto. Si no la trae, se toma una de las
 * FOTOS DE REPUESTO por orden, y si tampoco hay, la de la portada: el diseño
 * cuenta con un círculo con foto a la izquierda de cada renglón, y una fila de
 * círculos vacíos se ve peor que repetir una foto bonita.
 */
export function Itinerario({ inv }: { inv: Invitacion }) {
  const momentos = inv.itinerario.filter((m) => m.titulo || m.hora);
  if (!momentos.length) return null;

  const repuesto = inv.fotos.filter(Boolean);
  let usadas = 0;
  const fotoDe = (propia: string): string => {
    if (propia) return propia;
    if (repuesto.length) return repuesto[usadas++ % repuesto.length] ?? "";
    return inv.fotoPortada;
  };

  return (
    <section id="itinerario">
      <Rincon donde="si" />
      <div className="env">
        <div className="centro">
          <p className="eyebrow rev">Momento a momento</p>
          <h2 className="titulo rev">Itinerario</h2>
        </div>
        <ol className="linea">
          {momentos.map((m, i) => {
            const foto = fotoDe(m.foto);
            return (
              <li className="rev" key={`${m.titulo}-${i}`}>
                <span className="medallon">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto} alt="" loading="lazy" />
                  ) : null}
                </span>
                {m.hora ? <p className="hora">{m.hora}</p> : null}
                {m.titulo ? <h3>{m.titulo}</h3> : null}
                {m.detalle ? <p>{m.detalle}</p> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
