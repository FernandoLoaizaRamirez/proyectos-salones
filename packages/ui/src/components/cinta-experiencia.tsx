"use client";

import * as React from "react";
import { ArrowLeft, Check, ChevronDown, Share2 } from "lucide-react";
import type { TemaResuelto } from "../tema/tipos";
import { cn } from "../lib/cn";

/**
 * LA CINTA DE LA EXPERIENCIA — la navegación única de toda pantalla del
 * invitado. Es lo que hace que 12 módulos se sientan UN producto:
 *
 *   [←] [marca] Hacienda Santa Renata          [Experiencias ▾] [compartir]
 *              Boda Ana & Rodrigo
 *
 * · La MARCA (logo o inicial) enlaza a la web del salón (`sitioUrl` — de la
 *   base, ya no de una variable de entorno): el camino de regreso a casa.
 * · El NOMBRE DEL EVENTO enlaza al portal (`volverHref`): el camino de
 *   regreso a la celebración. La flecha ← es el mismo enlace, más visible.
 * · EXPERIENCIAS: cambiar de módulo sin pasar por el portal — el menú se
 *   monta desde los manifests ya filtrados por entitlements (quien llama
 *   decide qué lista pasar; una función apagada no aparece).
 * · COMPARTIR: Web Share nativo con caída a copiar el enlace. El enlace lo
 *   decide quien llama (debe traer `?e=` y, si aplica, el `#` del perfil).
 *
 * Deliberadamente SIN colores propios: pinta con los tokens del tema — la
 * lección del arcoíris. Y sin red: es presentación pura.
 */

export type ExperienciaEnlace = {
  nombre: string;
  href: string;
  /** La experiencia en la que el invitado ya está (se marca, no se enlaza). */
  actual?: boolean;
};

export function CintaExperiencia({
  tema,
  volverHref,
  volverEtiqueta = "Volver al evento",
  compartirUrl,
  experiencias,
  className,
}: {
  tema: TemaResuelto;
  /** Enlace de regreso al portal del evento. Sin él, no se pinta la flecha. */
  volverHref?: string;
  volverEtiqueta?: string;
  /** Enlace a compartir. Sin él, no se pinta el botón. */
  compartirUrl?: string;
  /** Menú "Experiencias" (ya filtrado por entitlements). */
  experiencias?: ExperienciaEnlace[];
  className?: string;
}) {
  const [abierto, setAbierto] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // El menú se cierra al tocar fuera — el gesto natural en un teléfono.
  React.useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [abierto]);

  const compartir = async () => {
    if (!compartirUrl) return;
    const titulo = tema.evento?.nombre ?? tema.salon.nombre;
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, url: compartirUrl });
        return;
      }
    } catch {
      // Compartir cancelado: no es un error, no se molesta al invitado.
      return;
    }
    try {
      await navigator.clipboard.writeText(compartirUrl);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el botón simplemente no confirma.
    }
  };

  const inicial = (tema.salon.nombre.trim()[0] ?? "•").toUpperCase();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {volverHref ? (
            <a
              href={volverHref}
              aria-label={volverEtiqueta}
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" />
            </a>
          ) : null}

          {/* La marca del salón: logo si hay, inicial si no. Enlaza a casa. */}
          {tema.salon.sitioUrl ? (
            <a
              href={tema.salon.sitioUrl}
              className="flex min-w-0 items-center gap-3"
              aria-label={`Sitio de ${tema.salon.nombre}`}
            >
              <MarcaVisual logoUrl={tema.salon.logoUrl} inicial={inicial} />
            </a>
          ) : (
            <MarcaVisual logoUrl={tema.salon.logoUrl} inicial={inicial} />
          )}

          {/* `py-1` para que el bloque se pueda tocar (medía 16 px por renglón) y
              el nombre del salón en dos renglones antes de recortarse: con
              `truncate` a secas, "Hacienda Santa Renata" no cabía por 20 px. */}
          <div className="min-w-0 py-1 leading-tight">
            <div className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold sm:line-clamp-1">
              {tema.salon.nombre}
            </div>
            {tema.evento?.nombre ? (
              volverHref ? (
                <a
                  href={volverHref}
                  className="block truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {tema.evento.nombre}
                </a>
              ) : (
                <div className="truncate text-xs text-muted-foreground">{tema.evento.nombre}</div>
              )
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {experiencias && experiencias.length > 0 ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                aria-expanded={abierto}
                aria-haspopup="menu"
                aria-label="Experiencias"
                /*
                 * En el celular esta palabra se llevaba 119 px de los 342 y el
                 * nombre del salón —lo que se le está vendiendo— salía como
                 * "Hacienda Sa…" en TODAS las pantallas. Aquí queda en icono.
                 */
                className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
              >
                <span className="hidden sm:inline">Experiencias</span>
                <ChevronDown className={cn("size-4 transition-transform", abierto && "rotate-180")} />
              </button>
              {abierto ? (
                <nav
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[var(--radius)] border border-border bg-card py-1 shadow-lg"
                >
                  {experiencias.map((x) =>
                    x.actual ? (
                      <span
                        key={x.nombre}
                        aria-current="page"
                        className="flex items-center justify-between px-4 py-2 text-sm font-medium text-primary"
                      >
                        {x.nombre}
                        <Check className="size-4" />
                      </span>
                    ) : (
                      <a
                        key={x.nombre}
                        role="menuitem"
                        href={x.href}
                        className="block px-4 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        {x.nombre}
                      </a>
                    ),
                  )}
                </nav>
              ) : null}
            </div>
          ) : null}

          {compartirUrl ? (
            <button
              type="button"
              onClick={() => void compartir()}
              aria-label="Compartir"
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copiado ? <Check className="size-4 text-primary" /> : <Share2 className="size-4" />}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function MarcaVisual({ logoUrl, inicial }: { logoUrl?: string; inicial: string }) {
  return logoUrl ? (
    // <img> a propósito: el logo viene de la base en runtime y next/image
    // exigiría declarar cada dominio de cliente por adelantado.
    <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-[var(--radius)] object-cover" />
  ) : (
    <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] bg-primary font-[family-name:var(--font-display)] text-sm font-bold text-primary-foreground">
      {inicial}
    </span>
  );
}
