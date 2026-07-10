import { ThemeToggle } from "@salones/ui";
import { PedirCliente } from "@/components/pedir-cliente";
import { evento } from "@/lib/playlist";

export default function PedirPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">{evento.nombre}</div>
            <div className="truncate text-xs text-muted-foreground">Playlist colaborativa</div>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <section className="grid place-items-center px-6 py-10">
        <PedirCliente />
      </section>
    </main>
  );
}
