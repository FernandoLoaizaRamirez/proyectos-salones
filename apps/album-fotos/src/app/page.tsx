import { Logo, ThemeToggle } from "@salones/ui";
import { Album } from "@/components/album";
import { Compartir } from "@/components/compartir";
import { PanelAnfitrion } from "@/components/panel-anfitrion";
import { evento } from "@/lib/album-data";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Álbum del evento</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Los recuerdos de {evento.nombre}, en un solo lugar
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {/* "recuerdos" y no "fotos y videos": esta portada se pinta en el
                servidor, antes de saber si el evento tiene el paquete de video,
                y prometer videos que luego no se pueden subir sería peor que
                no nombrarlos. */}
            Cada invitado sube sus recuerdos escaneando un código, y todos los disfrutan y descargan
            juntos. Sin apps ni complicaciones.
          </p>
        </div>

        {/* Solo aparece para quien organiza; para un invitado no se dibuja nada. */}
        <div className="mb-8 space-y-4">
          <PanelAnfitrion />
          <Compartir />
        </div>

        <Album />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground">
          Álbum de {evento.nombre} · Demo de {evento.organizador}. En esta demostración los archivos
          se quedan en tu dispositivo; para un evento real, todos ven las fotos de todos.
        </div>
      </footer>
    </main>
  );
}
