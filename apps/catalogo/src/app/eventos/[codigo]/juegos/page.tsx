"use client";

/**
 * TABLERO DE JUEGOS — cuarta pantalla del anfitrión migrada al panel.
 *
 * De los tres juegos, el que se sigue desde aquí es la TRIVIA: su ranking es lo
 * único colectivo (el bingo y el rompehielos se quedan en cada teléfono).
 *
 * Dos cosas que la app original no tenía y que sí hacen falta en una fiesta:
 *   • PROYECTAR el marcador en la pantalla del salón. Ver tu nombre subir es
 *     medio chiste del juego; sin proyectarlo, el ranking casi no se disfruta.
 *   • QUITAR a un jugador. Alguien escribe un apodo subido de tono y termina en
 *     la pantalla grande delante de la familia: el anfitrión necesita borrarlo.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Check,
  Copy,
  Crown,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Monitor,
  QrCode,
  SearchX,
  Share2,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Button, Card, cn, Confirmar } from "@salones/ui";
import { obtenerSync } from "@salones/sync";
import { obtenerSupabase } from "@/lib/supabase";
import { obtenerEvento, type EventoFila } from "@/lib/eventos";
import {
  COLECCION_RANKING,
  enlaceJugar,
  porPuntaje,
  promedioAciertos,
  type Jugador,
} from "@/lib/dinamicas";
import { baseDeApp } from "@/lib/pantallas";
import { QR } from "@/components/qr";
import { RankingPantalla } from "@/components/ranking-pantalla";

const JUEGOS = [
  {
    nombre: "Trivia de los novios",
    desc: "Preguntas sobre la pareja. Es la que llena el marcador.",
    icono: Brain,
  },
  {
    nombre: "Bingo de la fiesta",
    desc: "Cartón de momentos. Personal de cada teléfono.",
    icono: LayoutGrid,
  },
  {
    nombre: "Encuentra a alguien que…",
    desc: "Rompehielos para que la gente se conozca.",
    icono: Users,
  },
];

const MEDALLA = ["text-amber-500", "text-zinc-400", "text-amber-700"];

export default function TableroJuegos({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = React.use(params);
  const codigo = decodeURIComponent(crudo);
  const router = useRouter();

  const [cargando, setCargando] = React.useState(true);
  const [evento, setEvento] = React.useState<EventoFila | null>(null);
  const [jugadores, setJugadores] = React.useState<Jugador[]>([]);
  const [pantalla, setPantalla] = React.useState(false);
  const [compartiendo, setCompartiendo] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
  const [aviso, setAviso] = React.useState("");

  const urlJugar = enlaceJugar(codigo, baseDeApp("dinamicas"));

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
      setEvento(await obtenerEvento(supabase, codigo));
      setCargando(false);
    });
  }, [router, codigo]);

  // El marcador, en vivo.
  React.useEffect(() => {
    if (!evento) return;
    return obtenerSync().suscribir<Jugador>(codigo, COLECCION_RANKING, setJugadores);
  }, [evento, codigo]);

  const [porQuitar, setPorQuitar] = React.useState<Jugador | null>(null);

  const quitar = async (j: Jugador) => {
    setAviso("");
    try {
      await obtenerSync().eliminar(codigo, COLECCION_RANKING, j.id);
    } catch {
      setAviso(
        "No pudimos quitar a ese jugador. Si el evento ya usa llave de anfitrión, ábrelo desde el enlace que la lleva.",
      );
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlJugar);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  };

  const invitar = () => {
    const msg = `¡A jugar en ${evento?.nombre ?? "la fiesta"}! Trivia, bingo y más desde tu teléfono:\n${urlJugar}`;
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
        <Link href="/eventos" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="size-4" /> Volver a mis eventos
          </Button>
        </Link>
      </main>
    );
  }

  const top = [...jugadores].sort(porPuntaje).slice(0, 10);
  const promedio = promedioAciertos(jugadores);
  const totalPreguntas = jugadores[0]?.total ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <Link
        href={`/eventos/${encodeURIComponent(codigo)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {evento.nombre}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Tablero de juegos</h1>
      <p className="mt-2 text-muted-foreground">
        El marcador de la trivia, en vivo. Proyéctalo cuando quieras animar la fiesta.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Button onClick={() => setCompartiendo(true)}>
          <Share2 className="size-4" /> Compartir para jugar
        </Button>
        <Button variant="outline" onClick={() => setPantalla(true)}>
          <Monitor className="size-4" /> Proyectar marcador
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {jugadores.length} {jugadores.length === 1 ? "jugador" : "jugadores"}
          {jugadores.length > 0 && totalPreguntas
            ? ` · promedio ${promedio} de ${totalPreguntas}`
            : ""}
        </span>
      </div>

      {aviso ? <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">{aviso}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        {/* Los juegos */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Los juegos</h2>
          <div className="space-y-3">
            {JUEGOS.map((j) => {
              const Icono = j.icono;
              return (
                <Card key={j.nombre} className="flex items-center gap-4 p-5">
                  <div className="grid size-12 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
                    <Icono className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold">{j.nombre}</div>
                    <div className="text-sm text-muted-foreground">{j.desc}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Ranking en vivo */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-5 text-primary" /> Ranking de la trivia
          </h2>
          <Card className="p-4">
            {top.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún nadie juega. Comparte el código para empezar.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {top.map((j, i) => (
                  <li
                    key={j.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-2",
                      i < 3 ? "bg-muted" : "",
                    )}
                  >
                    <span className="grid w-6 shrink-0 place-items-center">
                      {i < 3 ? (
                        <Crown className={cn("size-4", MEDALLA[i])} />
                      ) : (
                        <span className="text-sm text-muted-foreground">{i + 1}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{j.nombre}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {j.aciertos}/{j.total}
                    </span>
                    <button
                      onClick={() => setPorQuitar(j)}
                      aria-label={`Quitar a ${j.nombre} del ranking`}
                      className="grid size-7 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <p className="mt-2 text-xs text-muted-foreground">
            El bingo y el rompehielos se juegan en cada teléfono: no llevan marcador común.
          </p>
        </div>
      </div>

      {/* Compartir para jugar */}
      {compartiendo ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
          onClick={() => setCompartiendo(false)}
        >
          <Card
            className="w-full max-w-md p-6"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <QrCode className="size-5 text-primary" /> Comparte los juegos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Los invitados escanean el código y juegan desde su teléfono.
                </p>
              </div>
              <button
                onClick={() => setCompartiendo(false)}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
              <QR value={urlJugar || " "} size={132} />
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {urlJugar || "Falta configurar la dirección del portal."}
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={copiar} variant="outline" className="w-full">
                    {copiado ? (
                      <>
                        <Check className="size-4" /> ¡Enlace copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" /> Copiar enlace
                      </>
                    )}
                  </Button>
                  <Button onClick={invitar} className="w-full">
                    <MessageCircle className="size-4" /> Invitar por WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Marcador proyectado */}
      {pantalla ? (
        <RankingPantalla
          jugadores={jugadores}
          nombreEvento={evento.nombre}
          urlJugar={urlJugar}
          onClose={() => setPantalla(false)}
        />
      ) : null}

      <Confirmar
        abierto={porQuitar !== null}
        titulo="¿Quitar a este jugador del ranking?"
        descripcion={
          <>
            Se borra a <strong>{porQuitar?.nombre}</strong> y sus{" "}
            <strong>{porQuitar?.aciertos ?? 0}</strong> aciertos. No se puede deshacer, y si vuelve
            a jugar empezará de cero.
          </>
        }
        textoConfirmar="Sí, quitarlo"
        onConfirmar={() => {
          const j = porQuitar;
          setPorQuitar(null);
          if (j) void quitar(j);
        }}
        onCancelar={() => setPorQuitar(null)}
      />
    </main>
  );
}
