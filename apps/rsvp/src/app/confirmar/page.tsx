"use client";

import * as React from "react";
import { Check, X, MessageCircle } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
import { obtenerSync } from "@salones/sync";
import {
  decodificar,
  evento,
  EstadoRSVP,
  EVENTO_ID,
  COLECCION_RESPUESTAS,
  type Invitado,
} from "@/lib/rsvp";

export default function ConfirmarPage() {
  const [inv, setInv] = React.useState<Invitado | null | "cargando">("cargando");
  const [asiste, setAsiste] = React.useState<"si" | "no" | "">("");
  const [personas, setPersonas] = React.useState(1);
  const [enviado, setEnviado] = React.useState<null | "si" | "no">(null);

  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const i = hash ? decodificar(hash) : null;
    setInv(i);
    if (i) setPersonas(i.cupos);
  }, []);

  const confirmar = async () => {
    if (!inv || inv === "cargando" || !asiste) return;
    const estado = asiste === "si" ? EstadoRSVP.Confirmado : EstadoRSVP.Rechazado;
    const p = asiste === "si" ? personas : 0;
    // Manda la respuesta al "lugar central" (@salones/sync): en local queda en
    // este dispositivo; con el servicio gestionado llega solo al tablero del
    // anfitrión, junto con las de todos los demás invitados.
    try {
      await obtenerSync().guardar(EVENTO_ID, COLECCION_RESPUESTAS, {
        id: inv.id,
        estado,
        personas: p,
      });
    } catch {
      /* si el guardado falla, aún queda el aviso por WhatsApp de abajo */
    }
    const lineas = [
      `Confirmación de asistencia · ${evento.nombre}`,
      "",
      `Nombre: ${inv.nombre}`,
      asiste === "si"
        ? `¿Asistiré?: Sí, seremos ${p} persona${p === 1 ? "" : "s"}`
        : "¿Asistiré?: No podré asistir",
    ];
    window.open(
      `https://wa.me/${evento.organizador.whatsapp}?text=${encodeURIComponent(lineas.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
    setEnviado(asiste);
  };

  return (
    <main className="grid min-h-screen place-items-center p-6">
      {inv === "cargando" ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : !inv ? (
        <p className="max-w-sm text-center text-muted-foreground">
          Este enlace no es válido. Pide a los organizadores que te reenvíen tu invitación.
        </p>
      ) : enviado ? (
        <Card className="w-full max-w-sm p-8 text-center">
          <div
            className={cn(
              "mx-auto grid size-14 place-items-center rounded-full",
              enviado === "si" ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground",
            )}
          >
            {enviado === "si" ? <Check className="size-7" /> : <X className="size-7" />}
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            {enviado === "si" ? "¡Gracias por confirmar!" : "Gracias por avisarnos"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {enviado === "si"
              ? `Registramos tu asistencia, ${inv.nombre}. ¡Nos vemos en el evento!`
              : `Qué pena que no puedas acompañarnos, ${inv.nombre}. ¡Gracias de todos modos!`}
          </p>
        </Card>
      ) : (
        <Card className="w-full max-w-sm p-8 text-center">
          <p className="text-sm text-muted-foreground">{evento.nombre}</p>
          <p className="text-sm text-muted-foreground">{evento.fecha}</p>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Hola, {inv.nombre}</h1>
          <p className="mt-2 text-muted-foreground">¿Podrás acompañarnos?</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => setAsiste("si")}
              className={cn(
                "rounded-[var(--radius)] border px-4 py-3 text-sm font-medium transition-colors",
                asiste === "si"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              Sí, ahí estaré
            </button>
            <button
              onClick={() => setAsiste("no")}
              className={cn(
                "rounded-[var(--radius)] border px-4 py-3 text-sm font-medium transition-colors",
                asiste === "no"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              No podré ir
            </button>
          </div>

          {asiste === "si" && inv.cupos > 1 ? (
            <div className="mt-4 text-left">
              <label className="mb-1.5 block text-sm font-medium">¿Cuántas personas asistirán?</label>
              <select
                className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm"
                value={String(personas)}
                onChange={(e) => setPersonas(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: inv.cupos }, (_, i) => String(i + 1)).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === "1" ? "persona" : "personas"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <Button className="mt-6 w-full" disabled={!asiste} onClick={confirmar}>
            <MessageCircle className="size-4" /> Confirmar
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Tu respuesta se enviará a los organizadores. Confirma antes del {evento.fechaLimite}.
          </p>
        </Card>
      )}
    </main>
  );
}
