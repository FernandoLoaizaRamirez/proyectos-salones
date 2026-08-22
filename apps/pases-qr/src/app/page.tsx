import { ThemeToggle } from "@salones/ui";
import { estaConectado } from "@salones/sync";
import { evento } from "@/lib/evento";
import { PasesCliente } from "@/components/pases-cliente";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-[var(--radius)] bg-primary text-sm font-bold text-primary-foreground">
              SR
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">{evento.nombre}</div>
              <div className="truncate text-xs text-muted-foreground">{evento.lugar}</div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Pases con QR · Control de acceso</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Crea, envía y valida los pases de tu evento
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Agrega a tus invitados y cada uno recibe un pase con código QR. En la entrada lo
            escaneas para controlar el acceso: rápido, ordenado y sin colados.
          </p>
        </div>

        <PasesCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground">
          {/*
           * El pie dice la VERDAD según cómo esté corriendo la app, no un texto
           * fijo. Hasta el 22 ago 2026 afirmaba siempre "se guardan en este
           * dispositivo", y llevaba meses siendo falso: las apps ya guardan en
           * el servidor. O sea que el pie le decía al salón que la demo hace
           * MENOS de lo que hace, justo donde se está intentando vender.
           * `estaConectado()` ya se usaba así en otras pantallas de esta misma
           * app; aquí faltaba.
           */}
          {evento.lugar} · Demo de {evento.organizador.nombre}.{" "}
          {estaConectado()
            ? "La lista y el registro de la puerta viven en el evento: dos entradas ven lo mismo y nada se pierde si un teléfono se queda sin batería."
            : "En esta demostración la lista y el registro se guardan en este dispositivo, ya separados por evento; con el servicio conectado viven en el evento y dos entradas ven lo mismo."}
        </div>
      </footer>
    </main>
  );
}
