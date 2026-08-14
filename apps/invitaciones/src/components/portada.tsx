import { fechaLarga, tituloInvitacion, type Invitacion } from "@salones/core";
import { IconoCorazon } from "./iconos";

/** La portada a pantalla completa: foto, nombres, fecha y ciudad. */
export function Portada({ inv }: { inv: Invitacion }) {
  const eyebrow = inv.tipo === "xv" ? "Mis XV Años" : "Nuestra Boda";
  return (
    <section id="portada" className={inv.fotoPortada ? undefined : "sin-foto"}>
      {inv.fotoPortada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img id="heroFoto" src={inv.fotoPortada} alt={`Retrato de ${tituloInvitacion(inv)}`} />
      ) : null}
      <div className="hero-txt">
        <p className="hero-eyebrow">{eyebrow}</p>
        <h1 id="heroNombre">{tituloInvitacion(inv)}</h1>
        <div className="hero-regla">
          <span />
          <IconoCorazon />
          <span />
        </div>
        <p id="heroFecha">{fechaLarga(inv.fechaISO)}</p>
        {inv.ciudad ? <p id="heroLugar">{inv.ciudad}</p> : null}
        <div className="flecha" aria-hidden="true" />
      </div>
    </section>
  );
}
