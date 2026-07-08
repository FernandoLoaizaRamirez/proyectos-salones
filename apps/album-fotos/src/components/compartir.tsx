"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, QrCode } from "lucide-react";
import { Button } from "@salones/ui";

/** Tarjeta para compartir el álbum: los invitados escanean el QR para unirse. */
export function Compartir() {
  const [url, setUrl] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);

  React.useEffect(() => {
    setUrl(window.location.origin);
  }, []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 rounded-[var(--radius)] border border-border bg-card p-6 text-center sm:flex-row sm:text-left">
      <div className="shrink-0 rounded-xl bg-white p-3 shadow-sm">
        {url ? (
          <QRCodeSVG value={url} size={116} level="M" marginSize={0} fgColor="#111111" bgColor="#ffffff" />
        ) : (
          <div className="size-[116px]" />
        )}
      </div>
      <div>
        <h3 className="flex items-center justify-center gap-2 font-semibold sm:justify-start">
          <QrCode className="size-4 text-primary" /> Comparte el álbum
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Los invitados escanean este código para abrir el álbum en su teléfono y subir sus fotos y
          videos al instante.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={copiar}>
          {copiado ? (
            <>
              <Check className="size-4" /> ¡Enlace copiado!
            </>
          ) : (
            <>
              <Copy className="size-4" /> Copiar enlace
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
