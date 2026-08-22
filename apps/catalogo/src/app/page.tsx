import Link from "next/link";
import { ThemeToggle, buttonVariants, cn } from "@salones/ui";
import { Camera, Check, ChevronDown, MessageCircle, QrCode, Sparkles, Wifi } from "lucide-react";
import { AppMode } from "@salones/core";
import {
  demosDestacadas,
  modelosDeProducto,
  money,
  preguntasFrecuentes,
  productos,
  vendedor,
} from "@/lib/catalogo";
import { EnlaceDemo, QRDemo } from "@/components/demo-vitrina";
import { CatalogoCliente } from "@/components/catalogo-cliente";

const inicial = vendedor.nombre.trim().slice(0, 1).toUpperCase() || "S";

const waGeneral = `https://wa.me/${vendedor.whatsapp}?text=${encodeURIComponent(
  `¡Hola! Vi el catálogo de ${vendedor.nombre} y quiero más información.`,
)}`;

// El precio ancla del hero se calcula de los precios reales (la app más barata
// en gestionado), para que nunca se quede viejo si algún día cambian.
const desdePorEvento = Math.min(
  ...productos
    .filter((p) => modelosDeProducto(p).includes(AppMode.Managed))
    .map((p) => p.precios.MANAGED),
);

const demoPrincipal = productos.find((p) => p.id === demosDestacadas.principal)!;
const demosSecundarias = demosDestacadas.secundarias
  .map((id) => productos.find((p) => p.id === id))
  .filter((p): p is (typeof productos)[number] => Boolean(p?.demoUrl));

/** Textos de los chips de las demos suplentes, por id de app. */
const invitacionDemo: Record<string, string> = {
  muro: "O deja un mensaje en el muro",
  playlist: "O pide una canción al DJ",
};

