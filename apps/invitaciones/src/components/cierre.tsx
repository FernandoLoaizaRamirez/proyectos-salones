import {
  fechaCorta,
  nombresInvitacion,
  tituloInvitacion,
  type Invitacion,
} from "@salones/core";
import { Guarda } from "./botanica";

/** La despedida a toda pantalla y el pie. */
export function Cierre({ inv }: { inv: Invitacion }) {
  const foto = inv.fotoCierre || inv.fotoPortada;
  const esXV = inv.tipo === "xv";
  return (
    <>
      <section id="cierre">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img id="cierreFoto" src={foto} alt="" />
        ) : null}
        <div className="cierre-txt">
          <p className="eyebrow">
            {esXV ? "Gracias por ser parte de mi historia" : "Gracias por ser parte de nuestra historia"}
          </p>
          <p id="cierreNombre">{nombresInvitacion(inv) || tituloInvitacion(inv)}</p>
        </div>
      </section>

      <footer>
        <div className="env">
          <p id="pieNombre">{tituloInvitacion(inv)}</p>
          <p id="pieFecha">{[fechaCorta(inv.fechaISO), inv.ciudad].filter(Boolean).join(" · ")}</p>
          <Guarda id="guarda-pie" />
          <p className="firma">{inv.hashtag || "Invitación digital"}</p>
        </div>
      </footer>
    </>
  );
}
