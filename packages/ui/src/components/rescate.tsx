"use client";

/**
 * PANTALLAS DE RESCATE — lo que ve alguien cuando algo se rompe.
 *
 * POR QUÉ EXISTEN (auditoría del 5 ago 2026):
 *   Ninguna de las 14 apps tenía `error.tsx` ni `not-found.tsx`. Cuando algo
 *   fallaba a media fiesta, el invitado se quedaba con la pantalla de rescate
 *   que trae Next: **en inglés, sin la marca del salón y sin decir qué hacer**.
 *   En una boda, delante de la gente, eso parece que el salón contrató algo roto.
 *
 * TRES CASOS, TRES PANTALLAS:
 *   · `PantallaError`        → algo reventó dentro de una pantalla (`error.tsx`).
 *     Deja reintentar sin recargar, que casi siempre basta.
 *   · `PantallaNoEncontrada` → la dirección no existe (`not-found.tsx`). En un
 *     evento suele ser un enlace mal copiado o un QR mal escaneado, así que el
 *     texto va por ahí y no por "error 404".
 *   · `PantallaErrorGrave`   → reventó el armazón de la app (`global-error.tsx`).
 *
 * ⚠️ `PantallaErrorGrave` va con estilos EN LÍNEA a propósito. `global-error`
 * sustituye al layout raíz, así que la hoja de estilos de la app NO se carga: si
 * usara clases de Tailwind, saldría un texto negro sin formato sobre blanco. Es
 * el único sitio del proyecto donde escribir estilos a mano es lo correcto.
 *
 * NINGUNA enseña el mensaje técnico del error. El invitado no puede hacer nada
 * con "TypeError: cannot read properties of undefined", y el rastro para
 * arreglarlo ya queda en el diagnóstico.
 */

import * as React from "react";
import { RotateCw, TriangleAlert, Compass } from "lucide-react";
import { Button } from "./button";

function Marco({
  icono,
  titulo,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 py-14">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
          {icono}
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}

/** `error.tsx` — algo falló dentro de una pantalla. */
export function PantallaError({ reset }: { reset: () => void }) {
  return (
    <Marco icono={<TriangleAlert className="size-7" />} titulo="Algo se atoró">
      <p className="mt-2 text-muted-foreground">
        No pudimos mostrar esta pantalla. Suele arreglarse al intentarlo otra vez; tu contenido no se
        ha perdido.
      </p>
      {/* Botones grandes (48 px): es una pantalla de rescate, se toca con prisa
          y con el teléfono en una mano. */}
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={reset} size="lg" className="w-full">
          <RotateCw className="size-4" /> Intentar de nuevo
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          Recargar la página
        </Button>
      </div>
    </Marco>
  );
}

/** `not-found.tsx` — la dirección no existe. */
export function PantallaNoEncontrada({ inicio = "/" }: { inicio?: string }) {
  return (
    <Marco icono={<Compass className="size-7" />} titulo="Esta dirección no existe">
      <p className="mt-2 text-muted-foreground">
        Puede que el enlace esté incompleto o que el código del evento se haya copiado a medias.
        Vuelve a abrirlo desde el enlace o el QR que te pasaron.
      </p>
      <div className="mt-6">
        <a href={inicio}>
          <Button variant="outline" size="lg" className="w-full">
            Ir al inicio
          </Button>
        </a>
      </div>
    </Marco>
  );
}

/**
 * `global-error.tsx` — reventó el armazón. Estilos EN LÍNEA: aquí no hay hoja de
 * estilos (ver la nota de arriba).
 */
export function PantallaErrorGrave({ reset }: { reset: () => void }) {
  const boton: React.CSSProperties = {
    display: "inline-block",
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
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        margin: 0,
        background: "#fafafa",
        color: "#18181b",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "26rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Algo se atoró</h1>
        <p style={{ marginTop: "0.75rem", color: "#52525b", lineHeight: 1.6 }}>
          No pudimos cargar la aplicación. Vuelve a intentarlo; si sigue igual, cierra y abre otra
          vez el enlace que te pasaron.
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