const pasos = [
  {
    icono: QrCode,
    titulo: "Ponemos un letrerito con un código QR en cada mesa",
    detalle: "Te lo damos listo para imprimir.",
  },
  {
    icono: Camera,
    titulo: "Tus invitados lo apuntan con la pura cámara",
    detalle: "Sin bajar nada, sin registrarse.",
  },
  {
    icono: Sparkles,
    titulo: "Todo se junta solito en un mismo lugar",
    detalle: "Las fotos, los mensajes y las canciones de todos.",
  },
];

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

      {/* Portada: la promesa en una frase. Aquí NO se habla de modelos de
          contratación: esa decisión vive mucho más abajo, cuando el visitante
          ya entendió y probó el producto. */}
      <section className="border-b border-border bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Para salones de eventos en México
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Lo que hace que elijan <span className="text-primary">tu salón</span> y no el de
            enfrente
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground md:text-lg">
            Fotos, mensajes, canciones y juegos que tus invitados comparten con la pura cámara de su
            celular: escanean un código y listo. Nadie instala nada, nadie se registra. Desde{" "}
            <strong className="font-medium text-foreground">
              {money(desdePorEvento)} por evento
            </strong>
            .
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#demo" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
              Pruébalo en 30 segundos
            </a>
            <a
              href={waGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            >
              <MessageCircle className="size-4" /> Escríbeme por WhatsApp
            </a>
          </div>
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5 text-primary" /> Sin instalar apps
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5 text-primary" /> Funciona en cualquier celular
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5 text-primary" /> Lo pruebas gratis ahorita
            </span>
          </p>
        </div>
      </section>

      {/* Demo viva: la mejor venta es vivirlo como invitado. En el celular (el
          caso normal: el enlace llega por WhatsApp) un botón abre la demo, y
          ya ERES el teléfono del invitado. En computadora no puedes escanear
          tu propia pantalla desde ella, así que el QR ES la experiencia: lo
          apuntas con tu celular como lo haría un invitado en la mesa. */}
      <section id="demo" className="scroll-mt-20 border-b border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Vívelo como si fueras un invitado
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Haz de cuenta que estás en una boda en tu salón. Tu celular es el celular del invitado.
          </p>

          {/* En el celular: botón directo a la demo estrella + dos suplentes. */}
          <div className="mt-8 md:hidden">
            <EnlaceDemo
              href={demoPrincipal.demoUrl!}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              <Camera className="size-5" /> Tómate una foto en el photobooth
            </EnlaceDemo>
            <div className="mt-3 flex flex-col gap-2">
              {demosSecundarias.map((p) => (
                <EnlaceDemo
                  key={p.id}
                  href={p.demoUrl!}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                >
                  {invitacionDemo[p.id] ?? `O prueba ${p.nombre}`}
                </EnlaceDemo>
              ))}
            </div>
          </div>

          {/* En computadora: la tarjetita de mesa con el QR de verdad. */}
          <div className="mt-10 hidden flex-col items-center md:flex">
            <div className="rounded-xl border border-border bg-card p-5 shadow-lg">
              <QRDemo value={demoPrincipal.demoUrl!} size={180} />
              <p className="mt-3 max-w-[220px] text-sm font-medium">
                Apunta la cámara de tu celular a este código
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Así de fácil lo harán tus invitados
              </p>
            </div>
            {/* La patita del letrerito de mesa. */}
            <div
              aria-hidden="true"
              className="h-3 w-28 bg-border [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]"
            />
            <p className="mt-4 text-xs text-muted-foreground">
              ¿Sin celular a la mano? Ábrelas con un clic:{" "}
              {[demoPrincipal, ...demosSecundarias].map((p, i) => (
                <span key={p.id}>
                  {i > 0 ? " · " : null}
                  <EnlaceDemo
                    href={p.demoUrl!}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {p.nombre.toLowerCase()}
                  </EnlaceDemo>
                </span>
              ))}
            </p>
          </div>

          <p className="mx-auto mt-8 max-w-xl text-sm text-muted-foreground">
            Eso que acabas de hacer es exactamente lo que haría cada invitado en tu salón. Sin
            instalar nada.
          </p>
        </div>
      </section>

      {/* Así funciona, en tres pasos y sin tecnicismos. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Así de fácil: 1, 2, 3
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {pasos.map((paso, i) => {
              const Icono = paso.icono;
              return (
                <div
                  key={paso.titulo}
                  className="rounded-[var(--radius)] border border-border bg-card p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-semibold text-primary">{i + 1}</span>
                    <Icono className="size-6 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="mt-3 font-medium">{paso.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{paso.detalle}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            <Wifi className="size-4 text-primary" aria-hidden="true" />
            <span>
              ¿Qué necesitas tú? Internet en tu salón. Eso es todo. La pantalla es opcional, y el
              equipo lo ponen tus invitados: su propio celular.
            </span>
          </p>
        </div>
      </section>

      {/* Catálogo interactivo: las apps por etapa, los modelos, los paquetes y
          la cotización por WhatsApp. */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <CatalogoCliente />
      </section>

      {/* Las dudas que le preguntarían a un vendedor, ya respondidas. */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Las dudas que seguro traes
          </h2>
          <div className="mt-8">
            {preguntasFrecuentes.map((f) => (
              <details key={f.pregunta} className="group border-b border-border">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-left font-medium [&::-webkit-details-marker]:hidden">
                  {f.pregunta}
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pb-4 text-sm text-muted-foreground">
                  {f.respuesta}
                  {f.enlace ? (
                    <>
                      {" "}
                      <Link
                        href={f.enlace.href}
                        className="inline-block py-1 underline underline-offset-2 hover:text-foreground"
                      >
                        {f.enlace.texto}
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              </details>
            ))}
          </div>
        </div>
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
          {/*
           * Las tres páginas legales existían desde julio y NINGUNA pantalla
           * enlazaba a ellas: publicadas y, en la práctica, invisibles. Aquí van
           * enlaces internos (no la dirección absoluta de `NEXT_PUBLIC_LEGAL_URL`)
           * porque estas páginas viven en esta misma app.
           */}
          {/* `inline-block py-1.5`: con la letra chica del pie estos enlaces
              medían 16 px de alto y en el celular no se podían atinar con el
              dedo. El relleno los lleva a 28 px sin cambiar cómo se ven. */}
          <p className="mt-6 text-xs">
            <Link
              href="/legal/privacidad"
              className="inline-block py-1.5 underline underline-offset-2 hover:text-foreground"
            >
              Aviso de privacidad
            </Link>
            {" · "}
            <Link
              href="/legal/imagen"
              className="inline-block py-1.5 underline underline-offset-2 hover:text-foreground"
            >
              Uso de tu imagen
            </Link>
            {" · "}
            <Link
              href="/legal/terminos"
              className="inline-block py-1.5 underline underline-offset-2 hover:text-foreground"
            >
              Términos del servicio
            </Link>
          </p>
          <p className="mt-3 text-xs">
            Precios de referencia en pesos mexicanos (MXN). La cotización final depende de las apps
            elegidas, el modelo y las necesidades de tu evento. Sitio de demostración.
          </p>
        </div>
      </footer>
    </main>
  );
}
