import { ThemeToggle } from "@salones/ui";
import { evento } from "@/lib/playlist";
import { DjCliente } from "@/components/dj-cliente";

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
          <p className="text-sm font-medium text-primary">Playlist colaborativa · Panel del DJ</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            La música la eligen tus invitados
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Los invitados piden canciones y votan por sus favoritas. Tú ves la lista ordenada por
            votos y marcas cuáles ya pusiste. Comparte el código para que empiecen a pedir.
          </p>
        </div>

        <DjCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground">
          {evento.lugar} · Demo de {evento.organizador.nombre}. En esta demostración las peticiones se
          guardan en este dispositivo (se actualizan en vivo entre pestañas del mismo navegador);
          para juntar las peticiones de todos los teléfonos en una sola lista se conecta a un sistema
          central.
        </div>
      </footer>
    </main>
  );
}
