/**
 * EL PUENTE AL PORTAL DEL EVENTO.
 *
 * Antes esta invitación no enlazaba nada a propósito: se vende sola, sin dar
 * por hecho lo que no se contrató. El puente existe ahora porque la
 * experiencia CONECTADA es el producto — la invitación es la puerta y el
 * portal es la fiesta — y enlazarlo no regala nada: el portal ya esconde solo
 * lo no contratado (entitlements), así que cada evento enseña exactamente lo
 * suyo.
 *
 * Si el invitado llegó con su enlace personal, su identidad viaja al portal en
 * el `#` (que nunca toca el servidor): allá lo saludan por su nombre sin
 * volver a preguntarle quién es.
 */
import { codificarInvitadoEnlace, type InvitadoEnlace } from "@salones/core";
import { Rincon } from "./botanica";

// La dirección del portal se puede apuntar por variable de entorno (para
// probar contra uno local); si no, la publicada en producción.
const PORTAL_BASE =
  process.env.NEXT_PUBLIC_PORTAL_URL || "https://proyectos-salones-portal.vercel.app";

export function Portal({
  codigo,
  invitado,
}: {
  codigo: string;
  invitado: InvitadoEnlace | null;
}) {
  // En la muestra el botón lleva al portal demo tal cual (sin `?e=`): la
  // vitrina enseña la vitrina. En un evento real el enlace carga su código y,
  // si hay enlace personal, la identidad va en el fragmento.
  const href =
    codigo === "demo"
      ? PORTAL_BASE
      : `${PORTAL_BASE}/?e=${codigo}${invitado ? `#${codificarInvitadoEnlace(invitado)}` : ""}`;

  return (
    <section id="portal" className="compacta">
      <Rincon donde="id" />
      <div className="env">
        <div className="caja rev">
          <p className="eyebrow">Esto no termina aquí</p>
          <h2 className="titulo">La fiesta sigue en tu teléfono</h2>
          <p className="texto">
            Las fotos de todos, la playlist de la noche, juegos y más: todo vive en el portal del
            evento.
          </p>
          <div className="acciones">
            <a className="btn solido" href={href} target="_blank" rel="noopener noreferrer">
              Abrir el portal del evento
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
