import { ThemeToggle } from "@salones/ui";
import { evento } from "@/lib/rsvp";
import { RsvpCliente } from "@/components/rsvp-cliente";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
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

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Confirmación de asistencia · RSVP</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Quién viene, quién falta y cuántos son
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Arma tu lista, envía a cada invitado su enlace y observa las confirmaciones llegar. Sin
            llamadas ni hojas de cálculo.
          </p>
        </div>

        <RsvpCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          {evento.lugar} · Demo de {evento.organizador.nombre}. En esta demostración las respuestas
          se guardan en este dispositivo (se actualizan en vivo entre pestañas del mismo navegador);
          para varios organizadores a la vez se conecta a un sistema central.
        </div>
      </footer>
    </main>
  );
}
