"use client";

/**
 * LA MARCA DEL SALÓN, editable desde el panel (Fase 5 del rediseño).
 *
 * QUÉ CAMBIÓ Y POR QUÉ IMPORTA: hasta hoy esta tarjeta solo enseñaba una vista
 * previa con tres temas de prueba, y su propio comentario lo admitía —"todavía
 * NO se guardan"—. Poner el logo y los colores de un salón significaba escribir
 * a mano en la base de datos: o sea, llamar al proveedor. Eso es lo que separa
 * "te lo configuro yo" de "te lo configuras tú", y es lo que más pesa cuando
 * hay que atender a más de un cliente.
 *
 * LA VISTA PREVIA ES LA VERDAD: pinta con el MISMO motor que la experiencia del
 * invitado (`resolverTema` + `TemaScope` de @salones/ui), así que lo que el
 * salón ve aquí es exactamente lo que verán sus invitados. No hay una segunda
 * implementación que pueda discrepar.
 *
 * EL CONTRASTE SE AVISA ANTES DE GUARDAR: los colores los elige un salón, no un
 * diseñador. Se mide con la misma regla WCAG que usa el motor y se le dice en
 * cristiano cuándo un texto no se va a leer. Bloquea solo lo que de verdad deja
 * la pantalla ilegible.
 *
 * QUIÉN PUEDE GUARDAR lo decide la BASE (RLS de la 0025: dueño o admin de SU
 * salón). Aquí solo se esconde el botón para no ofrecer algo que el servidor va
 * a rechazar; si alguien fuerza la interfaz, el servidor responde que no.
 */
import * as React from "react";
import { Palette, Check, Loader2, TriangleAlert } from "lucide-react";
import {
  Button,
  Card,
  TemaScope,
  FUENTES,
  ratioContraste,
  resolverTema,
  type ClaveFuentes,
  type TemaSalon,
} from "@salones/ui";
import { obtenerBrandingSalon, guardarBrandingSalon, type ResultadoGuardado } from "@/lib/branding";
import { leerIdentidad, type Identidad } from "@/lib/sesion";
import { obtenerSupabase } from "@/lib/supabase";

/** Tema de respaldo si la base no responde (degradación elegante). */
const TEMA_EJEMPLO: TemaSalon = {
  nombre: "Hacienda Santa Renata",
  primario: "#7a2e3b",
  primarioTexto: "#fbf9f5",
  acento: "#c9a96e",
  fondo: "#fbf9f5",
  tinta: "#241d1a",
  radio: "0.4rem",
  fuentes: "clasica",
  esquema: "claro",
};

/** Puntos de partida, para que nadie empiece con una pantalla en blanco. */
const TEMAS: { etiqueta: string; tema: TemaSalon }[] = [
  { etiqueta: "Vino & Oro", tema: TEMA_EJEMPLO },
  {
    etiqueta: "Océano",
    tema: {
      nombre: "Salón Marea Azul",
      primario: "#1d4e89",
      primarioTexto: "#f7fbff",
      acento: "#4aa3c7",
      fondo: "#f7fafc",
      tinta: "#16202b",
      radio: "1rem",
      fuentes: "moderna",
      esquema: "claro",
    },
  },
  {
    etiqueta: "Bosque",
    tema: {
      nombre: "Jardín Los Encinos",
      primario: "#2f5d3a",
      primarioTexto: "#f6faf5",
      acento: "#c2a35a",
      fondo: "#f8faf6",
      tinta: "#1b241c",
      radio: "1.5rem",
      fuentes: "romantica",
      esquema: "claro",
    },
  },
];

/** Opciones de redondeo de esquinas. */
const RADIOS: { etiqueta: string; valor: string }[] = [
  { etiqueta: "Cuadrado", valor: "0.25rem" },
  { etiqueta: "Suave", valor: "0.85rem" },
  { etiqueta: "Redondo", valor: "1.5rem" },
];

/** Un aviso de contraste, ya traducido a algo que un salón entienda. */
type Aviso = { texto: string; grave: boolean };

/**
 * Mide los pares que de verdad se leen en pantalla. Devuelve avisos en
 * cristiano: nada de "4.5:1" a secas, sino qué se va a ver mal.
 */
