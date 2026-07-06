import { ThemeToggle } from "@salones/ui";
import { evento } from "@/lib/recuerditos";
import { RecuerditoCliente } from "@/components/recuerdito-cliente";

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
              <div className="truncate text-xs text-muted-foreground">Recuerditos digitales</div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Recuerditos digitales</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Llévate un recuerdo de la fiesta
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Crea tu tarjeta de recuerdo del evento: elige un diseño, pon tu nombre, un mensaje y
            hasta una foto. Descárgala o compártela a tu teléfono.
          </p>
        </div>

        <RecuerditoCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground">
          {evento.nombre} · Demo de {evento.organizador.nombre}. La tarjeta se genera en tu propio
          dispositivo.
        </div>
      </footer>
    </main>
  );
}
