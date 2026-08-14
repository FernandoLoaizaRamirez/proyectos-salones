import {
  enlaceCalendario,
  tituloInvitacion,
  type Invitacion,
  type Sede,
} from "@salones/core";
import { Rincon } from "./botanica";
import { IconoCalendario, IconoMapa, IconoReloj } from "./iconos";

/** ¿Esta sede se capturó? (una boda civil en el mismo salón solo tiene una) */
function hay(s: Sede): boolean {
  return Boolean(s.lugar || s.direccion);
}

function Recinto({ sede, inv }: { sede: Sede; inv: Invitacion }) {
  /*
   * Si el salón no pegó el enlace del mapa, se arma una búsqueda de Google Maps
   * con el nombre y la dirección. Es lo que hace el original, y acierta casi
   * siempre: el invitado prefiere una búsqueda razonable a un botón que no está.
   */
  const mapa =
    sede.mapa ||
    `https://maps.google.com/?q=${encodeURIComponent([sede.lugar, sede.direccion].filter(Boolean).join(" "))}`;

  const calendario = enlaceCalendario({
    titulo: `${sede.titulo || "Celebración"} · ${tituloInvitacion(inv)}`,
    fechaISO: inv.fechaISO,
    hora: sede.hora,
    lugar: sede.lugar,
    direccion: sede.direccion,
    detalles: `Invitación de ${tituloInvitacion(inv)}.`,
  });

  return (
    <article className="recinto rev d1">
      {sede.foto ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sede.foto} alt={sede.lugar} loading="lazy" />
        </figure>
      ) : null}
      <div className="cuerpo">
        {sede.titulo ? <p className="rol">{sede.titulo}</p> : null}
        {sede.lugar ? <h3>{sede.lugar}</h3> : null}
        {sede.direccion ? <p className="dir">{sede.direccion}</p> : null}
        {sede.hora ? (
          <p className="hora">
            <IconoReloj />
            <span>{sede.hora}</span>
          </p>
        ) : null}
        <div className="acciones">
          <a className="btn" href={mapa} target="_blank" rel="noopener noreferrer">
            <IconoMapa />
            Cómo llegar
          </a>
          {calendario ? (
            <a className="btn magenta" href={calendario} target="_blank" rel="noopener noreferrer">
              <IconoCalendario />
              Agregar a mi calendario
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function Recintos({ inv }: { inv: Invitacion }) {
  const sedes = [inv.ceremonia, inv.recepcion].filter(hay);
  if (!sedes.length) return null;
  return (
    <section id="recintos">
      <Rincon donde="sd" />
      <div className="env centro">
        <p className="eyebrow rev">Dónde y cuándo</p>
        <h2 className="titulo rev">La Celebración</h2>
        {sedes.map((s, i) => (
          <Recinto key={`${s.titulo}-${i}`} sede={s} inv={inv} />
        ))}
      </div>
    </section>
  );
}
