"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import {
  invitados,
  evento,
  contenidoQR,
  idDesdeQR,
  buscarInvitado,
  totalPersonas,
  type Invitado,
} from "@/lib/evento";
import { QR } from "./qr";
import { Escaner } from "./escaner";

const STORAGE = "pases-sr-ingresados";

type Resultado = { estado: "ok" | "repetido" | "invalido"; texto: string } | null;

export function PasesCliente() {
  const [tab, setTab] = React.useState<"pases" | "checkin">("pases");
  const [ingresados, setIngresados] = React.useState<Record<string, boolean>>({});
  const [cargado, setCargado] = React.useState(false);
  const [pase, setPase] = React.useState<Invitado | null>(null);
  const [resultado, setResultado] = React.useState<Resultado>(null);

  const ingresadosRef = React.useRef(ingresados);
  const ultimo = React.useRef<{ id: string; t: number } | null>(null);

  // Cargar / guardar el estado de ingreso en este dispositivo.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setIngresados(JSON.parse(raw));
    } catch {
      /* noop */
    }
    setCargado(true);
  }, []);
  React.useEffect(() => {
    ingresadosRef.current = ingresados;
    if (cargado) localStorage.setItem(STORAGE, JSON.stringify(ingresados));
  }, [ingresados, cargado]);

  const marcar = (id: string, val: boolean) => setIngresados((s) => ({ ...s, [id]: val }));

  const registrar = React.useCallback((inv: Invitado) => {
    if (ingresadosRef.current[inv.id]) {
      setResultado({ estado: "repetido", texto: `${inv.nombre} ya había ingresado.` });
    } else {
      setIngresados((s) => ({ ...s, [inv.id]: true }));
      setResultado({
        estado: "ok",
        texto: `¡Bienvenidos! ${inv.nombre} · Mesa ${inv.mesa} · ${inv.personas} pers.`,
      });
    }
  }, []);

  const onDetectar = React.useCallback(
    (texto: string) => {
      const id = idDesdeQR(texto);
      const now = Date.now();
      // Ignora el mismo código si se repite en menos de 2.5 s.
      if (id && ultimo.current && ultimo.current.id === id && now - ultimo.current.t < 2500) return;
      if (id) ultimo.current = { id, t: now };
      const inv = id ? buscarInvitado(id) : undefined;
      if (!inv) {
        setResultado({ estado: "invalido", texto: "Pase no válido o no reconocido." });
        return;
      }
      registrar(inv);
    },
    [registrar],
  );

  const nIngresados = invitados.filter((i) => ingresados[i.id]).length;
  const personasIngresadas = invitados
    .filter((i) => ingresados[i.id])
    .reduce((s, i) => s + i.personas, 0);

  return (
    <div>
      {/* Pestañas */}
      <div className="mb-8 inline-flex rounded-full border border-border bg-card p-1">
        {(
          [
            ["pases", "Pases de invitados"],
            ["checkin", "Control de acceso"],
          ] as const
        ).map(([clave, texto]) => (
          <button
            key={clave}
            onClick={() => setTab(clave)}
            aria-selected={tab === clave}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === clave
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {texto}
          </button>
        ))}
      </div>

      {tab === "pases" ? (
        <div>
          <p className="text-sm text-muted-foreground">
            Así se ve el pase que recibe cada invitado en su teléfono. Toca uno para verlo en grande.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invitados.map((inv) => (
              <button key={inv.id} onClick={() => setPase(inv)} className="text-left">
                <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
                  <div className="shrink-0">
                    <QR value={contenidoQR(inv)} size={64} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{inv.nombre}</span>
                      {inv.tipo === "VIP" ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          VIP
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Mesa {inv.mesa} · {inv.personas} {inv.personas === 1 ? "persona" : "personas"}
                    </div>
                    <div className="text-xs text-muted-foreground">Pase {inv.id}</div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <Escaner onDetectar={onDetectar} />

          {resultado ? (
            <div
              className={cn(
                "mt-4 flex items-center gap-2 rounded-[var(--radius)] border p-4 text-sm font-medium",
                resultado.estado === "ok"
                  ? "border-green-500/40 bg-green-500/10 text-green-600"
                  : resultado.estado === "repetido"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                    : "border-red-500/40 bg-red-500/10 text-red-600",
              )}
            >
              {resultado.estado === "invalido" ? (
                <X className="size-4 shrink-0" />
              ) : (
                <Check className="size-4 shrink-0" />
              )}
              {resultado.texto}
            </div>
          ) : null}

          {/* Contador */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
            <div className="text-sm">
              <span className="font-semibold">{nIngresados}</span> de {invitados.length} pases ·{" "}
              <span className="font-semibold">{personasIngresadas}</span> de {totalPersonas} personas
              dentro
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIngresados({})}>
              Reiniciar
            </Button>
          </div>

          {/* Lista manual */}
          <div className="mt-4 space-y-2">
            {invitados.map((inv) => {
              const dentro = !!ingresados[inv.id];
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{inv.nombre}</span>
                      {inv.tipo === "VIP" ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          VIP
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Mesa {inv.mesa} · {inv.personas} pers · {inv.id}
                    </div>
                  </div>
                  <Button
                    variant={dentro ? "primary" : "outline"}
                    size="sm"
                    onClick={() => marcar(inv.id, !dentro)}
                  >
                    {dentro ? (
                      <>
                        <Check className="size-4" /> Ingresó
                      </>
                    ) : (
                      "Marcar ingreso"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal del pase individual */}
      {pase ? (
        <div
          onClick={() => setPase(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm p-8 text-center"
          >
            <button
              onClick={() => setPase(null)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-full hover:bg-muted"
            >
              <X className="size-4" />
            </button>
            <p className="text-sm text-muted-foreground">{evento.nombre}</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight">{pase.nombre}</h3>
            <div className="mt-1 text-sm text-muted-foreground">
              Mesa {pase.mesa} · {pase.personas} {pase.personas === 1 ? "persona" : "personas"} ·{" "}
              {pase.tipo}
            </div>
            <div className="mt-6 flex justify-center">
              <QR value={contenidoQR(pase)} size={220} />
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Pase {pase.id} · {evento.fecha}
            </div>
            <p className="mt-4 text-sm">Muestra este código en la entrada del evento.</p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
