"use client";

/**
 * PORTADA del portal: el evento con nombre y apellido.
 *
 * Dos piezas, y las dos son opcionales para que el portal nunca se vea roto:
 *
 *   • El saludo personal — si este teléfono ya tiene perfil (llegó con su
 *     enlace personal o se presentó en algún módulo), se le saluda por su
 *     nombre, con un "No soy yo" discreto por si el teléfono cambió de manos.
 *   • Los datos reales del evento — salen de la INVITACIÓN que el salón captura
 *     en su panel (colección `invitacion`, leída con `invitacionDe` de core,
 *     que solo acepta la fila canónica: una colada por un invitado no se
 *     pinta). Con nombres o fecha se enseñan en grande, con su cuenta
 *     regresiva; un evento real sin invitación capturada no pinta nada extra.
 *
 * El evento "demo" sin fila usa datos fijos de muestra: es la vitrina que se le
 * enseña a los salones y tiene que verse completa, no a medio armar.
 */
import * as React from "react";
import {
  COLECCION_INVITACION,
  fechaLarga,
  invitacionDe,
  invitacionTieneContenido,
  nombresInvitacion,
} from "@salones/core";
import { obtenerSync } from "@salones/sync";
import { olvidarPerfil, usePerfil } from "@/lib/perfil";

/** Lo poquito que la portada necesita de la invitación. */
type DatosEvento = { nombres: string; fechaISO: string; ciudad: string };

/** La boda de muestra de toda la suite (la misma de la invitación demo). */
const DATOS_DEMO: DatosEvento = {
  nombres: "Ana & Rodrigo",
  fechaISO: "2027-03-20T18:00",
  ciudad: "Culiacán",
};

/**
 * Cuánto falta. `null` si la fecha no se entiende o ya pasó (una cuenta
 * regresiva en negativo no se le enseña a nadie).
 */
function restante(fechaISO: string, ahora: number) {
  const objetivo = new Date(fechaISO).getTime();
  if (Number.isNaN(objetivo)) return null;
  const diff = objetivo - ahora;
  if (diff <= 0) return null;
  const MIN = 60 * 1000;
  const HORA = 60 * MIN;
  const DIA = 24 * HORA;
  return {
    dias: Math.floor(diff / DIA),
    horas: Math.floor((diff % DIA) / HORA),
    minutos: Math.floor((diff % HORA) / MIN),
  };
}

export function HeroEvento({ evento }: { evento: string }) {
  const perfil = usePerfil(evento);
  const [datos, setDatos] = React.useState<DatosEvento | null>(null);
  /**
   * El reloj arranca en `null` y se enciende tras montar: el servidor no sabe
   * la hora del teléfono, y pintar la cuenta en el SSR desincronizaría la
   * hidratación (el minuto habría cambiado para cuando React compara).
   */
  const [ahora, setAhora] = React.useState<number | null>(null);

  // Los datos del evento, desde la colección de la invitación.
  React.useEffect(() => {
    let vivo = true;
    obtenerSync()
      .listar(evento, COLECCION_INVITACION)
      .then((items) => {
        if (!vivo) return;
        const inv = invitacionDe(evento, items);
        if (inv && invitacionTieneContenido(inv)) {
          setDatos({ nombres: nombresInvitacion(inv), fechaISO: inv.fechaISO, ciudad: inv.ciudad });
        } else if (evento === "demo") {
          setDatos(DATOS_DEMO);
        }
      })
      .catch(() => {
        // Sin red no hay portada extra; la vitrina "demo" sí se enseña completa.
        if (vivo && evento === "demo") setDatos(DATOS_DEMO);
      });
    return () => {
      vivo = false;
    };
  }, [evento]);

  React.useEffect(() => {
    setAhora(Date.now());
    const reloj = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(reloj);
  }, []);

  const cuenta = datos?.fechaISO && ahora !== null ? restante(datos.fechaISO, ahora) : null;
  const cuando = datos ? [fechaLarga(datos.fechaISO), datos.ciudad].filter(Boolean).join(" · ") : "";

  if (!perfil && !datos) return null;

  return (
    <section className="mt-6 space-y-4">
      {perfil?.nombre ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-medium">Hola, {perfil.nombre}</p>
          <button
            type="button"
            onClick={() => olvidarPerfil(evento)}
            className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            No soy yo
          </button>
        </div>
      ) : null}

      {datos ? (
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 text-center sm:p-8">
          {datos.nombres ? (
            <>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Celebramos a
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {datos.nombres}
              </h2>
            </>
          ) : null}
          {cuando ? <p className="mt-2 text-sm text-muted-foreground">{cuando}</p> : null}
          {cuenta ? (
            <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-2">
              {[
                { valor: cuenta.dias, unidad: cuenta.dias === 1 ? "día" : "días" },
                { valor: cuenta.horas, unidad: cuenta.horas === 1 ? "hora" : "horas" },
                { valor: cuenta.minutos, unidad: "min" },
              ].map((pieza) => (
                <div key={pieza.unidad} className="rounded-[var(--radius)] bg-muted px-2 py-3">
                  <div className="text-2xl font-semibold tabular-nums">{pieza.valor}</div>
                  <div className="text-xs text-muted-foreground">{pieza.unidad}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
