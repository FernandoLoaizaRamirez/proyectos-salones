import { Logo, ThemeToggle } from "@salones/ui";
import { Album } from "@/components/album";
import { obtenerModo } from "@/lib/modo";

export default function Page() {
  const modo = obtenerModo();

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:inline">
            Modo: {modo === "aislado" ? "Aislado (datos locales)" : "Integrado (evento compartido)"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Álbum de fotos del evento</h1>
          <p className="max-w-2xl text-muted-foreground">
            Los invitados suben sus fotos y videos escaneando un código, y todos los disfrutan y
            descargan en un solo lugar.
          </p>
        </div>
        <Album />
      </section>
    </main>
  );
}
