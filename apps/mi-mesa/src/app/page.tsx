import { ThemeToggle } from "@salones/ui";
import { evento } from "@/lib/mimesa";
import { MiMesaCliente } from "@/components/mi-mesa-cliente";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">{evento.nombre}</div>
            <div className="truncate text-xs text-muted-foreground">Encuentra tu mesa</div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="grid place-items-center px-6 py-12">
        <MiMesaCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-8 text-center text-xs text-muted-foreground">
          {evento.lugar} · Demo de {evento.organizador.nombre}. Usa el mismo acomodo que la app
          “Acomodo de mesas”: se abre por enlace o se carga el mismo archivo.
        </div>
      </footer>
    </main>
  );
}
