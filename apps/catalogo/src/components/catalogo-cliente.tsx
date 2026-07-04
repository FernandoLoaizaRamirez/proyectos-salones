"use client";

import * as React from "react";
import { Check, Plus, ExternalLink, MessageCircle } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { AppMode } from "@salones/core";
import { vendedor, modelos, productos, type Modelo } from "@/lib/catalogo";

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

export function CatalogoCliente() {
  const [modelo, setModelo] = React.useState<Modelo>(AppMode.Rental);
  const [sel, setSel] = React.useState<Record<string, boolean>>({});

  const modeloInfo = modelos.find((m) => m.clave === modelo)!;
  const seleccionados = productos.filter((p) => sel[p.id]);
  const total = seleccionados.reduce((s, p) => s + p.precios[modelo], 0);

  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }));

  const cotizar = () => {
    const lineas = [
      `¡Hola! Me interesa contratar apps de ${vendedor.nombre}.`,
      `Modelo de contratación: ${modeloInfo.nombre}.`,
      "",
      ...(seleccionados.length
        ? seleccionados.map(
            (p) => `• ${p.nombre} — ${money(p.precios[modelo])}${modeloInfo.periodo}`,
          )
        : ["(Aún no elijo apps; me gustaría que me asesoren.)"]),
      "",
      seleccionados.length ? `Total estimado: ${money(total)}${modeloInfo.periodo}` : "",
      "¿Me pueden dar una cotización?",
    ].filter(Boolean);
    const url = `https://wa.me/${vendedor.whatsapp}?text=${encodeURIComponent(lineas.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      {/* Selector del modelo de contratación */}
      <div className="flex flex-col items-center gap-3">
        <div
          role="tablist"
          aria-label="Modelo de contratación"
          className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-border bg-card p-1"
        >
          {modelos.map((m) => (
            <button
              key={m.clave}
              role="tab"
              aria-selected={modelo === m.clave}
              onClick={() => setModelo(m.clave)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                modelo === m.clave
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.nombre}
            </button>
          ))}
        </div>
        <p className="max-w-xl text-center text-sm text-muted-foreground">{modeloInfo.resumen}</p>
      </div>

      {/* Tarjetas de apps */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {productos.map((p) => {
          const Icono = p.icono;
          const activo = !!sel[p.id];
          const otros = modelos.filter((m) => m.clave !== modelo);
          return (
            <Card
              key={p.id}
              className={cn(
                "relative flex flex-col overflow-hidden transition-all",
                activo ? "ring-2 ring-primary" : "hover:shadow-md",
              )}
            >
              {p.destacado ? (
                <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  Más popular
                </span>
              ) : null}

              <div className="p-6">
                <div
                  className={cn(
                    "mb-4 grid size-12 place-items-center rounded-[var(--radius)] bg-gradient-to-br text-white",
                    p.acento,
                  )}
                >
                  <Icono className="size-6" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold tracking-tight">{p.nombre}</h3>
                  {!p.disponible ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      Disponible pronto
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.descripcion}</p>
                {p.demoUrl ? (
                  <a
                    href={p.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Ver demo <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </div>

              <div className="mt-auto border-t border-border p-6 pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold">{money(p.precios[modelo])}</span>
                  <span className="text-sm text-muted-foreground">{modeloInfo.periodo}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {otros
                    .map((m) => `${m.corto} ${money(p.precios[m.clave])}${m.periodo}`)
                    .join(" · ")}
                </p>
                <Button
                  variant={activo ? "primary" : "outline"}
                  className="mt-4 w-full"
                  onClick={() => toggle(p.id)}
                  aria-pressed={activo}
                >
                  {activo ? (
                    <>
                      <Check className="size-4" /> Agregado
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Agregar a mi paquete
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Espaciador para que la barra fija no tape el contenido */}
      {seleccionados.length > 0 ? <div className="h-28" aria-hidden="true" /> : null}

      {/* Barra de selección fija (aparece al elegir apps) */}
      {seleccionados.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-4 sm:flex-row">
            <div className="text-center text-sm sm:text-left">
              <span className="font-medium">{seleccionados.length}</span>{" "}
              {seleccionados.length === 1 ? "app seleccionada" : "apps seleccionadas"} ·{" "}
              <span className="font-semibold">
                {money(total)}
                {modeloInfo.periodo}
              </span>{" "}
              <span className="text-muted-foreground">({modeloInfo.nombre})</span>
            </div>
            <Button size="lg" onClick={cotizar} className="w-full sm:w-auto">
              <MessageCircle className="size-4" /> Solicitar cotización por WhatsApp
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
