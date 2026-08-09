/** Dirección que no existe: casi siempre, un enlace copiado a medias. */
import Link from "next/link";

export default function NoEncontrado() {
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
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Esta dirección no existe
        </h1>
        <p style={{ marginTop: "0.75rem", color: "#52525b", lineHeight: 1.6 }}>
          Puede que el enlace esté incompleto. Vuelve a abrirlo desde el enlace o el QR que te
          pasaron.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/" style={{ color: "#18181b", fontWeight: 600 }}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
