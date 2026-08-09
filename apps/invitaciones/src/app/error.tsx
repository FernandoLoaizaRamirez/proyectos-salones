"use client";

/**
 * Pantalla de rescate de esta app.
 *
 * Va con estilos EN LÍNEA y sin `@salones/ui` a propósito: esta app no depende
 * del paquete de interfaz, y añadirle la dependencia solo para esto tocaría el
 * lockfile. El texto y el tono son los mismos que en el resto de la suite.
 */
import * as React from "react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
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
          No pudimos mostrar esta pantalla. Suele arreglarse al intentarlo otra vez.
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
  );
}
