/**
 * La estampa que WhatsApp enseña cuando alguien manda el enlace del catálogo.
 *
 * Es lo PRIMERO que ve el dueño de un salón —antes de abrir nada—, así que
 * tiene que decir de qué se trata sin obligarlo a entrar. Se dibuja aquí con
 * código (no hay fotos de eventos reales todavía) y Next la genera al construir.
 */
import { ImageResponse } from "next/og";
import { vendedor } from "@/lib/catalogo";

export const alt = "Suite para Salones · apps para tu salón de eventos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Imagen() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #1a0b2e 0%, #2d1240 55%, #4a1d5c 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#e879b9",
              color: "#2d1240",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            {vendedor.nombre.trim().slice(0, 1).toUpperCase()}
          </div>
          <div style={{ fontSize: 30, opacity: 0.85 }}>{vendedor.nombre}</div>
        </div>

        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1 }}>
          Lo que hace que elijan
        </div>
        {/* `display: flex` obligatorio: el generador de imágenes de Next no
            acepta un div con más de un hijo sin él. */}
        <div
          style={{
            display: "flex",
            gap: 18,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1,
          }}
        >
          <span style={{ color: "#f0a3d0" }}>tu salón</span>
          <span>y no el de enfrente</span>
        </div>

        <div style={{ fontSize: 30, opacity: 0.8, marginTop: 36, lineHeight: 1.4 }}>
          Fotos, mensajes, canciones y juegos que tus invitados comparten
        </div>
        <div style={{ fontSize: 30, opacity: 0.8, lineHeight: 1.4 }}>
          con la pura cámara de su celular. Sin instalar nada.
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 46, fontSize: 25 }}>
          {["12 apps", "Demos que puedes probar", "Desde $500 por evento"].map((t) => (
            <div
              key={t}
              style={{
                border: "2px solid rgba(255,255,255,0.28)",
                borderRadius: 999,
                padding: "10px 26px",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