function avisosDeContraste(tema: TemaSalon): Aviso[] {
  const avisos: Aviso[] = [];
  const mide = (a?: string, b?: string) => (a && b ? ratioContraste(a, b) : null);

  const cuerpo = mide(tema.tinta, tema.fondo);
  if (cuerpo !== null && cuerpo < 4.5) {
    avisos.push({
      texto: "El texto no se lee sobre el fondo: elige un fondo más claro o una tinta más oscura.",
      grave: true,
    });
  }
  const enBoton = mide(tema.primarioTexto, tema.primario);
  if (enBoton !== null && enBoton < 4.5) {
    avisos.push({
      texto: "El texto de los botones no se lee sobre el color principal.",
      grave: true,
    });
  }
  const principal = mide(tema.primario, tema.fondo);
  if (principal !== null && principal < 3) {
    avisos.push({
      texto: "El color principal casi no se distingue del fondo: los botones pasarán desapercibidos.",
      grave: false,
    });
  }
  return avisos;
}

/** Etiqueta que dice de dónde salió la marca: la base o un ejemplo. */
function FuenteBadge({ cargando, fuente }: { cargando: boolean; fuente: "base" | "ejemplo" }) {
  if (cargando) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Cargando marca…
      </span>
    );
  }
  if (fuente === "base") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-muted px-2 py-0.5 text-xs font-medium text-primary">
        <span className="size-1.5 rounded-full bg-primary" aria-hidden /> Guardada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      Sin guardar todavía
    </span>
  );
}

/** Un campo de color: la muestra clicable y el valor a la vista. */
function CampoColor({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string;
  valor?: string;
  alCambiar: (v: string) => void;
}) {
  // <input type="color"> solo entiende #rrggbb; un color guardado en otro
  // formato se enseña igual pero la muestra arranca en un gris neutro.
  const hex = valor && /^#[0-9a-fA-F]{6}$/.test(valor) ? valor : "#888888";
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{etiqueta}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{valor ?? "—"}</span>
        <input
          type="color"
          value={hex}
          onChange={(e) => alCambiar(e.target.value)}
          className="size-8 cursor-pointer rounded border border-border bg-transparent"
          aria-label={etiqueta}
        />
      </span>
    </label>
  );
}

