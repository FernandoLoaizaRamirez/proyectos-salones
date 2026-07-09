"use client";

import * as React from "react";
import { Users, Search, MapPin } from "lucide-react";
import { Card, ThemeToggle, cn } from "@salones/ui";
import {
  decodificarAcomodo,
  asientosUsados,
  invitadosDeMesa,
  sinAsignar,
  normaliza,
  evento as eventoLocal,
  mesasIniciales,
  invitadosIniciales,
  type Acomodo,
} from "@/lib/mesas";

const K_MESAS = "mesas-mesas";
const K_INVITADOS = "mesas-invitados";

export function AcomodoLectura() {
  const [acomodo, setAcomodo] = React.useState<Acomodo | null | "cargando">("cargando");
  const [busqueda, setBusqueda] = React.useState("");

  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      setAcomodo(decodificarAcomodo(hash) ?? null);
      return;
    }
    // Sin datos en el enlace: mostramos lo guardado en este dispositivo (vista previa).
    try {
      const m = localStorage.getItem(K_MESAS);
      const g = localStorage.getItem(K_INVITADOS);
      setAcomodo({
        v: 1,
        evento: { nombre: eventoLocal.nombre, fecha: eventoLocal.fecha, lugar: eventoLocal.lugar },
        mesas: m ? JSON.parse(m) : mesasIniciales,
        invitados: g ? JSON.parse(g) : invitadosIniciales,
      });
    } catch {
      setAcomodo({
        v: 1,
        evento: { nombre: eventoLocal.nombre, fecha: eventoLocal.fecha, lugar: eventoLocal.lugar },
        mesas: mesasIniciales,
        invitados: invitadosIniciales,
      });
    }
  }, []);

  if (acomodo === "cargando") {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <p className="text-muted-foreground">Cargando…</p>
      </main>
    );
  }

  if (!acomodo) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <p className="max-w-sm text-center text-muted-foreground">
          Este enlace no es válido o está incompleto. Pide a los organizadores que te reenvíen el
          acomodo de mesas.
        </p>
      </main>
    );
  }

  const { mesas, invitados } = acomodo;
  const q = normaliza(busqueda);
  const coincide = (nombre: string) => q.length > 0 && normaliza(nombre).includes(q);
  const libres = sinAsignar(invitados);
  const libresCoinciden = q.length > 0 && libres.some((i) => coincide(i.nombre));

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">{acomodo.evento.nombre}</div>
            <div className="truncate text-xs text-muted-foreground">{acomodo.evento.lugar}</div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-primary">Acomodo de mesas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{acomodo.evento.nombre}</h1>
          <p className="mt-1 text-muted-foreground">{acomodo.evento.fecha}</p>
        </div>

        {/* Encuentra tu lugar */}
        <div className="mx-auto mb-8 max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-[var(--radius)] border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Escribe tu nombre para encontrar tu mesa…"
            />
          </div>
          {libresCoinciden ? (
            <p className="mt-2 text-center text-sm text-amber-600 dark:text-amber-400">
              Encontramos tu nombre, pero aún no tienes mesa asignada. Pregunta a los organizadores.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mesas.map((mesa) => {
            const usados = asientosUsados(mesa.id, invitados);
            const gente = invitadosDeMesa(mesa.id, invitados);
            const mesaResaltada = q.length > 0 && gente.some((i) => coincide(i.nombre));
            return (
              <Card
                key={mesa.id}
                className={cn(
                  "flex flex-col p-4 transition-all",
                  mesaResaltada && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold">{mesa.nombre}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Users className="size-3" /> {usados}/{mesa.capacidad}
                  </span>
                </div>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {gente.length === 0 ? (
                    <li className="text-sm text-muted-foreground">Mesa libre</li>
                  ) : (
                    gente.map((inv) => (
                      <li
                        key={inv.id}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-[var(--radius)] px-2 py-1 text-sm",
                          coincide(inv.nombre)
                            ? "bg-primary/15 font-semibold text-primary"
                            : "text-foreground",
                        )}
                      >
                        <span className="min-w-0 truncate">
                          {coincide(inv.nombre) ? (
                            <MapPin className="mr-1 inline size-3.5" />
                          ) : null}
                          {inv.nombre}
                        </span>
                        {inv.asientos > 1 ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {inv.asientos}
                          </span>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            );
          })}
        </div>

        {mesas.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            El organizador aún no ha creado las mesas.
          </p>
        ) : null}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-muted-foreground">
          Acomodo de mesas · {acomodo.evento.lugar}
        </div>
      </footer>
    </main>
  );
}
