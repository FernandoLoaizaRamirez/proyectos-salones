import { ThemeToggle } from "@salones/ui";
import { evento } from "@/lib/brindis";
import { GaleriaCliente } from "@/components/galeria-cliente";

export const metadata = {
  title: `Galería de brindis · ${evento.nombre}`,
};

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
              <div className="truncate text-xs text-muted-foreground">Galería de brindis</div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Panel del anfitrión</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Galería de brindis</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Todos los videos que enviaron tus invitados, reunidos en un solo lugar. Reprodúcelos o
            descárgalos.
          </p>
        </div>
        <GaleriaCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-8 text-center text-xs text-muted-foreground">
          {evento.lugar} · Demo de {evento.organizador.nombre}.
        </div>
      </footer>
    </main>
  );
}
