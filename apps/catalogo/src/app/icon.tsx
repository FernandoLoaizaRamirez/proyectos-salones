/**
 * El iconito de la pestaña del navegador. Se dibuja con código (la inicial del
 * proveedor sobre el rosa de la marca) para no depender de un archivo de
 * imagen: antes la pestaña salía con el icono en blanco y el sitio se veía sin
 * terminar.
 */
import { ImageResponse } from "next/og";
import { vendedor } from "@/lib/catalogo";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icono() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c026a3",
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 7,
          fontFamily: "sans-serif",
        }}
      >
        {vendedor.nombre.trim().slice(0, 1).toUpperCase()}
      </div>
    ),
    size,
  );
}
