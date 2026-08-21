"use client";

import * as React from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Info,
  MessageCircle,
  Package,
  Plus,
  Smartphone,
} from "lucide-react";
import { Button, buttonVariants, Card, cn } from "@salones/ui";
import { AppMode } from "@salones/core";
import {
  vendedor,
  modelos,
  productos,
  paquetes,
  etapas,
  appsDelPaquete,
  precioPaquete,
  precioPaqueteBruto,
  modelosDeProducto,
  modelosDePaquete,
  nombreModelo,
  notaHonestaGeneral,
  money,
  type Modelo,
  type Producto,
} from "@/lib/catalogo";

const infoModelo = (m: Modelo) => modelos.find((x) => x.clave === m)!;

/** ¿La app solo se vende (hoy, el sitio web)? Entonces siempre es pago único. */
const soloSeVende = (p: Producto) => {
  const m = modelosDeProducto(p);
  return m.length === 1 && m[0] === AppMode.Owned;
};

/**
 * Tarjeta de una app. Vive FUERA del componente principal para conservar su
 * identidad entre renders: si se definiera adentro, React la desmontaría en
 * cada clic y el <details> de "Más detalles" se cerraría solo.
 */
function TarjetaApp({
  p,
  activo,
  enPaquete,
  onToggle,
}: {
  p: Producto;
  activo: boolean;
  /** La app ya viene dentro de un paquete agregado: no se puede cobrar doble. */
  enPaquete: boolean;
  onToggle: () => void;
}) {
  const Icono = p.icono;
  const ofertados = modelos.filter((m) => modelosDeProducto(p).includes(m.clave));
  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden transition-all",
        activo || enPaquete ? "ring-2 ring-primary" : "hover:shadow-md",
      )}
    >
      {p.destacado ? (
        <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          Más popular
        </span>
      ) : null}

      <div className="p-6 pb-5">
        <div
          className={cn(
            "mb-4 grid size-12 place-items-center rounded-[var(--radius)] bg-gradient-to-br text-white",
            p.acento,
          )}
        >
          <Icono className="size-6" />
        </div>
        <h4 className="text-lg font-semibold tracking-tight">{p.nombre}</h4>
        <p className="mt-1.5 text-sm text-muted-foreground">{p.beneficio}</p>

        {/* Una sola cifra ancla, estable: la del gestionado ("desde"). Los tres
            precios completos viven en "Más detalles". El sitio web es aparte:
            se hace una vez y se vende. */}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
          {soloSeVende(p) ? (
            <>
              <span className="text-xl font-semibold">{money(p.precios.OWNED)}</span>
              <span className="text-xs text-muted-foreground">
                se hace una vez y es tuyo para siempre
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">desde</span>
              <span className="text-xl font-semibold">{money(p.precios.MANAGED)}</span>
              <span className="text-xs text-muted-foreground">/evento</span>
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {p.demoUrl ? (
            <a
              href={p.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              <ExternalLink className="size-4" /> Ver demo
            </a>
          ) : null}
          {enPaquete ? (
            /* Sin cobro doble: si un paquete agregado ya la incluye, aquí no se
               puede volver a sumar. La selección suelta queda guardada por si
               el paquete se quita después. */
            <Button variant="outline" disabled className={p.demoUrl ? "flex-1" : "w-full"}>
              <Check className="size-4" /> Ya viene en tu paquete
            </Button>
          ) : (
            <Button
              variant={activo ? "primary" : "outline"}
              className={p.demoUrl ? "flex-1" : "w-full"}
              onClick={onToggle}
              aria-pressed={activo}
            >
              {activo ? (
                <>
                  <Check className="size-4" /> Agregado
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Agregar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* La letra completa (descripción, nota honesta y los 3 precios) a un tap
          de distancia: la lee justo quien ya se interesó. */}
      <details className="group mt-auto border-t border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          Más detalles
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 px-6 pb-5">
          <p className="text-sm text-muted-foreground">{p.descripcion}</p>
          {p.notaGestionado ? (
            <p className="flex gap-1.5 rounded-[var(--radius)] bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{p.notaGestionado}</span>
            </p>
          ) : null}
          {soloSeVende(p) ? (
            <p className="text-xs text-muted-foreground">
              Hecho a la medida de tu marca: se vende, no se renta.{" "}
              <span className="whitespace-nowrap">{money(p.precios.OWNED)} pago único</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {ofertados.map((m, i) => (
                <React.Fragment key={m.clave}>
                  {i > 0 ? " · " : null}
                  <span className="whitespace-nowrap">
                    {`${m.corto} ${money(p.precios[m.clave])}${m.periodo}`}
                  </span>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}

export function CatalogoCliente() {
  // El gestionado abre por defecto A PROPÓSITO: es la puerta de entrada barata
  // (por evento, sin contratos) y así lo que se prueba y lo que se cotiza
  // coinciden. Antes abría en Renta y los paquetes con sitio web aparecían sin
  // precio en la primera pantalla.
  const [modelo, setModelo] = React.useState<Modelo>(AppMode.Managed);
  const [selApps, setSelApps] = React.useState<Record<string, boolean>>({});
  const [selPaq, setSelPaq] = React.useState<Record<string, boolean>>({});

  const modeloInfo = infoModelo(modelo);

  // Paquetes elegidos que SÍ aplican en el modelo actual, y los que quedaron
  // fuera al cambiar de modelo (p. ej. Todo Incluido elegido en Compra y luego
  // cambiar a Gestionado): esos no se cobran, pero tampoco desaparecen en
  // silencio — se avisan en su tarjeta y en el resumen.
  const paqSel = paquetes.filter((pk) => selPaq[pk.id] && modelosDePaquete(pk).includes(modelo));
  const paqFuera = paquetes.filter(
    (pk) => selPaq[pk.id] && !modelosDePaquete(pk).includes(modelo),
  );

  // Sin cobro doble: las apps que ya vienen dentro de un paquete agregado no
  // se suman sueltas (su tarjeta lo dice). Se parte de paqSel, no de selPaq,
  // para que un paquete fuera del modelo no "absorba" apps que sí se cobran.
  const enPaquete = new Set(paqSel.flatMap((pk) => pk.incluye));

  // La selección de apps se parte en dos para no mezclar peras con manzanas:
  // lo que se cobra en el modelo elegido (por evento / por mes / pago único) y
  // lo que SOLO se vende (hoy, el sitio web), que siempre es pago único aparte.
  const appsSel = productos.filter((p) => selApps[p.id] && !enPaquete.has(p.id));
  const appsModelo = appsSel.filter((p) => modelosDeProducto(p).includes(modelo));
  const appsUnicas = appsSel.filter((p) => !modelosDeProducto(p).includes(modelo));

  const totalPeriodico =
    appsModelo.reduce((s, p) => s + p.precios[modelo], 0) +
    paqSel.reduce((s, pk) => s + precioPaquete(pk, modelo), 0);
  const totalUnico = appsUnicas.reduce((s, p) => s + p.precios[AppMode.Owned], 0);

  const nSel = appsModelo.length + appsUnicas.length + paqSel.length;

  // Cuando TODO lo elegido es pago único (solo el sitio web), etiquetarlo con
  // el modelo ("Servicio gestionado") era una contradicción: se omite.
  const soloUnico = totalPeriodico === 0 && totalUnico > 0;

  const textoTotal =
    totalPeriodico > 0 && totalUnico > 0
      ? `${money(totalPeriodico)}${modeloInfo.periodo} + ${money(totalUnico)} por única vez`
      : totalPeriodico > 0
        ? `${money(totalPeriodico)}${modeloInfo.periodo}`
        : `${money(totalUnico)} pago único`;

  const toggleApp = (id: string) => setSelApps((s) => ({ ...s, [id]: !s[id] }));
  const togglePaq = (id: string) => setSelPaq((s) => ({ ...s, [id]: !s[id] }));

  // El enlace de cotizar se arma en el render (no con window.open al hacer
  // clic): los navegadores metidos dentro de Facebook/Instagram/WhatsApp
  // ignoran window.open, y este catálogo llega justo por esas apps.
  const lineas =
    nSel === 0
      ? [`¡Hola! Vi el catálogo de ${vendedor.nombre}. Todavía no sé qué me conviene: ¿me orientan?`]
      : [
          `¡Hola! Me interesa contratar con ${vendedor.nombre}.`,
          ...(soloUnico ? [] : [`Modelo de contratación: ${modeloInfo.nombre}.`]),
          "",
          ...paqSel.map(
            (pk) =>
              `• Paquete ${pk.nombre.replace(/^Paquete /, "")} (${appsDelPaquete(pk)
                .map((a) => a.nombre)
                .join(", ")}) — ${money(precioPaquete(pk, modelo))}${modeloInfo.periodo}`,
          ),
          ...appsModelo.map(
            (p) => `• ${p.nombre} — ${money(p.precios[modelo])}${modeloInfo.periodo}`,
          ),
          ...appsUnicas.map(
            (p) => `• ${p.nombre} — ${money(p.precios[AppMode.Owned])} pago único (solo se vende)`,
          ),
          "",
          `Total estimado: ${textoTotal}`,
          "¿Me pueden dar una cotización?",
        ].filter(Boolean);
  const urlCotizar = `https://wa.me/${vendedor.whatsapp}?text=${encodeURIComponent(
    lineas.join("\n"),
  )}`;

  const waEstrenar = `https://wa.me/${vendedor.whatsapp}?text=${encodeURIComponent(
    `¡Hola! Quiero estrenar la suite en mi próximo evento con el Servicio gestionado. ¿Me ayudas a armarlo?`,
  )}`;

  const sitio = productos.find((p) => soloSeVende(p));

  // La barra fija va al fondo de la VENTANA, pero el FAQ y el pie legal viven
  // después de este componente: el colchón se pone al final del <body> entero,
  // no aquí, o la barra taparía los enlaces legales para siempre.
  const hayBarra = nSel > 0;
  React.useEffect(() => {
    document.body.style.paddingBottom = hayBarra
      ? "calc(9.5rem + env(safe-area-inset-bottom))"
      : "";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [hayBarra]);

  return (
    <div>
      {/* ------------------------------------------------------------ */}
      {/* Las 12 apps, en el orden de tu fiesta                        */}
      {/* ------------------------------------------------------------ */}
      <section id="apps" className="scroll-mt-24">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Las 12 apps, en el orden de tu fiesta
          </h2>
          <p className="text-muted-foreground">
            Un evento en tu salón, de principio a fin. Empieza por el momento que más te duela.
          </p>
        </div>

        {/* Chips de navegación entre etapas: pegados bajo el header mientras
            recorres las tarjetas. top-[61px] = header real (py-3 + botón h-9 +
            borde). Un solo renglón siempre: en celular se desliza de lado, para
            que la pila pegajosa no crezca y tape los títulos al saltar. El velo
            de la derecha (solo en celular) es la señal de que hay más: sin él,
            el tercer chip se veía cortado a la mitad y parecía un error. */}
        <div className="sticky top-[61px] z-20 -mx-6 mb-8">
          <nav
            aria-label="Etapas de la fiesta"
            className="flex justify-start gap-2 overflow-x-auto bg-background/90 px-6 py-2 backdrop-blur [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden"
          >
            {etapas.map((e) => (
              <a
                key={e.id}
                href={`#${e.id}`}
                className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {e.titulo}
              </a>
            ))}
          </nav>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
          />
        </div>

        {etapas.map((etapa) => (
          <div key={etapa.id} id={etapa.id} className="mt-12 scroll-mt-32 first:mt-0">
            <h3 className="text-xl font-semibold tracking-tight">{etapa.titulo}</h3>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{etapa.escena}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {etapa.apps.map((id) => {
                const p = productos.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <TarjetaApp
                    key={p.id}
                    p={p}
                    activo={!!selApps[p.id]}
                    enPaquete={enPaquete.has(p.id)}
                    onToggle={() => toggleApp(p.id)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Epílogo: el remate emocional antes de hablar de dinero       */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-20 text-center">
        <Smartphone className="mx-auto size-8 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
          Al día siguiente, tu salón sigue en 200 teléfonos
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Con el servicio gestionado, cada invitado se va con las fotos del álbum, su foto del
          photobooth y el video del brindis — y en cada pantalla estuvo el nombre de tu salón. Es
          publicidad de boca en boca que se queda guardada en el teléfono de cada invitado.
        </p>
        <a href="#contratar" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
          Quiero esto en mi salón
        </a>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Los 3 modelos, en cristiano                                  */}
      {/* ------------------------------------------------------------ */}
      <section id="contratar" className="mt-20 scroll-mt-24">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            ¿Cómo te lo entrego?
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Tres formas de contratar, en cristiano. Elige una: los paquetes y tu cotización se
            acomodan solos.
          </p>
        </div>

        <div role="group" aria-label="Formas de contratar" className="grid gap-5 md:grid-cols-3">
          {modelos.map((m) => {
            const activo = modelo === m.clave;
            return (
              <Card
                key={m.clave}
                className={cn(
                  "relative flex flex-col overflow-hidden transition-all",
                  activo ? "ring-2 ring-primary" : "hover:shadow-md",
                )}
              >
                {/* La tarjeta entera elige el modelo mediante un botón-sábana
                    (absoluto, vacío, con nombre corto): así el CTA de WhatsApp
                    de abajo queda FUERA del control y el teclado y los lectores
                    de pantalla ven dos controles limpios, no uno anidado. */}
                <button
                  type="button"
                  aria-pressed={activo}
                  aria-label={`${m.nombre}: ${m.titular}`}
                  onClick={() => setModelo(m.clave)}
                  className="absolute inset-0 z-10 cursor-pointer rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex grow flex-col p-6">
                  {m.gafete ? (
                    <span className="mb-3 self-start rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      {m.gafete}
                    </span>
                  ) : null}
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {m.nombre}
                  </span>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">{m.titular}</h3>
                  <dl className="mt-4 space-y-2.5 text-sm">
                    {(
                      [
                        ["¿Quién lo opera?", m.quienOpera],
                        ["¿Cuánto dura?", m.cuantoDura],
                        ["¿Cuándo pagas?", m.cuandoPagas],
                        ["¿Para quién es?", m.paraQuien],
                      ] as const
                    ).map(([q, a]) => (
                      <div key={q}>
                        <dt className="text-xs font-medium text-muted-foreground">{q}</dt>
                        <dd>{a}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex items-center gap-1.5 text-sm font-medium">
                    {activo ? (
                      <>
                        <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> Elegido
                      </>
                    ) : (
                      <span className="text-muted-foreground">Tócalo para elegirlo</span>
                    )}
                  </div>
                </div>
                {m.ctaPropio ? (
                  <div className="relative z-20 px-6 pb-6">
                    <a
                      href={waEstrenar}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: activo ? "primary" : "outline", size: "sm" }),
                        "h-auto min-h-9 w-full whitespace-normal py-2",
                      )}
                    >
                      <MessageCircle className="size-4" /> {m.ctaPropio}
                    </a>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>

        <div className="mx-auto mt-6 max-w-3xl space-y-3">
          <p className="flex gap-1.5 rounded-[var(--radius)] bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{notaHonestaGeneral}</span>
          </p>
          {sitio ? (
            <p className="flex gap-1.5 rounded-[var(--radius)] bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                El sitio web de tu salón es aparte: se hace a tu medida y solo se vende (
                {money(sitio.precios.OWNED)}, un solo pago). Lo puedes agregar a tu cotización desde
                cualquiera de las tres formas.
              </span>
            </p>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Paquetes: los caminos ya armados                             */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-20">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            ¿No sabes por dónde empezar? Llévate un camino ya armado
          </h2>
          <p className="text-muted-foreground">
            Combos de varias apps a mejor precio que contratarlas por separado.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {paquetes.map((pk) => {
            const mDisp = modelosDePaquete(pk);
            const disponible = mDisp.includes(modelo);
            const activo = !!selPaq[pk.id] && disponible;
            const primero = mDisp[0]!;
            const bruto = precioPaqueteBruto(pk, modelo);
            const precio = precioPaquete(pk, modelo);
            const ahorro = bruto - precio;
            const pct = bruto > 0 ? Math.round((ahorro / bruto) * 100) : 0;
            return (
              <Card
                key={pk.id}
                className={cn(
                  "relative flex flex-col overflow-hidden transition-all",
                  activo
                    ? "ring-2 ring-primary"
                    : pk.destacado
                      ? "border-primary/40 hover:shadow-md"
                      : "hover:shadow-md",
                )}
              >
                {pk.destacado ? (
                  <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                    El más completo
                  </span>
                ) : null}
                <div className="p-6">
                  <div
                    className={cn(
                      "mb-4 grid size-12 place-items-center rounded-[var(--radius)] bg-gradient-to-br text-white",
                      pk.acento,
                    )}
                  >
                    <Package className="size-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{pk.nombre}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{pk.descripcion}</p>
                  <ul className="mt-4 space-y-1.5">
                    {appsDelPaquete(pk).map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm">
                        <Check className="size-4 shrink-0 text-primary" />
                        {a.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto border-t border-border p-6 pt-4">
                  {disponible ? (
                    <>
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm text-muted-foreground line-through">
                          {money(bruto)}
                        </span>
                        <span className="text-2xl font-semibold">{money(precio)}</span>
                        <span className="text-sm text-muted-foreground">{modeloInfo.periodo}</span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-primary">
                        Ahorras {pct}% · {money(ahorro)}
                        {modeloInfo.periodo}
                      </p>
                      <Button
                        variant={activo ? "primary" : "outline"}
                        className="mt-4 w-full"
                        onClick={() => togglePaq(pk.id)}
                        aria-pressed={activo}
                      >
                        {activo ? (
                          <>
                            <Check className="size-4" /> Agregado
                          </>
                        ) : (
                          <>
                            <Plus className="size-4" /> Agregar paquete
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">
                          Solo en {mDisp.map(nombreModelo).join(" o ")}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          (incluye el sitio web, que se vende).
                        </span>
                      </p>
                      {selPaq[pk.id] ? (
                        /* El paquete sigue elegido, pero aquí no cuenta: se
                           dice de frente en vez de desaparecer en silencio. */
                        <p className="mt-2 text-xs font-medium text-primary">
                          Lo tenías agregado: aquí no cuenta, solo en{" "}
                          {mDisp.map(nombreModelo).join(" o ")}.
                        </p>
                      ) : null}
                      <Button
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={() => setModelo(primero)}
                      >
                        Ver en {infoModelo(primero).nombre}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Tu cotización, por WhatsApp                                  */}
      {/* ------------------------------------------------------------ */}
      <section id="cotizar" className="mt-20 scroll-mt-24">
        <Card className="mx-auto max-w-2xl p-6 md:p-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Tu cotización, lista en un minuto
          </h2>
          {nSel > 0 || paqFuera.length > 0 ? (
            <>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Esto es lo que llevas elegido. Te mando el detalle por WhatsApp y tú decides con
                calma.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {paqSel.map((pk) => (
                  <li key={pk.id} className="flex items-baseline justify-between gap-3">
                    <span>{pk.nombre}</span>
                    <span className="whitespace-nowrap font-medium">
                      {money(precioPaquete(pk, modelo))}
                      {modeloInfo.periodo}
                    </span>
                  </li>
                ))}
                {appsModelo.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3">
                    <span>{p.nombre}</span>
                    <span className="whitespace-nowrap font-medium">
                      {money(p.precios[modelo])}
                      {modeloInfo.periodo}
                    </span>
                  </li>
                ))}
                {appsUnicas.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3">
                    <span>{p.nombre}</span>
                    <span className="whitespace-nowrap font-medium">
                      {money(p.precios[AppMode.Owned])} pago único
                    </span>
                  </li>
                ))}
                {paqFuera.map((pk) => (
                  <li
                    key={pk.id}
                    className="flex items-baseline justify-between gap-3 text-muted-foreground"
                  >
                    <span>{pk.nombre}</span>
                    <span className="text-right text-xs">
                      no aplica aquí · solo en {modelosDePaquete(pk).map(nombreModelo).join(" o ")}
                    </span>
                  </li>
                ))}
              </ul>
              {nSel > 0 ? (
                <>
                  <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-4">
                    <span className="font-medium">
                      Total estimado{soloUnico ? "" : ` (${modeloInfo.nombre})`}
                    </span>
                    <span className="text-right font-semibold">{textoTotal}</span>
                  </div>
                  <a
                    href={urlCotizar}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
                  >
                    <MessageCircle className="size-4" /> Pedir mi cotización por WhatsApp
                  </a>
                </>
              ) : (
                <a
                  href={urlCotizar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "mt-6 h-auto min-h-12 w-full whitespace-normal py-2",
                  )}
                >
                  <MessageCircle className="size-4" /> No sé qué me conviene — oriéntame
                </a>
              )}
            </>
          ) : (
            <>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Aún no eliges nada, y no pasa nada: escríbeme y armamos juntos lo que tu salón
                necesita.
              </p>
              <a
                href={urlCotizar}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "mt-6 h-auto min-h-12 w-full whitespace-normal py-2",
                )}
              >
                <MessageCircle className="size-4" /> No sé qué me conviene — oriéntame
              </a>
            </>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sin compromiso y sin letras chiquitas: el mensaje se arma solo y tú decides si lo
            mandas.
          </p>
        </Card>
      </section>

      {/* Barra de selección fija (aparece al elegir algo) */}
      {nSel > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-4 sm:flex-row">
            <div className="text-center text-sm sm:text-left">
              <span className="font-medium">{nSel}</span>{" "}
              {nSel === 1 ? "cosa seleccionada" : "cosas seleccionadas"} ·{" "}
              <span className="font-semibold">{textoTotal}</span>
              {soloUnico ? null : (
                <>
                  {" "}
                  <span className="text-muted-foreground">({modeloInfo.nombre})</span>
                </>
              )}
            </div>
            <a
              href={urlCotizar}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              <MessageCircle className="size-4" /> Solicitar cotización por WhatsApp
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