export function TarjetaPersonalizacion() {
  const [tema, setTema] = React.useState<TemaSalon>(TEMA_EJEMPLO);
  const [fuente, setFuente] = React.useState<"base" | "ejemplo">("ejemplo");
  const [cargando, setCargando] = React.useState(true);
  const [identidad, setIdentidad] = React.useState<Identidad | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  const [resultado, setResultado] = React.useState<ResultadoGuardado | null>(null);

  /*
   * El salón sale de la SESIÓN, no de una constante. Antes esta pantalla leía
   * siempre el salón demo: un cliente real habría visto la marca de Hacienda
   * Santa Renata en su propio panel.
   */
  React.useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      const supabase = obtenerSupabase();
      const { data } = supabase
        ? await supabase.auth.getUser()
        : { data: { user: null } };
      const yo = leerIdentidad(data.user);
      if (!vigente) return;
      setIdentidad(yo);

      const real = await obtenerBrandingSalon(yo?.tenantId);
      if (!vigente) return;
      if (real) {
        setTema(real);
        setFuente("base");
      }
      setCargando(false);
    };
    void cargar();
    return () => {
      vigente = false;
    };
  }, []);

  const cambiar = (parche: Partial<TemaSalon>) => {
    setTema((prev) => ({ ...prev, ...parche }));
    setResultado(null);
  };

  const avisos = avisosDeContraste(tema);
  const hayGraves = avisos.some((a) => a.grave);
  const puedeGuardar = identidad?.rol === "owner" || identidad?.rol === "admin";

  const guardar = async () => {
    if (!identidad) return;
    setGuardando(true);
    const res = await guardarBrandingSalon(identidad.tenantId, tema);
    setGuardando(false);
    setResultado(res);
    if (res.ok) setFuente("base");
  };

  // La MISMA fusión que corre en la experiencia del invitado.
  const resuelto = resolverTema(tema, null, { origen: "demo" });
  const inicial = tema.nombre.trim().slice(0, 1).toUpperCase() || "S";

  return (
    <Card className="mt-6 p-6">
      <div className="flex items-start gap-4">
        <Palette className="size-8 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">La marca de tu salón</h2>
            <FuenteBadge cargando={cargando} fuente={fuente} />
          </div>
          <p className="text-sm text-muted-foreground">
            Los colores, la tipografía y el redondeo con los que verán tu salón los invitados de
            todos tus eventos. Lo que cambies aquí se aplica en vivo, sin volver a publicar nada.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* -------- Controles -------- */}
        <div className="space-y-5">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Empezar desde</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEMAS.map((t) => (
                <button
                  key={t.etiqueta}
                  type="button"
                  onClick={() => cambiar(t.tema)}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: t.tema.primario }}
                    aria-hidden
                  />
                  {t.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Nombre del salón</span>
            <input
              type="text"
              value={tema.nombre}
              onChange={(e) => cambiar({ nombre: e.target.value })}
              className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <div className="space-y-2.5">
            <CampoColor
              etiqueta="Color principal"
              valor={tema.primario}
              alCambiar={(v) => cambiar({ primario: v })}
            />
            <CampoColor
              etiqueta="Texto sobre el principal"
              valor={tema.primarioTexto}
              alCambiar={(v) => cambiar({ primarioTexto: v })}
            />
            <CampoColor
              etiqueta="Acento"
              valor={tema.acento}
              alCambiar={(v) => cambiar({ acento: v })}
            />
            <CampoColor etiqueta="Fondo" valor={tema.fondo} alCambiar={(v) => cambiar({ fondo: v })} />
            <CampoColor
              etiqueta="Color del texto"
              valor={tema.tinta}
              alCambiar={(v) => cambiar({ tinta: v })}
            />
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Tipografía</span>
            <select
              value={tema.fuentes ?? "sistema"}
              onChange={(e) => cambiar({ fuentes: e.target.value as ClaveFuentes })}
              className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm"
            >
              {Object.values(FUENTES).map((f) => (
                <option key={f.clave} value={f.clave}>
                  {f.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-xs font-medium text-muted-foreground">Esquinas</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {RADIOS.map((r) => (
                <button
                  key={r.valor}
                  type="button"
                  onClick={() => cambiar({ radio: r.valor })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    tema.radio === r.valor ? "border-primary bg-muted" : "border-border hover:bg-muted"
                  }`}
                >
                  {r.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Dirección de tu sitio web</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={tema.sitioUrl ?? ""}
              onChange={(e) => cambiar({ sitioUrl: e.target.value })}
              className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Desde el portal, tus invitados vuelven aquí al tocar tu marca.
            </span>
          </label>
        </div>

        {/* -------- Vista previa: el MISMO motor que ve el invitado -------- */}
        <div>
          <span className="text-xs font-medium text-muted-foreground">Así lo verán tus invitados</span>
          <TemaScope
            tema={resuelto}
            className="mt-2 rounded-[var(--radius)] border border-border p-5"
            /*
             * El panel corre en OSCURO y los colores del tema van en
             * light-dark(): sin fijar el esquema, esta vista previa enseñaba
             * la paleta nocturna derivada cuando el invitado abre en CLARO.
             * Mismo arreglo que la vista previa de la marca por evento.
             */
            style={{ colorScheme: resuelto.esquema === "oscuro" ? "dark" : "light" }}
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-primary font-[family-name:var(--font-display)] text-sm font-bold text-primary-foreground">
                {inicial}
              </span>
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-display)] font-semibold">
                  {tema.nombre}
                </p>
                <p className="text-xs" style={{ color: tema.acento ?? "var(--muted-fg)" }}>
                  Bodas · XV años · Eventos
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm">Confirmar asistencia</Button>
              <Button size="sm" variant="outline">
                Ver mi mesa
              </Button>
            </div>

            <div
              className="mt-4 rounded-[var(--radius)] border p-3"
              style={{ borderColor: tema.acento ?? "var(--border)" }}
            >
              <p className="font-[family-name:var(--font-display)] text-sm font-medium">
                Boda Ana &amp; Rodrigo
              </p>
              <p className="text-xs text-muted-foreground">
                Toda la experiencia del invitado se pinta con estos colores.
              </p>
            </div>
          </TemaScope>

          {avisos.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {avisos.map((a) => (
                <li
                  key={a.texto}
                  className={`flex items-start gap-2 text-xs ${
                    a.grave ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                  }`}
                >
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {a.texto}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* -------- Guardar -------- */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {puedeGuardar ? (
          <Button onClick={guardar} disabled={guardando || hayGraves}>
            {guardando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Guardar la marca
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Solo quien administra el salón puede cambiar la marca. Pídeselo a esa persona.
          </p>
        )}

        {hayGraves ? (
          <span className="text-xs text-red-600 dark:text-red-400">
            Corrige los avisos de arriba: con estos colores hay texto que no se lee.
          </span>
        ) : null}

        {resultado?.ok ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-primary">
            <Check className="size-4" /> Guardada. Tus eventos ya se ven así.
          </span>
        ) : null}
        {resultado && !resultado.ok ? (
          <span className="text-sm text-red-600 dark:text-red-400">
            {resultado.motivo === "sin-permiso"
              ? "El servidor no te deja cambiar la marca de este salón."
              : resultado.motivo === "sin-servidor"
                ? "No hay conexión con el servidor."
                : "No se pudo guardar. Inténtalo de nuevo."}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
