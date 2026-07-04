import { ThemeToggle, buttonVariants } from "@salones/ui";
import { MessageCircle, Sparkles } from "lucide-react";
import { vendedor } from "@/lib/catalogo";
import { CatalogoCliente } from "@/components/catalogo-cliente";

const inicial = vendedor.nombre.trim().slice(0, 1).toUpperCase() || "S";

const waGeneral = `https://wa.me/${vendedor.whatsapp}?text=${encodeURIComponent(
  `¡Hola! Vi el catálogo de ${vendedor.nombre} y quiero más información.`,
)}`;

export default function Page() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-[var(--radius)] bg-primary text-sm font-bold text-primary-foreground">
              {inicial}
            </span>
            <span>{vendedor.nombre}</span>
          </span>
          <div className="flex items-center gap-2">
            <a
              href={waGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <MessageCircle className="size-4" /> <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Portada */}
      <section className="border-b border-border bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Catálogo de apps para tu salón
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Toda tu operación digital, <span className="text-primary">en un solo lugar</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground md:text-lg">
            Elige las apps que necesita tu salón y arma tu paquete a la medida. Tres formas de
            contratar: <strong className="font-medium text-foreground">servicio gestionado</strong>,{" "}
            <strong className="font-medium text-foreground">renta mensual</strong> o{" "}
            <strong className="font-medium text-foreground">compra completa</strong>.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#catalogo" className={buttonVariants({ size: "lg" })}>
              Ver el catálogo
            </a>
            <a
              href={waGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <MessageCircle className="size-4" /> Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Catálogo interactivo */}
      <section id="catalogo" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <CatalogoCliente />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-medium text-foreground">{vendedor.nombre}</div>
              <div>{vendedor.tagline}</div>
            </div>
            <a
              href={waGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <MessageCircle className="size-4" /> Escríbeme
            </a>
          </div>
          <p className="mt-6 text-xs">
            Precios de referencia en pesos mexicanos (MXN). La cotización final depende de las apps
            elegidas, el modelo y las necesidades de tu evento. Sitio de demostración.
          </p>
        </div>
      </footer>
    </main>
  );
}
