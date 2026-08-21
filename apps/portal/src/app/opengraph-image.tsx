import { ImageResponse } from "next/og";

/**
 * Tarjeta de WhatsApp del portal del invitado.
 *
 * El enlace del portal viaja de invitado a invitado ("oye, aquí están las fotos"),
 * así que es el que MÁS se reenvía de toda la suite — y el que peor se veía: una
 * raya azul sin imagen, indistinguible de un enlace sospechoso. Mucha gente no
 * abre eso.
 *
 * NO lleva marca de salón: el portal es multi-cliente y un mismo despliegue
 * atiende todos los eventos, así que la imagen tiene que servirle a cualquiera.
 * La marca del salón sí se ve al ENTRAR (ver components/marca-salon.tsx).
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Portal del evento";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#111118",
          color: "#f4ede4",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 9,
            textTransform: "uppercase",
            color: "#c9a96e",
            display: "flex",
          }}
        >
          Portal del evento
        </div>

        <div
          style={{
            fontSize: 66,
            fontStyle: "italic",
            marginTop: 26,
            textAlign: "center",
            padding: "0 100px",
            lineHeight: 1.15,
            display: "flex",
          }}
        >
          Todo lo de la fiesta, en tu teléfono
        </div>

        <div style={{ width: 120, height: 1, background: "#c9a96e", margin: "36px 0", display: "flex" }} />

        <div
          style={{
            fontSize: 27,
            color: "rgba(244,237,228,0.8)",
            textAlign: "center",
            padding: "0 110px",
            display: "flex",
          }}
        >
          Tu mesa · Las fotos · La música · El muro de mensajes
        </div>
      </div>
    ),
    size,
  );
}
