"use client";

/**
 * DEMO de branding por salón (semilla de la Fase 3).
 *
 * Muestra cómo el tema de un salón —color, acento, redondeo y logo— se aplica
 * EN VIVO a una sección, sin recompilar, usando <BrandingScope> de @salones/ui.
 * Los datos son de EJEMPLO (todavía no vienen de la base de datos): cuando la
 * Fase 3 esté completa, este branding se leerá de `tenant_branding`.
 */
import * as React from "react";
import { Palette, Check } from "lucide-react";
import { Button, Card, BrandingScope, type BrandingSalon } from "@salones/ui";

/** Tema inicial de ejemplo. */
const TEMA_VINO: BrandingSalon = {
  nombre: "Hacienda Santa Renata",
  primario: "oklch(0.45 0.11 15)",
  primarioTexto: "oklch(0.98 0.01 90)",
  acento: "oklch(0.74 0.11 85)",
  radio: "0.4rem",
};

/** Un par de temas de ejemplo (colores, acento y redondeo). */
const TEMAS: { etiqueta: string; branding: BrandingSalon }[] = [
  { etiqueta: "Vino & Oro", branding: TEMA_VINO },
  {
    etiqueta: "Océano",
    branding: {
      nombre: "Salón Marea Azul",
      primario: "oklch(0.55 0.13 245)",
      primarioTexto: "oklch(0.99 0 0)",
      acento: "oklch(0.72 0.12 200)",
      radio: "1rem",
    },
  },
  {
    etiqueta: "Bosque",
    branding: {
      nombre: "Jardín Los Encinos",
      primario: "oklch(0.5 0.1 155)",
      primarioTexto: "oklch(0.99 0 0)",
      acento: "oklch(0.76 0.13 90)",
      radio: "1.5rem",
    },
  },
];

/** Opciones de redondeo de esquinas. */
const RADIOS: { etiqueta: string; valor: string }[] = [
  { etiqueta: "Cuadrado", valor: "0.25rem" },
  { etiqueta: "Suave", valor: "0.85rem" },
  { etiqueta: "Redondo", valor: "1.5rem" },
];

export function TarjetaPersonalizacion() {
  const [branding, setBranding] = React.useState<BrandingSalon>(TEMA_VINO);
  const inicial = branding.nombre.trim().slice(0, 1).toUpperCase() || "S";

  return (
    <Card className="mt-6 p-6">
      <div className="flex items-start gap-4">
        <Palette className="size-8 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Personalización</h2>
          <p className="text-sm text-muted-foreground">
            Vista previa del tema de un salón: color, esquinas y logo se aplican en vivo, sin
            recompilar. Datos de ejemplo (todavía no de la base).
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* -------- Controles -------- */}
        <div className="space-y-4">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Tema de ejemplo</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEMAS.map((t) => {
                const activo = t.branding.primario === branding.primario;
                return (
                  <button
                    key={t.etiqueta}
                    type="button"
                    onClick={() => setBranding(t.branding)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      activo ? "border-primary bg-muted" : "border-border hover:bg-muted"
                    }`}
                  >
                    <span
                      className="size-3 rounded-full"
                      style={{ background: t.branding.primario }}
                      aria-hidden
                    />
                    {t.etiqueta}
                    {activo ? <Check className="size-3.5 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="nombre-salon" className="text-xs font-medium text-muted-foreground">
              Nombre del salón
            </label>
            <input
              id="nombre-salon"
              type="text"
              value={branding.nombre}
              onChange={(e) => setBranding((b) => ({ ...b, nombre: e.target.value }))}
              className="mt-2 w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">Esquinas</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {RADIOS.map((r) => {
                const activo = r.valor === branding.radio;
                return (
                  <button
                    key={r.valor}
                    type="button"
                    onClick={() => setBranding((b) => ({ ...b, radio: r.valor }))}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      activo ? "border-primary bg-muted" : "border-border hover:bg-muted"
                    }`}
                  >
                    {r.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Colores:</span>
            <span
              className="size-5 rounded-full border border-border"
              style={{ background: branding.primario }}
              title="Primario"
            />
            <span
              className="size-5 rounded-full border border-border"
              style={{ background: branding.acento }}
              title="Acento"
            />
          </div>
        </div>

        {/* -------- Vista previa EN VIVO (adopta el branding) -------- */}
        <BrandingScope
          branding={branding}
          className="rounded-[var(--radius)] border border-border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-primary text-sm font-bold text-primary-foreground">
              {inicial}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{branding.nombre}</p>
              <p className="text-xs" style={{ color: "var(--accent, var(--muted-fg))" }}>
                Bodas · XV años · Eventos
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm">Reservar fecha</Button>
            <Button size="sm" variant="outline">
              Ver espacios
            </Button>
          </div>

          <div
            className="mt-4 rounded-[var(--radius)] border p-3"
            style={{ borderColor: "var(--accent, var(--border))" }}
          >
            <p className="text-sm font-medium">Paquete Distinción</p>
            <p className="text-xs text-muted-foreground">
              Todo se re-colorea con el tema del salón, en vivo.
            </p>
          </div>
        </BrandingScope>
      </div>
    </Card>
  );
}
