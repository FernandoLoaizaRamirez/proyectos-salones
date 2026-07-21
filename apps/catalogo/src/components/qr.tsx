"use client";

import { QRCodeSVG } from "qrcode.react";

/** Código QR sobre fondo blanco (para que se lea bien en cualquier tema). */
export function QR({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <div className="inline-block rounded-[var(--radius)] bg-white p-3">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={0}
        fgColor="#111111"
        bgColor="#ffffff"
      />
    </div>
  );
}
