import { Logo, ThemeToggle } from "@salones/ui";
import { evento } from "@/lib/evento";
import { PasesCliente } from "@/components/pases-cliente";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Logo />
        <ThemeToggle />
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Control de acceso</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Pases con QR · {evento.nombre}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Cada invitado recibe un pase con código QR. En la entrada lo escaneas para controlar el
            acceso: rápido, ordenado y sin colados.
          </p>
        </div>

        <PasesCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground">
          {evento.lugar} · Demo de {evento.organizador.nombre}. En esta demostración el estado de
          ingreso se guarda en este mismo dispositivo.
        </div>
      </footer>
    </main>
  );
}
