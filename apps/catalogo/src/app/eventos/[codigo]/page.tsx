"use client";

/**
 * PANEL DE UN EVENTO — el puesto de mando del anfitrión (requiere sesión).
 *
 * Reúne en una pantalla lo que el salón necesita el día del evento:
 *   • El enlace del PORTAL para compartir con los invitados (y su código).
 *   • CÓMO VA: cuántos mensajes, canciones, fotos, jugadores y confirmaciones
 *     lleva, leídos del "lugar central" con el código del evento.
 *   • Las PANTALLAS del anfitrión, cada una con el código ya puesto.
 *
 * Las pantallas todavía viven en sus apps sueltas: este panel es el esqueleto
 * que las junta (mismo camino que siguió el portal del invitado). Cuando una se
 * migre aquí dentro, gana `rutaInterna` en el manifest y deja de abrirse fuera.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  KeyRound,
  RefreshCw,
  SearchX,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { Button, Card } from "@salones/ui";
import {
  claveAnfitrion,
  olvidarClaveAnfitrion,
  recordarClaveAnfitrion,
} from "@salones/sync";
import { obtenerSupabase } from "@/lib/supabase";
import {
  RESUMEN_VACIO,
  contadorDe,
  medirEvento,
  obtenerEvento,
  type EventoFila,
  type ResumenEvento,
} from "@/lib/eventos";
import {
  PANTALLAS,
  APPS_CON_LLAVE,
  baseDeApp,
  enlacePantalla,
  enlacePortal,
  esInterna,
} from "@/lib/pantallas";

/** Cada cuánto se vuelven a leer los contadores (ms). */
const REFRESCO_MS = 20000;

