import { ThemeToggle } from "@salones/ui";
import { evento } from "@/lib/brindis";
import { BrindisCliente, CompartirBrindis } from "@/components/brindis-cliente";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          {/*
           * `min-w-0` a la izquierda y `shrink-0` a la derecha: sin eso, en un
           * celular de 375 px el nombre del evento se negaba a encogerse y
           * empujaba "Compartir" y el botón de tema FUERA de la pantalla (la
           * página medía 423 px y se arrastraba de lado). El `min-w-0` de aquí
           * abajo no bastaba: el que tiene que poder encogerse es ESTE bloque,
           * que es el hijo directo del flex.
           */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] bg-primary text-sm font-bold text-primary-foreground">
              SR
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">{evento.nombre}</div>
              <div className="truncate text-xs text-muted-foreground">Brindis en video</div>
            </div>
          </div>
          {/* En el celular estos dos van con puro icono: con sus rotulos se
              comian 206 px de los 342 y el nombre de la boda quedaba en
              "Boda An...". */}
          <div className="flex shrink-0 items-center gap-2">
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
          {evento.lugar} · Demo de {evento.organizador.nombre}. Tu video se graba en tu teléfono y
          solo sale de él si pulsas “Enviar a los novios”: entonces se guarda en el álbum del
          evento, donde lo ven los anfitriones.
        </div>
      </footer>
    </main>
  );
}
