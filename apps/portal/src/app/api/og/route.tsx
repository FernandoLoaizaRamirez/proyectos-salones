import { ImageResponse } from "next/og";
import { resolverConfigEvento } from "@/lib/config-evento";

/**
 * LA TARJETA DE WHATSAPP DE **ESTE** EVENTO.
 *
 * El enlace del portal viaja de invitado a invitado ("oye, aquí están las
 * fotos"): es el que MÁS se reenvía de toda la suite y la puerta por la que
 * más gente entra. Hasta ahora todos los eventos compartían una tarjeta
 * genérica; con esto cada boda enseña SU nombre, SU monograma y los colores de
 * SU salón. Es la primera impresión del producto, y ocurre fuera de él.
 *
 * Va como ruta (`/api/og?e=<codigo>`) y no como `opengraph-image.tsx` porque
 * el evento viaja en un parámetro de consulta (`?e=`), y las imágenes de
 * metadatos de Next se generan por RUTA, no por parámetro.
 *
 * SOBRE LOS COLORES: se admiten solo hex. Satori (el motor que dibuja esto)
 * no entiende todos los formatos que sí acepta el navegador —un `oklch(...)`
 * saldría negro—, así que lo que no sea hex cae a la paleta de la casa. Una
 * tarjeta con los colores por defecto se ve bien; una con un color que el
 * motor no entiende, no.
 */
export const alt = "Portal del evento";
export const contentType = "image/png";

const TAMANO = { width: 1200, height: 630 };

/** Paleta de respaldo: la de la casa (crema, vino, oro). */
const RESPALDO = { fondo: "#111118", tinta: "#f4ede4", acento: "#c9a96e" };

/** Solo hex: lo que Satori dibuja con seguridad. */
function hexODefecto(color: string | undefined, porDefecto: string): string {
  return color && /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color.trim())
    ? color.trim()
    : porDefecto;
}

const CODIGO_VALIDO = /^[a-z0-9-]{1,60}$/i;

export async function GET(request: Request) {
  const codigo = new URL(request.url).searchParams.get("e") ?? "demo";
  const config = await resolverConfigEvento(CODIGO_VALIDO.test(codigo) ? codigo : "demo");

  const { tema } = config;
  const acento = hexODefecto(tema.colores.acento, RESPALDO.acento);
  // El fondo de la tarjeta es SIEMPRE oscuro y elegante: una tarjeta de
  // WhatsApp compite con fondos blancos y grises del chat, y el crema del
  // tema claro se perdería contra ellos.
  const fondo = RESPALDO.fondo;
  const tinta = RESPALDO.tinta;

  const titulo = tema.evento?.nombre || config.nombre;
  const monograma = tema.evento?.monograma ?? "";
  const salon = tema.salon.nombre;

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
          background: fondo,
          color: tinta,
          fontFamily: "Georgia, serif",
          padding: 64,
          textAlign: "center",
        }}
      >
        {monograma ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 108,
              height: 108,
              borderRadius: 999,
              border: `2px solid ${acento}`,
              color: acento,
              fontSize: 40,
              marginBottom: 36,
            }}
          >
            {monograma}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 9,
            textTransform: "uppercase",
            color: acento,
          }}
        >
          {salon}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontStyle: "italic",
            marginTop: 24,
            lineHeight: 1.15,
          }}
        >
          {titulo}
        </div>

        <div style={{ display: "flex", fontSize: 26, marginTop: 28, opacity: 0.75 }}>
          Tu mesa, las fotos, la música y los mensajes
        </div>
      </div>
    ),
    TAMANO,
  );
}
