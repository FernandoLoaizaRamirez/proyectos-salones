"use client";

import * as React from "react";
import { decodificarPase, evento, type Invitado } from "@/lib/evento";
import { PassTicket } from "@/components/pass-ticket";

/**
 * Página del pase individual (lo que abre el invitado desde el enlace que le
 * comparten). Los datos viajan dentro del propio enlace, sin servidor.
 */
export default function PasePage() {
  const [inv, setInv] = React.useState<Invitado | null | "cargando">("cargando");

  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    setInv(hash ? decodificarPase(hash) : null);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      {inv === "cargando" ? (
        <p className="text-muted-foreground">Cargando pase…</p>
      ) : inv ? (
        <div className="w-full max-w-sm">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Tu pase para {evento.nombre}
          </p>
          <PassTicket inv={inv} />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Guarda esta pantalla o toma una captura. Muéstrala en la entrada del evento.
          </p>
        </div>
      ) : (
        <div className="max-w-sm text-center">
          <p className="text-muted-foreground">
            Este pase no es válido. Pide a los organizadores que te reenvíen tu invitación.
          </p>
        </div>
      )}
    </main>
  );
}
