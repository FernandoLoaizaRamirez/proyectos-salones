"use client";

import * as React from "react";
import { Check, Plus, ExternalLink, MessageCircle, Package } from "lucide-react";
import { Button, buttonVariants, Card, cn } from "@salones/ui";
import { AppMode } from "@salones/core";
import {
  vendedor,
  modelos,
  productos,
  paquetes,
  appsDelPaquete,
  precioPaquete,
  precioPaqueteBruto,
  modelosDeProducto,
  modelosDePaquete,
  nombreModelo,
  type Modelo,
} from "@/lib/catalogo";

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

const infoModelo = (m: Modelo) => modelos.find((x) => x.clave === m)!;

export function CatalogoCliente() {
  const [modelo, setModelo] = React.useState<Modelo>(AppMode.Rental);
  const [selApps, setSelApps] = React.useState<Record<string, boolean>>({});
  const [selPaq, setSelPaq] = React.useState<Record<string, boolean>>({});

  const modeloInfo = infoModelo(modelo);

  // Solo cuenta lo que está seleccionado Y disponible en el modelo elegido
  // (así el total siempre es coherente: todo mensual o todo pago único).
  const appsSel = productos.filter((p) => selApps[p.id] && modelosDeProducto(p).includes(modelo));
  const paqSel = paquetes.filter((pk) => selPaq[pk.id] && modelosDePaquete(pk).includes(modelo));

  const total =
    appsSel.reduce((s, p) => s + p.precios[modelo], 0) +
    paqSel.reduce((s, pk) => s + precioPaquete(pk, modelo), 0);

  const nSel = appsSel.length + paqSel.length;

  const toggleApp = (id: string) => setSelApps((s) => ({ ...s, [id]: !s[id] }));
  const togglePaq = (id: string) => setSelPaq((s) => ({ ...s, [id]: !s[id] }));

  const cotizar = () => {
    const lineas = [
      `¡Hola! Me interesa contratar con ${vendedor.nombre}.`,
      `Modelo de contratación: ${modeloInfo.nombre}.`,
      "",
      ...paqSel.map(
        (pk) =>
          `• Paquete ${pk.nombre.replace(/^Paquete /, "")} (${appsDelPaquete(pk)
            .map((a) => a.nombre)
            .join(", ")}) — ${money(precioPaquete(pk, modelo))}${modeloInfo.periodo}`,
      ),
      ...appsSel.map((p) => `• ${p.nombre} — ${money(p.precios[modelo])}${modeloInfo.periodo}`),
      ...(nSel === 0 ? ["(Aún no elijo nada; me gustaría que me asesoren.)"] : []),
      "",
      nSel > 0 ? `Total estimado: ${money(total)}${modeloInfo.periodo}` : "",
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

      {/* Paquetes (combos con descuento) */}
      <div className="mt-14">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Paquetes · ahorra combinando</h2>
          <p className="text-sm text-muted-foreground">
            Combos de varias apps a mejor precio que contratarlas por separado.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {paquetes.map((pk) => {
            const mDisp = modelosDePaquete(pk);
            const disponible = mDisp.includes(modelo);
            const activo = !!selPaq[pk.id] && disponible;
            const primero = mDisp[0]!;
            const bruto = precioPaqueteBruto(pk, modelo);
            const precio = precioPaquete(pk, modelo);
            const ahorro = bruto - precio;
            const pct = bruto > 0 ? Math.round((ahorro / bruto) * 100) : 0;
            return (
              <Card
                key={pk.id}
                className={cn(
                  "relative flex flex-col overflow-hidden transition-all",
                  activo
                    ? "ring-2 ring-primary"
                    : pk.destacado
                      ? "border-primary/40 hover:shadow-md"
                      : "hover:shadow-md",
                )}
              >
                {pk.destacado ? (
                  <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                    El más completo
                  </span>
                ) : null}
                <div className="p-6">
                  <div
                    className={cn(
                      "mb-4 grid size-12 place-items-center rounded-[var(--radius)] bg-gradient-to-br text-white",
                      pk.acento,
                    )}
                  >
                    <Package className="size-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{pk.nombre}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{pk.descripcion}</p>
                  <ul className="mt-4 space-y-1.5">
                    {appsDelPaquete(pk).map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm">
                        <Check className="size-4 shrink-0 text-primary" />
                        {a.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto border-t border-border p-6 pt-4">
                  {disponible ? (
                    <>
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm text-muted-foreground line-through">
                          {money(bruto)}
                        </span>
                        <span className="text-2xl font-semibold">{money(precio)}</span>
                        <span className="text-sm text-muted-foreground">{modeloInfo.periodo}</span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-primary">
                        Ahorras {pct}% · {money(ahorro)}
                        {modeloInfo.periodo}
                      </p>
                      <Button
                        variant={activo ? "primary" : "outline"}
                        className="mt-4 w-full"
                        onClick={() => togglePaq(pk.id)}
                        aria-pressed={activo}
                      >
                        {activo ? (
                          <>
                            <Check className="size-4" /> Agregado
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" /> Agregar paquete
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">
                          Solo en {mDisp.map(nombreModelo).join(" o ")}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          (incluye el sitio web, que se vende).
                        </span>
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={() => setModelo(primero)}
                      >
                        Ver en {infoModelo(primero).nombre}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Apps por separado */}
      <div className="mt-16">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">O elige app por app</h2>
          <p className="text-sm text-muted-foreground">
            Cada app se puede contratar por separado. Arma justo lo que necesitas.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((p) => {
            const Icono = p.icono;
            const mDisp = modelosDeProducto(p);
            const disponible = mDisp.includes(modelo);
            const activo = !!selApps[p.id] && disponible;
            const primero = mDisp[0]!;
            const otros = modelos.filter((m) => m.clave !== modelo && mDisp.includes(m.clave));
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
                </div>

                <div className="mt-auto border-t border-border p-6 pt-4">
                  {disponible ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-semibold">{money(p.precios[modelo])}</span>
                        <span className="text-sm text-muted-foreground">{modeloInfo.periodo}</span>
                      </div>
                      {otros.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {otros
                            .map((m) => `${m.corto} ${money(p.precios[m.clave])}${m.periodo}`)
                            .join(" · ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Hecho a la medida de tu marca: se vende, no se renta.
                        </p>
                      )}
                      <div className="mt-4 flex gap-2">
                        {p.demoUrl ? (
                          <a
                            href={p.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
                          >
                            <ExternalLink className="size-4" /> Ver demo
                          </a>
                        ) : null}
                        <Button
                          variant={activo ? "primary" : "outline"}
                          className={p.demoUrl ? "flex-1" : "w-full"}
                          onClick={() => toggleApp(p.id)}
                          aria-pressed={activo}
                        >
                          {activo ? (
                            <>
                              <Check className="size-4" /> Agregado
                            </>
                          ) : (
                            <>
                              <Plus className="size-4" /> Agregar
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">Solo en {mDisp.map(nombreModelo).join(" o ")}.</span>{" "}
                        <span className="text-muted-foreground">
                          {money(p.precios[primero])}
                          {infoModelo(primero).periodo}
                        </span>
                      </p>
                      <div className="mt-4 flex gap-2">
                        {p.demoUrl ? (
                          <a
                            href={p.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
                          >
                            <ExternalLink className="size-4" /> Ver demo
                          </a>
                        ) : null}
                        <Button
                          variant="outline"
                          className={p.demoUrl ? "flex-1" : "w-full"}
                          onClick={() => setModelo(primero)}
                        >
                          Ver en {infoModelo(primero).corto}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Espaciador para que la barra fija no tape el contenido */}
      {nSel > 0 ? <div className="h-28" aria-hidden="true" /> : null}

      {/* Barra de selección fija (aparece al elegir algo) */}
      {nSel > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-4 sm:flex-row">
            <div className="text-center text-sm sm:text-left">
              <span className="font-medium">{nSel}</span>{" "}
              {nSel === 1 ? "cosa seleccionada" : "cosas seleccionadas"} ·{" "}
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
