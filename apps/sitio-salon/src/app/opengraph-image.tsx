import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { salon } from "@/lib/salon";

/**
 * LA TARJETA DE WHATSAPP — lo que se ve cuando alguien pega la liga del salón.
 *
 * POR QUÉ IMPORTA MÁS DE LO QUE PARECE: en México el salón NO manda su web por
 * correo ni la pone en un anuncio; la pega en un WhatsApp. Hasta hoy el <head>
 * del sitio traía solo charset, viewport, el title y la descripción — ni una
 * imagen. Resultado: la liga salía pelona, una raya azul sin foto, exactamente
 * igual que un enlace sospechoso. Para una página que se vende como la cara
 * pública del salón, ese era el peor lugar donde ahorrar.
 *
 * SE DIBUJA, NO SE FOTOGRAFÍA: la tarjeta se genera con la paleta de la casa
 * (vino, oro, crema) y los datos de `salon.ts`. Así un cliente nuevo cambia un
 * archivo y su tarjeta de WhatsApp cambia sola — sin abrir Photoshop y sin que
 * nadie tenga que acordarse de exportar un PNG.
 *
 * LA FUENTE VIAJA CON EL REPO: en el servidor no existe ninguna fuente del
 * sistema —ni Georgia ni ninguna serif—, así que el nombre del salón salía en la
 * sans-serif por defecto, que es justo la letra que la marca NO usa. El archivo
 * está en `assets/` (ver el LEEME de esa carpeta) y no se descarga de internet:
 * es la misma Cormorant Garamond del sitio y no cambia nunca.
 *
 * Si la fuente no se pudiera leer, la tarjeta se dibuja igual con la de por
 * defecto. Una tarjeta con la letra equivocada es un detalle; una liga sin
 * tarjeta —que es lo que pasaría si esto lanzara— vuelve al problema original.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${salon.nombre} · ${salon.lema}`;

/** Lee la fuente de la marca. Devuelve `null` si no se puede (nunca lanza). */
async function fuenteDeLaMarca() {
  try {
    return await readFile(join(process.cwd(), "assets/CormorantGaramond-SemiBoldItalic.woff"));
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const fuente = await fuenteDeLaMarca();

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
          background: "#7a2e3b",
          color: "#f4ede4",
          fontFamily: fuente ? "Cormorant" : "serif",
          position: "relative",
        }}
      >
        {/* Marco dorado interior: el recurso más viejo de la papelería de gala. */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 32,
            right: 32,
            bottom: 32,
            border: "2px solid rgba(201,169,110,0.45)",
            display: "flex",
          }}
        />

        <div
          style={{
            fontSize: 26,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "#c9a96e",
            display: "flex",
          }}
        >
          {salon.ciudad}
        </div>

        <div
          style={{
            fontSize: 84,
            fontStyle: "italic",
            marginTop: 24,
            textAlign: "center",
            padding: "0 90px",
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          {salon.nombre}
        </div>

        <div
          style={{
            width: 120,
            height: 1,
            background: "#c9a96e",
            margin: "34px 0",
            display: "flex",
          }}
        />

        <div style={{ fontSize: 32, color: "rgba(244,237,228,0.85)", display: "flex" }}>
          {salon.lema}
        </div>

        <div
          style={{
            fontSize: 21,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(201,169,110,0.8)",
            marginTop: 46,
            display: "flex",
          }}
        >
          Bodas · XV años · Eventos de gala
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fuente
        ? [{ name: "Cormorant", data: fuente, weight: 600, style: "italic" as const }]
        : [],
    },
  );
}
