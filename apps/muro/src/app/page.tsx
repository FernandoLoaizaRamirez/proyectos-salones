import { ThemeToggle } from "@salones/ui";
import { estaConectado } from "@salones/sync";
import { evento } from "@/lib/muro";
import { MuroCliente } from "@/components/muro-cliente";

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
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

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Muro de mensajes · Libro de firmas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Los recuerdos de tus invitados, en una sola pared
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Cada invitado deja su mensaje y firma escaneando un código. Míralos aparecer aquí y
            proyéctalos en la fiesta con el “modo pantalla”.
          </p>
        </div>

        <MuroCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          {/*
           * El pie dice la VERDAD según cómo esté corriendo la app, no un texto
           * fijo. Hasta el 22 ago 2026 afirmaba siempre "se guardan en este
           * dispositivo", y llevaba meses siendo falso: las apps ya guardan en
           * el servidor. O sea que el pie le decía al salón que la demo hace
           * MENOS de lo que hace, justo donde se está intentando vender.
           * `estaConectado()` ya se usaba así en otras pantallas de esta misma
           * app; aquí faltaba.
           */}
          {evento.lugar} · Demo de {evento.organizador.nombre}.{" "}
          {estaConectado()
            ? "Los mensajes llegan a esta pared desde el teléfono de cada invitado, en vivo: así funcionará en tu evento."
            : "En esta demostración los mensajes se guardan en este dispositivo (se actualizan en vivo entre pestañas del mismo navegador); para reunir en una sola pantalla los mensajes de todos los teléfonos a la vez se conecta a un sistema central."}
        </div>
      </footer>
    </main>
  );
}
