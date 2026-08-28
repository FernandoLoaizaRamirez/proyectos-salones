"use client";

/**
 * LA MARCA DE UN EVENTO, editable desde el panel (Etapa 2, pieza 2).
 *
 * La cascada salón → evento existía completa por debajo (0025: tabla,
 * RLS, evento-config, resolverTema) pero solo la boda demo tenía fila —
 * puesta por la semilla 0026. Vestir una boda real con su color, su portada
 * y su frase era escribir SQL a mano. Esta pantalla cierra ese hueco.
 *
 * LA VISTA PREVIA ES LA VERDAD: fusiona la marca REAL del salón con lo que
 * se está editando usando el MISMO `resolverTema` del portal del invitado.
 * No hay segunda implementación que pueda discrepar.
 *
 * LA PORTADA es una URL pública (http/https) por ahora: `evento-config`
 * omite a propósito las referencias del almacén interno hasta conectar la
 * firma (contrato 0025). El campo lo dice, en vez de prometer una subida
 * que no existe.
 *
 * QUIÉN GUARDA lo decide la base (RLS `eb_wr_admin`: dueño o admin del
 * salón dueño). Aquí solo se esconde el botón para no ofrecer lo que el
 * servidor va a negar.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Paintbrush, SearchX, TriangleAlert } from "lucide-react";
import {
  Button,
  Card,
  Confirmar,
  FUENTES,
  TemaScope,
  ratioContraste,
  resolverTema,
  type TemaSalon,
} from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";
import { leerIdentidad } from "@/lib/sesion";
import { obtenerEvento, type EventoFila } from "@/lib/eventos";
import { obtenerBrandingSalon } from "@/lib/branding";
import {
  guardarBrandingEvento,
  obtenerBrandingEvento,
  quitarBrandingEvento,
  type MarcaEvento,
} from "@/lib/branding-evento";
import type { ResultadoGuardado } from "@/lib/branding";

const CAMPO =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm";

/**
 * El fondo del tema base (tokens.css `--bg` en claro): lo que el portal pinta
 * cuando el salón no capturó superficie o `resolverTema` la descartó por
 * ilegible. El aviso de contraste compara contra ESTO cuando no hay fondo
 * resuelto — sin el respaldo, el aviso moría justo en el caso más común (el
 * salón nuevo sin marca) y un color pastel dejaba los botones invisibles sin
 * que nadie avisara.
 */
const FONDO_BASE = "oklch(0.99 0.005 95)";

/**
 * Iniciales para el sello cuando el evento no captura monograma: "Carmen &
 * Luis" → "C·L". MISMA regla que el hero del portal (monogramaDe en
 * apps/portal/src/components/hero-evento.tsx) — si cambia allá, cambia aquí:
 * la vista previa no puede enseñar el sello de otra boda.
 */
function monogramaDe(nombres: string): string {
  const iniciales = nombres
    .split(/\s*(?:&|y|\+)\s*/i)
    .map((p) => p.trim().charAt(0).toUpperCase())
    .filter(Boolean);
  return iniciales.length >= 2 ? iniciales.slice(0, 2).join("·") : iniciales.join("");
}

function CampoColor({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string;
  valor?: string;
  alCambiar: (v: string) => void;
}) {
  const hex = valor && /^#[0-9a-fA-F]{6}$/.test(valor) ? valor : "#888888";
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{etiqueta}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{valor ?? "hereda"}</span>
        <input
          type="color"
          value={hex}
          onChange={(e) => alCambiar(e.target.value)}
          className="size-8 cursor-pointer rounded border border-border bg-transparent"
          aria-label={etiqueta}
        />
        {valor ? (
          <button
            type="button"
            onClick={() => alCambiar("")}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Quitar
          </button>
        ) : null}
      </span>
    </label>
  );
}

