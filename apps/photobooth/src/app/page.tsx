import { ThemeToggle } from "@salones/ui";
import {
  PhotoboothCliente,
  CompartirBooth,
  TituloBooth,
  PieBooth,
} from "@/components/photobooth-cliente";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-[var(--radius)] bg-primary text-sm font-bold text-primary-foreground">
              SR
            </div>
            {/* El nombre lo pinta el cliente: es él quien sabe de qué evento es. */}
            <TituloBooth />
          </div>
          <div className="flex items-center gap-2">
            <CompartirBooth />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="grid place-items-center px-6 py-10">
        <PhotoboothCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-8 text-center text-xs text-muted-foreground">
          <PieBooth />
        </div>
      </footer>
    </main>
  );
}
