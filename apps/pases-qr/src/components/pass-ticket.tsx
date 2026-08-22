"use client";

import { QRCodeSVG } from "qrcode.react";
import { contenidoQR, etiquetaMesa, evento, type Invitado } from "@/lib/evento";

/** Lo que el boleto pinta del evento (el nombre arriba y la fecha del pie). */
type TextosTicket = { nombre: string; fechaCorta: string };

/**
 * La etiqueta de la mesa. Aquí la mesa siempre fue un número ("4"), pero con
 * el acomodo real puede llegar el NOMBRE de la mesa ("Mesa principal",
 * "Familia de la novia"): si ya empieza con la palabra "mesa" no se le
 * antepone otra, para no imprimir "Mesa Mesa principal". Vacía = sin etiqueta
 * (esa parte del renglón simplemente no se pinta).
 */
/** Pase con estilo de boleto premium (lo que recibe cada invitado). */
export function PassTicket({
  inv,
  size = "md",
  // Por omisión, los textos de la muestra: quien ya pintaba el boleto sin
  // pasar nada sigue viendo exactamente lo mismo.
  textos = { nombre: evento.nombre, fechaCorta: evento.fechaCorta },
}: {
  inv: Invitado;
  size?: "sm" | "md";
  textos?: TextosTicket;
}) {
  const vip = inv.tipo === "VIP";
  const qrSize = size === "sm" ? 76 : 172;
  const mesa = etiquetaMesa(inv.mesa);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#252a37] via-[#171a22] to-[#0d0f14] text-white shadow-xl ring-1 ring-white/10">
      {/* Barra de acento superior */}
      <div
        className={`h-1.5 w-full ${
          vip
            ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300"
            : "bg-gradient-to-r from-white/10 via-white/30 to-white/10"
        }`}
      />

      <div className={size === "sm" ? "px-5 pt-4" : "px-7 pt-6"}>
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-xs uppercase tracking-[0.22em] text-white/55">
            {textos.nombre}
          </span>
          {vip ? (
            <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-300/40">
              VIP
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-white/60">
              Acceso
            </span>
          )}
        </div>
        <h3 className={`mt-3 font-semibold leading-tight ${size === "sm" ? "text-lg" : "text-2xl"}`}>
          {inv.nombre}
        </h3>
        <p className="mt-1 text-sm text-white/55">
          {mesa ? `${mesa} · ` : ""}
          {inv.personas} {inv.personas === 1 ? "persona" : "personas"}
        </p>
      </div>

      {/* Perforación tipo boleto */}
      <div className="relative my-4">
        <div className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
        <div className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
        <div className={`border-t border-dashed border-white/25 ${size === "sm" ? "mx-5" : "mx-7"}`} />
      </div>

      {/* Código QR */}
      <div className={`flex flex-col items-center pb-6 ${size === "sm" ? "px-5" : "px-7"}`}>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <QRCodeSVG
            value={contenidoQR(inv)}
            size={qrSize}
            level="M"
            marginSize={0}
            fgColor="#0d0f14"
            bgColor="#ffffff"
          />
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/40">
          Pase {inv.id}
          {textos.fechaCorta ? ` · ${textos.fechaCorta}` : ""}
        </p>
        {size !== "sm" ? (
          <p className="mt-1 text-xs text-white/55">Presenta este código en la entrada</p>
        ) : null}
      </div>
    </div>
  );
}