export default function PersonalizacionEvento({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo: crudo } = React.use(params);
  const codigo = decodeURIComponent(crudo);
  const router = useRouter();

  const [cargando, setCargando] = React.useState(true);
  const [evento, setEvento] = React.useState<EventoFila | null>(null);
  const [salon, setSalon] = React.useState<TemaSalon | null>(null);
  const [marca, setMarca] = React.useState<MarcaEvento>({});
  /** ¿La base ya tiene fila? (para saber si "Quitar" tiene algo que quitar). */
  const [habiaFila, setHabiaFila] = React.useState(false);
  /** La LECTURA de la marca falló: no se ofrece Guardar sobre un formulario
   *  vacío que no refleja la base (el upsert pisaría con NULL lo que sí hay). */
  const [cargaFallo, setCargaFallo] = React.useState(false);
  const [puedeGuardar, setPuedeGuardar] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [resultado, setResultado] = React.useState<ResultadoGuardado | null>(null);
  /** Qué acción produjo `resultado`, para que el éxito diga la verdad. */
  const [accion, setAccion] = React.useState<"guardar" | "quitar">("guardar");
  const [confirmarQuitar, setConfirmarQuitar] = React.useState(false);

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
      const identidad = leerIdentidad(data.session.user);
      setPuedeGuardar(identidad?.rol === "owner" || identidad?.rol === "admin");
      const ficha = await obtenerEvento(supabase, codigo);
      setEvento(ficha);
      if (ficha) {
        const [temaSalon, marcaEvento] = await Promise.all([
          identidad ? obtenerBrandingSalon(identidad.tenantId) : Promise.resolve(null),
          obtenerBrandingEvento(ficha.id),
        ]);
        setSalon(temaSalon);
        if (marcaEvento === "fallo") {
          setCargaFallo(true);
        } else if (marcaEvento) {
          setMarca(marcaEvento);
          setHabiaFila(true);
        }
      }
      setCargando(false);
    });
  }, [router, codigo]);

  const set = (cambios: Partial<MarcaEvento>) => {
    setMarca((previa) => ({ ...previa, ...cambios }));
    setResultado(null);
  };

  /*
   * La MISMA fusión que ve el invitado: la marca real del salón + lo que se
   * está editando. La portada entra CRUDA y la sanea `resolverTema` (el mismo
   * `esUrlSegura` del portal: http(s), sin espacios ni comillas, <500
   * caracteres) — la vista previa no repite el filtro con una copia más
   * floja, porque una copia floja enseñaría aquí una foto que el portal
   * después descarta en silencio.
   */
  const tema = React.useMemo(
    () =>
      resolverTema(
        salon ?? { nombre: "Tu salón" },
        {
          primario: marca.primario,
          acento: marca.acento,
          monograma: marca.monograma,
          frase: marca.frase,
          fuentes: marca.fuentes,
          portadaUrl: marca.portadaRef?.trim() || undefined,
        },
        { origen: "demo", datosEvento: { nombre: evento?.nombre } },
      ),
    [salon, marca, evento],
  );
  /** La portada que el portal SÍ va a pintar (ya saneada por el motor). */
  const portadaValida = Boolean(tema.evento?.portadaUrl);

  /**
   * Un solo aviso, el que de verdad pasa: el color del evento sobre el fondo.
   * Contra el fondo RESUELTO (ya saneado y con la pareja fondo/tinta
   * verificada por el motor), con el token base como respaldo — comparar
   * contra el fondo CRUDO del salón callaba en el caso común (salón sin
   * fondo capturado) y opinaba sobre un fondo que el portal no pinta.
   */
  const avisoContraste = React.useMemo(() => {
    if (!marca.primario) return null;
    const fondo = tema.colores.fondo ?? FONDO_BASE;
    const ratio = ratioContraste(marca.primario, fondo);
    return ratio !== null && ratio < 3
      ? "El color del evento casi no se distingue del fondo: los botones pasarán desapercibidos."
      : null;
  }, [marca.primario, tema]);

  const guardar = async () => {
    if (!evento) return;
    setGuardando(true);
    setAccion("guardar");
    const r = await guardarBrandingEvento(evento.id, marca);
    setResultado(r);
    if (r.ok) setHabiaFila(true);
    setGuardando(false);
  };

  const quitar = async () => {
    if (!evento) return;
    setConfirmarQuitar(false);
    setGuardando(true);
    setAccion("quitar");
    const r = await quitarBrandingEvento(evento.id);
    setResultado(r);
    if (r.ok) {
      setMarca({});
      setHabiaFila(false);
    }
    setGuardando(false);
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

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <Link
        href={`/eventos/${encodeURIComponent(codigo)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {evento.nombre}
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
          <Paintbrush className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">La marca de este evento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El color, la portada, el monograma y la frase de ESTA celebración, encima de la marca
            de tu salón. Lo que no toques aquí, se hereda.
          </p>
        </div>
      </div>

      <Card className="mt-8 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* -------- Controles -------- */}
          <div className="space-y-5">
            <div className="space-y-2.5">
              <CampoColor
                etiqueta="Color del evento"
                valor={marca.primario}
                alCambiar={(v) => set({ primario: v || undefined })}
              />
              <CampoColor
                etiqueta="Acento"
                valor={marca.acento}
                alCambiar={(v) => set({ acento: v || undefined })}
              />
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Monograma</span>
              <input
                className={CAMPO}
                value={marca.monograma ?? ""}
                onChange={(e) => set({ monograma: e.target.value })}
                placeholder="A·R"
                maxLength={8}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                El sello corto de la portada. Vacío = se arma con las iniciales.
              </span>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Frase del evento</span>
              <input
                className={CAMPO}
                value={marca.frase ?? ""}
                onChange={(e) => set({ frase: e.target.value })}
                placeholder="Nos encantará celebrar contigo"
                maxLength={120}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Tipografía del evento</span>
              <select
                value={marca.fuentes ?? ""}
                onChange={(e) => set({ fuentes: e.target.value || undefined })}
                className={CAMPO}
              >
                <option value="">La del salón (heredar)</option>
                {Object.values(FUENTES).map((f) => (
                  <option key={f.clave} value={f.clave}>
                    {f.etiqueta}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Foto de portada (enlace)</span>
              <input
                type="url"
                inputMode="url"
                className={CAMPO}
                value={marca.portadaRef ?? ""}
                onChange={(e) => set({ portadaRef: e.target.value })}
                placeholder="https://…"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Un enlace público (https) a la foto del hero. Subir el archivo directo llegará
                después; mientras, pega el enlace de donde ya viva la foto.
              </span>
              {marca.portadaRef?.trim() && !portadaValida ? (
                <span className="mt-1 block text-xs text-amber-600 dark:text-amber-500">
                  El portal no va a pintar ese enlace: debe empezar con http(s), sin espacios ni
                  comillas, y medir menos de 500 caracteres.
                </span>
              ) : null}
            </label>
          </div>

          {/* -------- Vista previa: el MISMO motor que ve el invitado -------- */}
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Así abrirá la portada de este evento
            </span>
            <TemaScope
              tema={tema}
              className="relative mt-2 overflow-hidden rounded-[var(--radius)] border border-border"
              /*
               * El panel corre en OSCURO y los colores del tema van en
               * light-dark(): sin fijar el esquema, la vista previa enseñaba
               * la paleta nocturna derivada (el vino aclarado a rosa) cuando
               * el invitado abre el portal en CLARO. El color que el salón
               * aprueba tiene que ser el que su cliente verá.
               */
              style={{ colorScheme: tema.esquema === "oscuro" ? "dark" : "light" }}
            >
              {portadaValida ? (
                <>
                  {/* <img> a propósito: la portada es runtime, como en el hero
                      real — y el src sale del tema RESUELTO, no del campo. */}
                  <img
                    src={tema.evento!.portadaUrl}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#1a120f]/45" />
                </>
              ) : null}
              <div
                className={[
                  "relative px-6 py-10 text-center",
                  portadaValida ? "text-white" : "",
                ].join(" ")}
              >
                {/* El sello con la MISMA regla del hero: el capturado, o las
                    iniciales de ESTE evento; sin nada, no se pinta (jamás el
                    "A·R" de la boda demo en la boda de otro cliente). */}
                {(() => {
                  const sello = marca.monograma?.trim() || monogramaDe(evento.nombre);
                  return sello ? (
                    <div
                      className={[
                        "mx-auto grid size-14 place-items-center rounded-full border font-[family-name:var(--font-script)] text-xl",
                        portadaValida ? "border-white/40" : "border-primary/25 text-primary",
                      ].join(" ")}
                    >
                      {sello}
                    </div>
                  ) : null;
                })()}
                <p
                  className={[
                    "mt-4 text-[0.65rem] uppercase tracking-[0.3em]",
                    portadaValida ? "text-white/80" : "text-muted-foreground",
                  ].join(" ")}
                >
                  Celebramos a
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
                  {evento.nombre}
                </p>
                {marca.frase?.trim() ? (
                  <p
                    className={[
                      "mx-auto mt-3 max-w-xs font-[family-name:var(--font-display)] text-sm italic",
                      portadaValida ? "text-white/90" : "text-foreground/80",
                    ].join(" ")}
                  >
                    {marca.frase}
                  </p>
                ) : null}
                <div className="mt-5">
                  <Button size="sm">Confirmar asistencia</Button>
                </div>
              </div>
            </TemaScope>

            {avisoContraste ? (
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {avisoContraste}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              La vista previa usa la marca real de tu salón; el motor que la pinta es el mismo del
              portal del invitado.
            </p>
          </div>
        </div>

        {/* -------- Guardar / quitar -------- */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          {cargaFallo ? (
            <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              No pudimos leer la marca actual de este evento. Recarga la página antes de editar:
              guardar ahora podría borrar lo que ya estaba capturado.
            </p>
          ) : puedeGuardar ? (
            <>
              <Button onClick={() => void guardar()} disabled={guardando}>
                {guardando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Guardar la marca del evento
              </Button>
              {habiaFila ? (
                <Button
                  variant="outline"
                  onClick={() => setConfirmarQuitar(true)}
                  disabled={guardando}
                >
                  Volver a la marca del salón
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Solo quien administra el salón puede cambiar la marca. Pídeselo a esa persona.
            </p>
          )}

          {resultado?.ok ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-primary">
              <Check className="size-4" />
              {accion === "quitar"
                ? "Listo: este evento vuelve a vestirse con la marca del salón."
                : "Guardado. El portal lo refleja en un minuto."}
            </span>
          ) : null}
          {resultado && !resultado.ok ? (
            <span className="text-sm text-red-600 dark:text-red-400">
              {resultado.motivo === "sin-permiso"
                ? "El servidor no te deja cambiar la marca de este evento."
                : resultado.motivo === "sin-servidor"
                  ? "No hay conexión con el servidor."
                  : "No se pudo guardar. Inténtalo de nuevo."}
            </span>
          ) : null}
        </div>
      </Card>

      <Confirmar
        abierto={confirmarQuitar}
        titulo="¿Volver a la marca del salón?"
        descripcion={`Se quita la personalización de "${evento.nombre}" y el evento vuelve a verse con la marca de tu salón. Los colores y la frase capturados aquí se pierden.`}
        textoConfirmar="Sí, quitarla"
        onConfirmar={() => void quitar()}
        onCancelar={() => setConfirmarQuitar(false)}
      />
    </main>
  );
}
