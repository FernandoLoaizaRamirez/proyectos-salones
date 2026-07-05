"use client";

import * as React from "react";

/** Cuenta regresiva hasta la fecha del evento. */
export function CuentaRegresiva({ fechaISO }: { fechaISO: string }) {
  const objetivo = React.useMemo(() => new Date(fechaISO).getTime(), [fechaISO]);
  const [ahora, setAhora] = React.useState<number | null>(null);

  React.useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Antes de montar en el cliente no renderizamos números (evita desajustes).
  const restante = ahora === null ? null : Math.max(0, objetivo - ahora);

  const dias = restante === null ? 0 : Math.floor(restante / 86400000);
  const horas = restante === null ? 0 : Math.floor((restante % 86400000) / 3600000);
  const min = restante === null ? 0 : Math.floor((restante % 3600000) / 60000);
  const seg = restante === null ? 0 : Math.floor((restante % 60000) / 1000);

  const bloques = [
    { valor: dias, etiqueta: "días" },
    { valor: horas, etiqueta: "horas" },
    { valor: min, etiqueta: "min" },
    { valor: seg, etiqueta: "seg" },
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5" aria-live="off">
      {bloques.map((b) => (
        <div key={b.etiqueta} className="flex min-w-16 flex-col items-center sm:min-w-20">
          <span className="font-display text-4xl leading-none text-cream sm:text-5xl">
            {ahora === null ? "–" : String(b.valor).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-cream/70">
            {b.etiqueta}
          </span>
        </div>
      ))}
    </div>
  );
}
