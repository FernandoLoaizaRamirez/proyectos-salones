"use client";

/**
 * BRANDING del salón en el panel (Fase 3).
 *
 * Lee el branding del salón desde la base (`tenant_branding`) y lo aplica EN
 * VIVO a una vista previa con <BrandingScope> de @salones/ui, sin recompilar. Si
 * la base no está disponible o el salón aún no tiene branding, cae a un tema de
 * EJEMPLO (degradación elegante). Los temas de abajo permiten probar otros al
 * vuelo (todavía NO se guardan).
 */
import * as React from "react";
import { Palette, Check, Loader2 } from "lucide-react";
import { Button, Card, BrandingScope, type BrandingSalon } from "@salones/ui";
import { obtenerBrandingSalon } from "@/lib/branding";

/** Tema de respaldo si la base no responde (degradación elegante). */
const TEMA_EJEMPLO: BrandingSalon = {
  nombre: "Hacienda Santa Renata",
  primario: "oklch(0.45 0.11 15)",
  primarioTexto: "oklch(0.98 0.01 90)",
  acento: "oklch(0.74 0.11 85)",
  radio: "0.4rem",
};

/** Temas para probar al vuelo (colores, acento y redondeo). */
const TEMAS: { etiqueta: string; branding: BrandingSalon }[] = [
  { etiqueta: "Vino & Oro", branding: TEMA_EJEMPLO },
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

/** Etiqueta que dice de dónde salió el branding: la base o un ejemplo. */
function FuenteBadge({ cargando, fuente }: { cargando: boolean; fuente: "base" | "ejemplo" }) {
  if (cargando) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Cargando marca…
      </span>
    );
  }
  if (fuente === "base") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-muted px-2 py-0.5 text-xs font-medium text-primary">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden /> Desde la base
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      Datos de ejemplo
    </span>
  );
}

export function TarjetaPersonalizacion() {
  const [branding, setBranding] = React.useState<BrandingSalon>(TEMA_EJEMPLO);
  const [fuente, setFuente] = React.useState<"base" | "ejemplo">("ejemplo");
  const [cargando, setCargando] = React.useState(true);

  // Al montar, lee la marca real del salón desde la base. Si no hay (o falla),
  // se queda con el tema de ejemplo.
  React.useEffect(() => {
    let vigente = true;
    obtenerBrandingSalon()
      .then((real) => {
        if (vigente && real) {
          setBranding(real);
          setFuente("base");
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const inicial = branding.nombre.trim().slice(0, 1).toUpperCase() || "S";

  return (
    <Card className="mt-6 p-6">
      <div className="flex items-start gap-4">
        <Palette className="size-8 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Personalización</h2>
            <FuenteBadge cargando={cargando} fuente={fuente} />
          </div>
          <p className="text-sm text-muted-foreground">
            La marca del salón (color, esquinas y logo) se lee de la base y se aplica en vivo, sin
            recompilar. Los temas de abajo dejan probar otros al vuelo (todavía no se guardan).
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* -------- Controles -------- */}
        <div className="space-y-4">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Probar un tema</span>
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
              {/* El acento del SALÓN si lo tiene; si no, el gris apagado.
                  Antes esto era `var(--accent, var(--muted-fg))` y el fallback
                  detectaba la ausencia — pero desde que tokens.css define
                  --accent (rediseño), esa variable SIEMPRE existe y el
                  fallback pintaba el rosa del tema base en salones sin acento.
                  La decisión se toma en JS, que sí sabe si hay acento. */}
              <p className="text-xs" style={{ color: branding.acento ?? "var(--muted-fg)" }}>
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
            style={{ borderColor: branding.acento ?? "var(--border)" }}
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
