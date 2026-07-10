import { ThemeToggle } from "@salones/ui";
import { evento } from "@/lib/brindis";
import { BrindisCliente, CompartirBrindis } from "@/components/brindis-cliente";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-[var(--radius)] bg-primary text-sm font-bold text-primary-foreground">
              SR
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">{evento.nombre}</div>
              <div className="truncate text-xs text-muted-foreground">Brindis en video</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CompartirBrindis />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="grid place-items-center px-6 py-10">
        <BrindisCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-8 text-center text-xs text-muted-foreground">
          {evento.lugar} · Demo de {evento.organizador.nombre}. Los videos se graban y quedan en tu
          teléfono; no se suben a ningún servidor en esta demostración.
        </div>
      </footer>
    </main>
  );
}
