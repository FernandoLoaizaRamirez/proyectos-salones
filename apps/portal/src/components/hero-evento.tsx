"use client";

/**
 * LA PORTADA DEL EVENTO — lo primero que ve el invitado al abrir su enlace.
 *
 * Esto es lo que separa "una app de software" de "la experiencia digital de mi
 * boda": una foto grande, el monograma de los novios, la fecha en letra
 * editorial y una frase suya. Nada de tarjetas grises con iconos.
 *
 * DE DÓNDE SALE CADA COSA (y por qué en ese orden):
 *   1. La INVITACIÓN que el salón captura en su panel (colección `invitacion`)
 *      manda: son los datos más ricos (nombres, fecha con hora, ciudad).
 *   2. Si no hay invitación capturada, el TEMA del evento (`event_branding`,
 *      migración 0025): monograma, frase, portada y nombre.
 *   3. La vitrina siempre se ve completa: es lo que se le enseña a un salón, y
 *      una demo a medio armar no vende.
 */
import * as React from "react";
import {
  COLECCION_INVITACION,
  fechaLarga,
  invitacionDe,
  invitacionTieneContenido,
  nombresInvitacion,
} from "@salones/core";
import { obtenerSync, esVitrina } from "@salones/sync";
import type { TemaResuelto } from "@salones/ui";
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

/** Iniciales para el monograma cuando el evento no trae uno: "A·R". */
function monogramaDe(nombres: string): string {
  const iniciales = nombres
    .split(/\s*(?:&|y|\+)\s*/i)
    .map((p) => p.trim().charAt(0).toUpperCase())
    .filter(Boolean);
  return iniciales.length >= 2 ? iniciales.slice(0, 2).join("·") : iniciales.join("");
}

export function HeroEvento({ evento, tema }: { evento: string; tema: TemaResuelto }) {
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
        } else if (esVitrina(evento)) {
          setDatos(DATOS_DEMO);
        }
      })
      .catch(() => {
        // Sin red no hay portada extra; la vitrina sí se enseña completa.
        if (vivo && esVitrina(evento)) setDatos(DATOS_DEMO);
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

  // La invitación capturada manda; si no hay, lo que traiga el tema del evento.
  const nombres = datos?.nombres || "";
  const fechaISO = datos?.fechaISO || tema.evento?.fechaISO || "";
  const cuenta = fechaISO && ahora !== null ? restante(fechaISO, ahora) : null;
  const cuando = fechaISO ? [fechaLarga(fechaISO), datos?.ciudad].filter(Boolean).join(" · ") : "";
  const titulo = nombres || tema.evento?.nombre || "Nuestra celebración";
  const monograma = tema.evento?.monograma || (nombres ? monogramaDe(nombres) : "");
  const portada = tema.evento?.portadaUrl;

  /*
   * El texto tiene que leerse sobre CUALQUIER foto que suba el salón, y no hay
   * forma de saber si será clara u oscura: sobre portada va siempre blanco con
   * un velo oscuro debajo. Sin portada, los tokens del tema.
   */
  const sobreFoto = Boolean(portada);
  const suave = sobreFoto ? "text-white/80" : "text-muted-foreground";

  return (
    <section className="relative isolate overflow-hidden">
      {portada ? (
        <>
          {/* <img> a propósito: la portada viene de la base en runtime y
              next/image exigiría declarar cada dominio por adelantado. */}
          <img
            src={portada}
            alt=""
            aria-hidden
            className="absolute inset-0 -z-10 size-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/45 to-black/70" />
        </>
      ) : null}

      <div
        className={[
          "px-6 py-16 text-center sm:py-24",
          sobreFoto ? "text-white" : "bg-surface",
        ].join(" ")}
      >
        {monograma ? (
          <div
            className={[
              "mx-auto grid size-16 place-items-center rounded-full border font-[family-name:var(--font-script)] text-2xl",
              sobreFoto ? "border-white/40" : "border-primary/25 text-primary",
            ].join(" ")}
          >
            {monograma}
          </div>
        ) : null}

        <p className={["mt-6 text-[0.7rem] uppercase tracking-[0.3em]", suave].join(" ")}>
          {nombres ? "Celebramos a" : "Te damos la bienvenida a"}
        </p>

        <h1 className="mx-auto mt-3 max-w-2xl text-balance font-[family-name:var(--font-display)] text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          {titulo}
        </h1>

        {cuando ? <p className={["mt-4 text-sm tracking-wide", suave].join(" ")}>{cuando}</p> : null}

        {tema.evento?.frase ? (
          <p
            className={[
              "mx-auto mt-6 max-w-md text-balance font-[family-name:var(--font-display)] text-lg italic",
              sobreFoto ? "text-white/90" : "text-foreground/80",
            ].join(" ")}
          >
            {tema.evento.frase}
          </p>
        ) : null}

        {cuenta ? (
          <div className="mx-auto mt-10 grid max-w-xs grid-cols-3 gap-2">
            {[
              { valor: cuenta.dias, unidad: cuenta.dias === 1 ? "día" : "días" },
              { valor: cuenta.horas, unidad: cuenta.horas === 1 ? "hora" : "horas" },
              { valor: cuenta.minutos, unidad: "min" },
            ].map((pieza) => (
              <div
                key={pieza.unidad}
                className={[
                  "min-w-0 rounded-[var(--radius)] px-2 py-3",
                  sobreFoto ? "bg-white/15 backdrop-blur-sm" : "bg-card",
                ].join(" ")}
              >
                <div className="text-2xl font-semibold tabular-nums">{pieza.valor}</div>
                <div className={["text-xs", suave].join(" ")}>{pieza.unidad}</div>
              </div>
            ))}
          </div>
        ) : null}

        {perfil?.nombre ? (
          <p className={["mt-10 text-sm", suave].join(" ")}>
            Hola, <span className="font-medium">{perfil.nombre}</span>
            {" · "}
            <button
              type="button"
              onClick={() => olvidarPerfil(evento)}
              className="underline-offset-2 transition-opacity hover:underline hover:opacity-80"
            >
              No soy yo
            </button>
          </p>
        ) : null}
      </div>
    </section>
  );
}
