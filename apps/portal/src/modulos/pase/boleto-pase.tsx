"use client";

/**
 * EL BOLETO DEL PORTAL — el pase pintado con los tokens del tema del salón.
 *
 * No es una copia del boleto oscuro de la app de la puerta: aquí el pase vive
 * dentro de la experiencia y viste los colores de la casa (la lección del
 * arcoíris: cero colores propios). Lo único innegociable es el panel BLANCO
 * del QR con el código casi negro: el contraste es lo que el escáner de la
 * puerta necesita, en tema claro y en oscuro por igual.
 *
 * El contenido del QR es `contenidoQRPase` de @salones/core — exactamente el
 * que espera el escáner.
 */
import { QRCodeSVG } from "qrcode.react";
import { contenidoQRPase, etiquetaMesa, type PaseInvitado } from "./lib";

export function BoletoPase({ pase }: { pase: PaseInvitado }) {
  const vip = pase.tipo === "VIP";
  const mesa = etiquetaMesa(pase.mesa);

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm">
      {/* La franja de la casa (el acento del salón, no un dorado quemado). */}
      <div className="h-1.5 w-full bg-primary" />

      <div className="px-6 pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
            Pase del evento
          </span>
          <span
            className={
              vip
                ? "shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/30"
                : "shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
            }
          >
            {vip ? "VIP" : "Acceso"}
          </span>
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight">
          {pase.nombre}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mesa ? `${mesa} · ` : ""}
          {pase.personas} {pase.personas === 1 ? "persona" : "personas"}
        </p>
      </div>

      {/* Perforación tipo boleto. */}
      <div className="relative my-5">
        <div className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border-r border-border bg-background" />
        <div className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border-l border-border bg-background" />
        <div className="mx-6 border-t border-dashed border-border" />
      </div>

      <div className="flex flex-col items-center px-6 pb-6">
        {/* Panel SIEMPRE blanco: es lo que el escáner necesita leer. */}
        <div className="rounded-[var(--radius)] bg-white p-3 shadow-sm ring-1 ring-black/10">
          <QRCodeSVG
            value={contenidoQRPase(pase.id)}
            size={172}
            level="M"
            marginSize={0}
            fgColor="#111111"
            bgColor="#ffffff"
          />
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Pase {pase.id}
        </p>
      </div>
    </div>
  );
}
