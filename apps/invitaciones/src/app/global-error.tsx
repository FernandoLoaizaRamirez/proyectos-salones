"use client";

/** Último recurso: reventó el armazón. Sin hoja de estilos, todo en línea. */
import * as React from "react";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const boton: React.CSSProperties = {
    padding: "0.7rem 1.4rem",
    borderRadius: "0.6rem",
    border: "1px solid #d4d4d8",
    background: "#ffffff",
    color: "#18181b",
    font: "inherit",
    fontWeight: 600,
    cursor: "pointer",
  };
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#fafafa", color: "#18181b" }}>
  <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: "26rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Algo se atoró</h1>
        <p style={{ marginTop: "0.75rem", color: "#52525b", lineHeight: 1.6 }}>
          No pudimos cargar la aplicación. Vuelve a intentarlo; si sigue igual, abre otra vez el enlace que te pasaron.
        </p>
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          <button type="button" onClick={reset} style={boton}>
            Intentar de nuevo
          </button>
          <button type="button" onClick={() => window.location.reload()} style={boton}>
            Recargar
          </button>
        </div>
      </div>
    </div>
      </body>
    </html>
  );
}