export default function PanelEvento({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = React.use(params);
  const codigo = decodeURIComponent(crudo);
  const router = useRouter();

  const [cargando, setCargando] = React.useState(true);
  const [evento, setEvento] = React.useState<EventoFila | null>(null);
  const [resumen, setResumen] = React.useState<ResumenEvento>(RESUMEN_VACIO);
  const [midiendo, setMidiendo] = React.useState(false);
  const [copiado, setCopiado] = React.useState("");
  /** ¿Este navegador ya tiene la llave de anfitrión de ESTE evento? */
  const [moderacionActiva, setModeracionActiva] = React.useState(false);

  const portal = enlacePortal(codigo);

  // Ficha del evento: exige sesión y la RLS solo deja ver los del propio salón.
  React.useEffect(() => {
    const supabase = obtenerSupabase();
    if (!supabase) {
      router.replace("/entrar");
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/entrar");
        return;
      }
      setModeracionActiva(claveAnfitrion(codigo) !== null);
      setEvento(await obtenerEvento(supabase, codigo));
      setCargando(false);
    });
  }, [router, codigo]);

  // Cómo va: se mide al entrar y cada tantos segundos (y con el botón).
  const medir = React.useCallback(async () => {
    setMidiendo(true);
    try {
      setResumen(await medirEvento(codigo));
    } finally {
      setMidiendo(false);
    }
  }, [codigo]);

  React.useEffect(() => {
    if (!evento) return;
    void medir();
    const t = window.setInterval(() => void medir(), REFRESCO_MS);
    return () => window.clearInterval(t);
  }, [evento, medir]);

  /**
   * Los enlaces de las pantallas, pero con la llave puesta (`&a=…`). Solo para
   * quien organiza: abrir uno deja la moderación activa en esa app.
   */
  const enlacesDeAnfitrion = (): string => {
    const clave = evento?.clave_anfitrion;
    if (!clave) return "";
    /*
     * ⚠️ ESTA TARJETA COPIABA UN TEXTO SIN NI UN ENLACE (arreglado el 9 ago).
     *
     * Filtraba `PANTALLAS.filter(p => !esInterna(p))`, o sea "las pantallas que
     * todavía viven fuera del panel". Como las cinco terminaron de migrarse
     * hacia dentro, esa lista quedó VACÍA y el botón copiaba el encabezado y
     * las advertencias… y nada más. Se descubrió al ir a cerrar el agujero de
     * sobrescribir: la moderación desde el teléfono llevaba sin funcionar
     * desde que se migró la última pantalla, y no había forma de notarlo
     * porque el botón seguía diciendo "¡Copiado!".
     *
     * Ahora la lista es de las apps que SIGUEN FUERA del panel y necesitan la
     * llave para trabajar: el acomodo de mesas y la puerta. Son justo las dos
     * que hoy escriben con pase de invitado, que es lo que obliga a dejar sus
     * colecciones abiertas en el candado de la 0016.
     */
    const fuera = APPS_CON_LLAVE.map((a) => ({
      nombre: a.nombre,
      href: baseDeApp(a.appId),
    })).filter((x) => x.href);
    return [
      `Enlaces de ANFITRIÓN · ${evento?.nombre ?? codigo}`,
      "",
      "⚠️ NO los compartas con los invitados: quien los abra puede borrar.",
      "",
      ...fuera.map((x) => `• ${x.nombre}\n${x.href}/?e=${encodeURIComponent(codigo)}&a=${clave}`),
      "",
      `Llave suelta (por si hace falta a mano): ${clave}`,
    ].join("\n");
  };

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  const compartirPortal = () => {
    const msg = `¡Hola! Aquí está todo lo de ${evento?.nombre ?? "nuestro evento"}: mensajes, fotos, playlist y más.\n${portal}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  if (cargando) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!evento) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">No encontramos ese evento</h1>
        <p className="mt-2 text-muted-foreground">
          Puede que el código esté mal escrito, que el evento sea de otro salón, o que el permiso por
          salón (migración 0008) aún no esté aplicado.
        </p>
        <Link href="/eventos" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="size-4" /> Volver a mis eventos
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <Link
        href="/eventos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Mis eventos
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{evento.nombre}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <code className="rounded bg-muted px-2 py-0.5 font-semibold text-foreground">
              {evento.codigo}
            </code>
            <Button variant="ghost" size="sm" onClick={() => copiar(evento.codigo, "codigo")}>
              {copiado === "codigo" ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
            <span>Es la llave del evento: quien la tenga, entra.</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void medir()} disabled={midiendo}>
          <RefreshCw className={midiendo ? "size-4 animate-spin" : "size-4"} /> Actualizar
        </Button>
      </div>

      {/* Confirmaciones: el número que más se pregunta antes del evento */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { n: resumen.confirmados, l: "Confirmaron" },
          { n: resumen.personas, l: "Personas" },
          { n: resumen.fotos, l: "Fotos y videos" },
          { n: resumen.mensajes, l: "Mensajes" },
        ].map((t) => (
          <Card key={t.l} className="p-5">
            <div className="text-3xl font-semibold text-primary">{t.n}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.l}</div>
          </Card>
        ))}
      </div>

      {/* Enlace para los invitados */}
      <Card className="mt-8 p-6">
        <div className="flex items-start gap-3">
          <Share2 className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">El enlace para tus invitados</h2>
            {portal ? (
              <>
                <p className="mt-1 truncate text-sm text-muted-foreground">{portal}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copiar(portal, "portal")}>
                    {copiado === "portal" ? (
                      <>
                        <Check className="size-4" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" /> Copiar enlace
                      </>
                    )}
                  </Button>
                  <Button size="sm" onClick={compartirPortal}>
                    <MessageCircle className="size-4" /> Enviar por WhatsApp
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                Falta configurar la dirección del portal del invitado
                (<code>NEXT_PUBLIC_PORTAL_URL</code>). Mientras tanto, comparte los enlaces de cada
                app desde el generador de eventos.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ── Llave de anfitrión ────────────────────────────────────────────
          Es lo ÚNICO que permite quitar contenido de un evento (migración
          0009). Hasta hoy no la entregaba ninguna pantalla: había que sacarla
          con una consulta SQL, así que en un evento real TODOS los botones de
          moderar —los de aquí y los de las apps— no hacían nada. */}
      {evento.clave_anfitrion ? (
        <Card className="mt-8 p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Llave de anfitrión</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Es lo único que permite <strong>quitar</strong> mensajes y fotos de este evento. Sin
                ella los botones de moderar no hacen nada. No se la pases a los invitados: quien la
                tenga puede borrar.
              </p>

              <div className="mt-4 rounded-[var(--radius)] bg-muted p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {moderacionActiva ? (
                    <>
                      <ShieldCheck className="size-4 shrink-0 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Moderación activa en este navegador
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium">
                      La moderación no está activa en este navegador
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {moderacionActiva
                    ? "Los botones de quitar de este panel ya funcionan para este evento."
                    : "Actívala para poder quitar contenido desde este panel."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {moderacionActiva ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        olvidarClaveAnfitrion(codigo);
                        setModeracionActiva(false);
                      }}
                    >
                      Quitar la llave de este navegador
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (evento.clave_anfitrion)
                          setModeracionActiva(recordarClaveAnfitrion(codigo, evento.clave_anfitrion));
                      }}
                    >
                      <ShieldCheck className="size-4" /> Activar la moderación aquí
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copiar(enlacesDeAnfitrion(), "anfitrion")}
                  >
                    {copiado === "anfitrion" ? (
                      <>
                        <Check className="size-4" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" /> Copiar mis enlaces de anfitrión
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Para moderar desde el teléfono, en el muro o el álbum, abre esas pantallas con{" "}
                <strong>tus enlaces de anfitrión</strong> (los del botón de arriba). Cada app los
                recuerda por separado, así que hay que abrirlo una vez en cada una.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Pantallas del anfitrión */}
      <h2 className="mt-10 text-lg font-semibold">Pantallas del evento</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ábrelas con el código ya puesto. Las que aún no viven aquí se abren en su propia app.
      </p>
      <div className="mt-4 space-y-2">
        {PANTALLAS.map((p) => {
          const href = enlacePantalla(p, codigo);
          const interna = esInterna(p);
          const c = contadorDe(p.coleccion, resumen);
          const Icono = p.icono;
          return (
            <Card key={p.clave} className="flex flex-wrap items-center gap-4 p-5">
              <div className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-muted text-primary">
                <Icono className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{p.nombre}</div>
                <div className="text-sm text-muted-foreground">{p.descripcion}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold">{c.valor}</div>
                <div className="text-xs text-muted-foreground">{c.etiqueta}</div>
              </div>
              {href ? (
                interna ? (
                  <Link href={href}>
                    <Button variant="outline" size="sm">
                      Abrir
                    </Button>
                  </Link>
                ) : (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      Abrir <ExternalLink className="size-4" />
                    </Button>
                  </a>
                )
              ) : null}
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Los números se actualizan solos cada 20 segundos.
      </p>
    </main>
  );
}
