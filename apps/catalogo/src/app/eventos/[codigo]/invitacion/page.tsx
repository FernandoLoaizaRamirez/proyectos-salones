"use client";

/**
 * LA INVITACIÓN DEL EVENTO — capturarla, verla y compartirla.
 *
 * Hasta hoy la invitación digital era una demo con los datos escritos en el
 * código: para vender una hacía falta que alguien tocara el repositorio y
 * volviera a desplegar. Esta pantalla la convierte en lo que tenía que ser desde
 * el principio: una FICHA que el salón llena, guarda y comparte por WhatsApp,
 * igual que llena cualquier otro dato del evento.
 *
 * DÓNDE SE GUARDA — en la colección `invitacion` del "lugar central", una sola
 * fila por evento (ver `@salones/core`, que define el molde y el id).
 *
 * POR QUÉ HACE FALTA LA LLAVE DE ANFITRIÓN — `invitacion` no está en la lista
 * blanca de `items_reescribibles` (migración 0016), así que la base RECHAZA con
 * un 403 cualquier reescritura que no traiga el pase de anfitrión. Eso es justo
 * lo que se quiere: un invitado con el enlace de la boda no puede cambiar la
 * invitación. Como el salón sí es el anfitrión —y su llave está en la ficha del
 * evento, que solo ve su propio salón por RLS—, esta pantalla la activa sola en
 * este navegador al guardar, y lo dice en pantalla en vez de dejar un 403 seco.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Plus,
  SearchX,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, Card } from "@salones/ui";
import {
  COLECCION_INVITACION,
  COLOR_INVITACION,
  fechaLarga,
  fotosDeInvitacion,
  idInvitacion,
  invitacionDe,
  invitacionVacia,
  nombresInvitacion,
  type Invitacion,
  type Momento,
  type Padrino,
  type Sede,
  type Tienda,
} from "@salones/core";
import {
  comprimirImagen,
  esSinPermiso,
  mensajeDeSubida,
  obtenerSync,
  recordarClaveAnfitrion,
  resolverMedios,
} from "@salones/sync";
import { obtenerSupabase } from "@/lib/supabase";
import { obtenerEvento, type EventoFila } from "@/lib/eventos";
import { enlaceInvitacion } from "@/lib/pantallas";

/* ------------------------------------------------------------------ */
/* Piezas de formulario (aquí, porque solo las usa esta pantalla)      */
/* ------------------------------------------------------------------ */

const CAMPO =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

function Campo({
  etiqueta,
  valor,
  onChange,
  placeholder,
  ayuda,
  tipo = "text",
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ayuda?: string;
  tipo?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{etiqueta}</span>
      <input
        type={tipo}
        className={CAMPO}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {ayuda ? <span className="mt-1 block text-xs text-muted-foreground">{ayuda}</span> : null}
    </label>
  );
}

/** Lo que necesita un campo de foto para subir y para enseñar la miniatura. */
type Fotos = {
  /** A qué evento se suben (y con qué pase se firman). */
  codigo: string;
  /** Referencia guardada → dirección que sí se puede pintar aquí y ahora. */
  verse: (referencia: string) => string;
  /** Apunta la vista previa de una foto recién subida. */
  recordar: (referencia: string, url: string) => void;
};

/**
 * UN CAMPO DE FOTO: se sube desde el teléfono o la computadora, o se pega un
 * enlace de toda la vida.
 *
 * Por qué las dos cosas: SUBIR es lo que necesita un salón que no es técnico
 * —antes había que tener la foto colgada en algún lado y pegar su dirección—, y
 * el ENLACE se queda porque las invitaciones capturadas así siguen funcionando
 * y porque a veces la foto ya vive en otro sitio.
 *
 * Lo que se guarda al subir es una REFERENCIA al almacén privado (corte de la
 * 0013), no una dirección que se pueda abrir: las firmadas caducan en una hora
 * y una invitación se manda meses antes. Se firman al abrir la invitación; aquí
 * se firman aparte, solo para la miniatura.
 */
function CampoFoto({
  etiqueta,
  valor,
  onChange,
  ayuda,
  placeholder = "https://…/foto.jpg",
  fotos,
}: {
  etiqueta?: string;
  valor: string;
  onChange: (v: string) => void;
  ayuda?: string;
  placeholder?: string;
  fotos: Fotos;
}) {
  const { codigo, verse, recordar } = fotos;
  const [subiendo, setSubiendo] = React.useState(false);
  const [error, setError] = React.useState("");
  const entrada = React.useRef<HTMLInputElement>(null);

  const elegir = async (file: File | undefined) => {
    if (!file) return;
    setSubiendo(true);
    setError("");
    try {
      // Se comprime antes de subir, igual que en el álbum y el muro: una foto de
      // teléfono son 4 MB y todos los eventos comparten el mismo cajón.
      const blob = await comprimirImagen(file);
      const referencia = await obtenerSync().subirArchivo(
        codigo,
        `invitacion-${Date.now()}.jpg`,
        blob,
        "image/jpeg",
      );
      // La miniatura sale del archivo que ya tenemos, sin volver a pedirlo.
      recordar(referencia, URL.createObjectURL(blob));
      onChange(referencia);
    } catch (e) {
      setError(mensajeDeSubida(e));
    } finally {
      setSubiendo(false);
      // Para poder reintentar con el MISMO archivo si algo salió mal.
      if (entrada.current) entrada.current.value = "";
    }
  };

  return (
    <div>
      {etiqueta ? <span className="mb-1.5 block text-sm font-medium">{etiqueta}</span> : null}
      <div className="flex items-start gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[var(--radius)] border border-border bg-muted">
          {valor ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={verse(valor)} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={entrada}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void elegir(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={subiendo}
              onClick={() => entrada.current?.click()}
            >
              {subiendo ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Subiendo…
                </>
              ) : (
                <>
                  <Upload className="size-4" /> {valor ? "Cambiar foto" : "Subir foto"}
                </>
              )}
            </Button>
            {valor ? (
              <Button variant="ghost" size="sm" onClick={() => onChange("")}>
                Quitar
              </Button>
            ) : null}
          </div>
          <input
            type="text"
            className={CAMPO}
            value={valor}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{error}</p>
      ) : ayuda ? (
        <p className="mt-2 text-xs text-muted-foreground">{ayuda}</p>
      ) : null}
    </div>
  );
}

function Area({
  etiqueta,
  valor,
  onChange,
  placeholder,
  filas = 3,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  filas?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{etiqueta}</span>
      <textarea
        className={CAMPO}
        rows={filas}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Un apartado de la ficha, con su explicación de para qué sirve. */
function Bloque({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mt-6 p-6">
      <h2 className="font-semibold">{titulo}</h2>
      {descripcion ? <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </Card>
  );
}

/**
 * Una lista de renglones que se pueden añadir y quitar (itinerario, padrinos,
 * fotos…). Es la mitad del trabajo de esta pantalla: casi todo lo que distingue
 * una boda de otra es una lista de largo distinto.
 */
function Lista<T>({
  items,
  onChange,
  nuevo,
  etiquetaAgregar,
  render,
  vacio,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  nuevo: () => T;
  etiquetaAgregar: string;
  render: (item: T, cambiar: (item: T) => void) => React.ReactNode;
  vacio?: string;
}) {
  const cambiarEn = (i: number, item: T) => onChange(items.map((x, j) => (j === i ? item : x)));
  const quitar = (i: number) => onChange(items.filter((_, j) => j !== i));

  return (
    <div className="space-y-3">
      {items.length === 0 && vacio ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : null}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{render(item, (x) => cambiarEn(i, x))}</div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Quitar este renglón"
            onClick={() => quitar(i)}
            className="mt-1 shrink-0"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, nuevo()])}>
        <Plus className="size-4" /> {etiquetaAgregar}
      </Button>
    </div>
  );
}

/** Los datos de una sede (la misa, el salón). */
function CamposSede({
  sede,
  onChange,
  fotos,
}: {
  sede: Sede;
  onChange: (s: Sede) => void;
  fotos: Fotos;
}) {
  const set = (k: keyof Sede, v: string) => onChange({ ...sede, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo etiqueta="Cómo se llama" valor={sede.titulo} onChange={(v) => set("titulo", v)} />
      <Campo
        etiqueta="Hora"
        valor={sede.hora}
        onChange={(v) => set("hora", v)}
        placeholder="6:00 p.m."
        ayuda="Se enseña tal cual la escribas."
      />
      <Campo
        etiqueta="Lugar"
        valor={sede.lugar}
        onChange={(v) => set("lugar", v)}
        placeholder="Hacienda Santa Renata"
      />
      <Campo
        etiqueta="Dirección"
        valor={sede.direccion}
        onChange={(v) => set("direccion", v)}
        placeholder="Km 8 Carretera a Navolato, Culiacán"
      />
      <div className="sm:col-span-2">
        <Campo
          etiqueta="Enlace del mapa"
          valor={sede.mapa}
          onChange={(v) => set("mapa", v)}
          placeholder="https://maps.google.com/…"
          ayuda="Búscalo en Google Maps, dale a Compartir y pega el enlace. Si lo dejas vacío, el botón «Cómo llegar» busca el lugar por su nombre."
        />
      </div>
      <div className="sm:col-span-2">
        <CampoFoto
          etiqueta="Foto del lugar"
          valor={sede.foto}
          onChange={(v) => set("foto", v)}
          placeholder="https://…/salon.jpg"
          ayuda="Va arriba de la tarjeta. Sin ella, la tarjeta sale sin foto."
          fotos={fotos}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* La pantalla                                                        */
/* ------------------------------------------------------------------ */

export default function InvitacionDelEvento({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo: crudo } = React.use(params);
  const codigo = decodeURIComponent(crudo);
  const router = useRouter();

  const [cargando, setCargando] = React.useState(true);
  const [evento, setEvento] = React.useState<EventoFila | null>(null);
  const [inv, setInv] = React.useState<Invitacion>(invitacionVacia());
  const [sucio, setSucio] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [aviso, setAviso] = React.useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [copiado, setCopiado] = React.useState("");
  /**
   * Miniaturas: referencia guardada → dirección que se puede pintar AHORA.
   *
   * Vive FUERA de la ficha a propósito. Lo que se guarda en la invitación es la
   * referencia; esto es solo para que el salón vea la foto mientras captura, y
   * se tira al recargar. Metido dentro de `inv` se acabaría guardando en la base
   * una dirección firmada que caduca en una hora.
   */
  const [vistas, setVistas] = React.useState<Record<string, string>>({});

  const enlace = enlaceInvitacion(codigo);

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
      const ficha = await obtenerEvento(supabase, codigo);
      setEvento(ficha);
      if (ficha) {
        try {
          const items = await obtenerSync().listar(codigo, COLECCION_INVITACION);
          const guardada = invitacionDe(codigo, items);
          if (guardada) {
            setInv(guardada);
            // Las fotos ya subidas son referencias a un almacén privado: para
            // enseñar la miniatura hay que pedir su dirección firmada. Si falla,
            // se queda el icono gris — es una miniatura, no la invitación.
            const fotos = fotosDeInvitacion(guardada);
            if (fotos.length) {
              try {
                setVistas(await resolverMedios(codigo, fotos));
              } catch {
                /* sin miniaturas; la ficha se captura igual */
              }
            }
          }
        } catch {
          // Sin red: se empieza con la ficha en blanco. No se pisa nada hasta
          // que el salón pulse Guardar, así que no hay riesgo de borrar lo que
          // ya hubiera capturado.
          setAviso({
            tipo: "error",
            texto: "No pudimos leer la invitación guardada. Revisa tu conexión antes de guardar.",
          });
        }
      }
      setCargando(false);
    });
  }, [router, codigo]);

  /** Cambia un campo de la ficha y marca que hay cambios sin guardar. */
  const set = <K extends keyof Invitacion>(clave: K, valor: Invitacion[K]) => {
    setInv((v) => ({ ...v, [clave]: valor }));
    setSucio(true);
    setAviso(null);
  };

  const guardar = async () => {
    if (!evento) return;
    setGuardando(true);
    setAviso(null);

    /*
     * La llave de anfitrión, en este navegador y para este evento. Sin ella la
     * base contesta 403 (candado de la 0016) y el salón vería un fallo sin
     * saber por qué. Se puede activar sin preguntar porque para llegar aquí ya
     * hizo falta la sesión del personal, y la RLS solo deja ver los eventos del
     * propio salón: quien está en esta pantalla ES el anfitrión.
     */
    if (evento.clave_anfitrion) recordarClaveAnfitrion(codigo, evento.clave_anfitrion);

    try {
      await obtenerSync().guardar(codigo, COLECCION_INVITACION, {
        ...inv,
        id: idInvitacion(codigo),
      });
      setSucio(false);
      setAviso({ tipo: "ok", texto: "Invitación guardada. Los invitados ya la ven actualizada." });
    } catch (e) {
      setAviso({
        tipo: "error",
        texto: esSinPermiso(e)
          ? "La base no dejó guardar: este evento no tiene llave de anfitrión. Genérala desde el panel del evento."
          : "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setGuardando(false);
    }
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

  const compartir = () => {
    const quien = nombresInvitacion(inv) || evento?.nombre || "nuestro evento";
    const cuando = fechaLarga(inv.fechaISO);
    const msg = `¡Hola! Te compartimos la invitación de ${quien}${cuando ? ` · ${cuando}` : ""}:\n${enlace}`;
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

  const esXV = inv.tipo === "xv";

  /** Lo que necesitan los campos de foto: dónde subir y cómo verse. */
  const fotos: Fotos = {
    codigo,
    verse: (referencia) => vistas[referencia] ?? referencia,
    recordar: (referencia, url) => setVistas((v) => ({ ...v, [referencia]: url })),
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 pb-28">
      <Link
        href={`/eventos/${encodeURIComponent(codigo)}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {evento.nombre}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Invitación digital</h1>
      <p className="mt-2 text-muted-foreground">
        Llénala como quieras y guárdala: el enlace es siempre el mismo, así que puedes corregir
        cualquier dato aunque ya la hayas compartido. Lo que dejes en blanco simplemente no aparece.
      </p>

      {/* El enlace, arriba del todo: es lo que el salón viene a buscar */}
      <Card className="mt-8 p-6">
        <h2 className="font-semibold">El enlace de la invitación</h2>
        {enlace ? (
          <>
            <p className="mt-1 truncate text-sm text-muted-foreground">{enlace}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={enlace} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Eye className="size-4" /> Verla <ExternalLink className="size-4" />
                </Button>
              </a>
              <Button variant="outline" size="sm" onClick={() => copiar(enlace, "enlace")}>
                {copiado === "enlace" ? (
                  <>
                    <Check className="size-4" /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" /> Copiar enlace
                  </>
                )}
              </Button>
              <Button size="sm" onClick={compartir}>
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </Button>
            </div>
            {/* Que nadie reparta el enlace general creyendo que era el personal. */}
            <p className="mt-3 text-xs text-muted-foreground">
              Este es el enlace general (para grupos o redes). Los enlaces{" "}
              <strong>personales</strong> —los que saludan a cada invitado por su nombre y le
              enseñan su mesa— se reparten uno por uno desde{" "}
              <Link
                href={`/eventos/${encodeURIComponent(codigo)}/confirmaciones`}
                className="font-medium text-primary underline underline-offset-2"
              >
                Confirmaciones
              </Link>
              .
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            Falta configurar la dirección de la app de invitaciones en el catálogo.
          </p>
        )}
      </Card>

      <Bloque
        titulo="Lo básico"
        descripcion="Lo primero que ve el invitado al abrirla: de quién es, cuándo y dónde."
      >
        <div>
          <span className="mb-1.5 block text-sm font-medium">¿Qué se celebra?</span>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: "boda" as const, t: "Boda" },
              { v: "xv" as const, t: "XV años" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                aria-pressed={inv.tipo === o.v}
                onClick={() => set("tipo", o.v)}
                className={`rounded-[var(--radius)] border px-4 py-2.5 text-sm transition-colors ${
                  inv.tipo === o.v
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {o.t}
              </button>
            ))}
          </div>
        </div>

        {esXV ? (
          <Campo
            etiqueta="Nombre de la festejada"
            valor={inv.festejada}
            onChange={(v) => set("festejada", v)}
            placeholder="Valentina Sofía"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Novia"
              valor={inv.novia}
              onChange={(v) => set("novia", v)}
              placeholder="Ana"
            />
            <Campo
              etiqueta="Novio"
              valor={inv.novio}
              onChange={(v) => set("novio", v)}
              placeholder="Rodrigo"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Fecha y hora de inicio"
            tipo="datetime-local"
            valor={inv.fechaISO}
            onChange={(v) => set("fechaISO", v)}
            ayuda={
              inv.fechaISO
                ? `En la invitación se lee: ${fechaLarga(inv.fechaISO)}`
                : "De aquí sale la cuenta regresiva."
            }
          />
          <Campo
            etiqueta="Ciudad"
            valor={inv.ciudad}
            onChange={(v) => set("ciudad", v)}
            placeholder="Culiacán, Sinaloa"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Hashtag (opcional)"
            valor={inv.hashtag}
            onChange={(v) => set("hashtag", v)}
            placeholder="#AnaYRodrigo"
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Color de la invitación</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(inv.color) ? inv.color : COLOR_INVITACION}
                onChange={(e) => set("color", e.target.value)}
                className="size-10 shrink-0 cursor-pointer rounded-[var(--radius)] border border-border bg-background"
                aria-label="Color de la invitación"
              />
              <input
                type="text"
                className={CAMPO}
                value={inv.color}
                onChange={(e) => set("color", e.target.value)}
                placeholder={COLOR_INVITACION}
              />
            </div>
            <span className="mt-1 block text-xs text-muted-foreground">
              Tiñe los rótulos caligráficos, las flores dibujadas y los botones.
            </span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoFoto
            etiqueta="Foto de portada"
            valor={inv.fotoPortada}
            onChange={(v) => set("fotoPortada", v)}
            placeholder="https://…/portada.jpg"
            ayuda="Ocupa toda la primera pantalla: mejor una apaisada y con espacio arriba."
            fotos={fotos}
          />
          <CampoFoto
            etiqueta="Foto del cierre"
            valor={inv.fotoCierre}
            onChange={(v) => set("fotoCierre", v)}
            placeholder="https://…/cierre.jpg"
            ayuda="La del final, con el «gracias». Si la dejas vacía se repite la de portada."
            fotos={fotos}
          />
        </div>
      </Bloque>

      <Bloque titulo="Los textos" descripcion="La frase de apertura y el saludo a los invitados.">
        <Area
          etiqueta="Frase de apertura"
          valor={inv.frase}
          onChange={(v) => set("frase", v)}
          placeholder="Con la bendición de Dios y de nuestros padres…"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Quién la firma"
            valor={inv.autorFrase}
            onChange={(v) => set("autorFrase", v)}
            placeholder="Ana & Rodrigo"
            ayuda="Va debajo de la frase. Vacío = se firma con los nombres."
          />
          <Campo
            etiqueta="Pie de la cuenta regresiva"
            valor={inv.conteoNota}
            onChange={(v) => set("conteoNota", v)}
            placeholder="para una noche entre flores y luces"
          />
        </div>
        <Area
          etiqueta="Saludo"
          valor={inv.saludo}
          onChange={(v) => set("saludo", v)}
          placeholder="Nos encantaría celebrar contigo este día…"
        />
      </Bloque>

      <Bloque
        titulo="Padres y padrinos"
        descripcion="Escribe un nombre por renglón. Lo que no pongas, no se enseña."
      >
        <Campo
          etiqueta="Título del bloque de padres"
          valor={inv.padres.titulo}
          onChange={(v) => set("padres", { ...inv.padres, titulo: v })}
          placeholder="Con la bendición de nuestros padres"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm font-medium">
              {esXV ? "Padres de la festejada" : "Padres de la novia"}
            </span>
            <Lista
              items={inv.padres.novia}
              onChange={(v) => set("padres", { ...inv.padres, novia: v })}
              nuevo={() => ""}
              etiquetaAgregar="Agregar nombre"
              vacio="Sin nombres todavía."
              render={(nombre, cambiar) => (
                <input
                  className={CAMPO}
                  value={nombre}
                  onChange={(e) => cambiar(e.target.value)}
                  placeholder="Sra. Laura Medina"
                />
              )}
            />
          </div>
          {esXV ? null : (
            <div>
              <span className="mb-1.5 block text-sm font-medium">Padres del novio</span>
              <Lista
                items={inv.padres.novio}
                onChange={(v) => set("padres", { ...inv.padres, novio: v })}
                nuevo={() => ""}
                etiquetaAgregar="Agregar nombre"
                vacio="Sin nombres todavía."
                render={(nombre, cambiar) => (
                  <input
                    className={CAMPO}
                    value={nombre}
                    onChange={(e) => cambiar(e.target.value)}
                    placeholder="Sr. Manuel Salazar"
                  />
                )}
              />
            </div>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium">Padrinos</span>
          <Lista<Padrino>
            items={inv.padrinos}
            onChange={(v) => set("padrinos", v)}
            nuevo={() => ({ rol: "", nombres: "" })}
            etiquetaAgregar="Agregar padrinos"
            vacio="Sin padrinos. Muchas invitaciones no llevan; si es el caso, déjalo así."
            render={(p, cambiar) => (
              <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr]">
                <input
                  className={CAMPO}
                  value={p.rol}
                  onChange={(e) => cambiar({ ...p, rol: e.target.value })}
                  placeholder="Padrinos de velación"
                />
                <input
                  className={CAMPO}
                  value={p.nombres}
                  onChange={(e) => cambiar({ ...p, nombres: e.target.value })}
                  placeholder="Alejandro Robles y Lucía Márquez"
                />
              </div>
            )}
          />
        </div>
      </Bloque>

      <Bloque
        titulo="Ceremonia"
        descripcion="El primer lugar del día: la misa, el civil… Si solo hay un lugar, llena este y deja la recepción vacía."
      >
        <CamposSede sede={inv.ceremonia} onChange={(s) => set("ceremonia", s)} fotos={fotos} />
      </Bloque>

      <Bloque titulo="Recepción" descripcion="El salón, la fiesta.">
        <CamposSede sede={inv.recepcion} onChange={(s) => set("recepcion", s)} fotos={fotos} />
      </Bloque>

      <Bloque
        titulo="Itinerario"
        descripcion="El plan de la noche, momento a momento. Cada renglón lleva su foto redonda al lado."
      >
        <Lista<Momento>
          items={inv.itinerario}
          onChange={(v) => set("itinerario", v)}
          nuevo={() => ({ hora: "", titulo: "", detalle: "", foto: "" })}
          etiquetaAgregar="Agregar momento"
          vacio="Sin itinerario. Si lo dejas vacío, esa sección no aparece."
          render={(m, cambiar) => (
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
                <input
                  className={`${CAMPO} sm:w-32`}
                  value={m.hora}
                  onChange={(e) => cambiar({ ...m, hora: e.target.value })}
                  placeholder="8:00 p.m."
                />
                <input
                  className={CAMPO}
                  value={m.titulo}
                  onChange={(e) => cambiar({ ...m, titulo: e.target.value })}
                  placeholder="Recepción y cena"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className={CAMPO}
                  value={m.detalle}
                  onChange={(e) => cambiar({ ...m, detalle: e.target.value })}
                  placeholder="Servicio de tres tiempos en el salón"
                />
                <CampoFoto valor={m.foto} onChange={(v) => cambiar({ ...m, foto: v })} fotos={fotos} />
              </div>
            </div>
          )}
        />
      </Bloque>

      <Bloque titulo="Vestimenta">
        <Campo
          etiqueta="Código de vestimenta"
          valor={inv.vestimenta}
          onChange={(v) => set("vestimenta", v)}
          placeholder="Etiqueta rigurosa"
        />
        <Campo
          etiqueta="Nota (opcional)"
          valor={inv.vestimentaNota}
          onChange={(v) => set("vestimentaNota", v)}
          placeholder="Se sugiere reservar el color blanco para la novia."
        />
        <div>
          <span className="mb-1.5 block text-sm font-medium">Paleta de colores</span>
          <p className="mb-2 text-xs text-muted-foreground">
            Se enseñan como círculos debajo de la etiqueta, para que el invitado sepa por dónde va
            la fiesta. Si no pones ninguno, no aparecen.
          </p>
          <Lista<string>
            items={inv.vestimentaColores}
            onChange={(v) => set("vestimentaColores", v)}
            nuevo={() => "#7C8B6F"}
            etiquetaAgregar="Agregar color"
            vacio="Sin paleta."
            render={(c, cambiar) => (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(c) ? c : "#7C8B6F"}
                  onChange={(e) => cambiar(e.target.value)}
                  className="size-10 shrink-0 cursor-pointer rounded-[var(--radius)] border border-border bg-background"
                  aria-label="Color de la paleta"
                />
                <input className={CAMPO} value={c} onChange={(e) => cambiar(e.target.value)} />
              </div>
            )}
          />
        </div>
      </Bloque>

      <Bloque
        titulo="Fotos de repuesto"
        descripcion="Rellenan los círculos del itinerario que no tengan foto propia, para que la línea de tiempo no salga con huecos. No es el álbum del evento: eso son las fotos que suben los invitados, y se contrata aparte."
      >
        <Lista<string>
          items={inv.fotos}
          onChange={(v) => set("fotos", v)}
          nuevo={() => ""}
          etiquetaAgregar="Agregar foto"
          vacio="Sin fotos de repuesto: los círculos vacíos usarán la de portada."
          render={(url, cambiar) => <CampoFoto valor={url} onChange={cambiar} fotos={fotos} />}
        />
      </Bloque>

      <Bloque titulo="Mesa de regalos" descripcion="Todo esto es opcional.">
        <Area
          etiqueta="Texto"
          valor={inv.regalos.texto}
          onChange={(v) => set("regalos", { ...inv.regalos, texto: v })}
          placeholder="Tu presencia es nuestro mejor regalo…"
        />
        <div>
          <span className="mb-1.5 block text-sm font-medium">Tiendas</span>
          <Lista<Tienda>
            items={inv.regalos.tiendas}
            onChange={(v) => set("regalos", { ...inv.regalos, tiendas: v })}
            nuevo={() => ({ nombre: "", url: "" })}
            etiquetaAgregar="Agregar tienda"
            vacio="Sin mesa de regalos en tienda."
            render={(t, cambiar) => (
              <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr]">
                <input
                  className={CAMPO}
                  value={t.nombre}
                  onChange={(e) => cambiar({ ...t, nombre: e.target.value })}
                  placeholder="Liverpool"
                />
                <input
                  className={CAMPO}
                  value={t.url}
                  onChange={(e) => cambiar({ ...t, url: e.target.value })}
                  placeholder="https://mesaderegalos.liverpool.com.mx/…"
                />
              </div>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Banco"
            valor={inv.regalos.banco}
            onChange={(v) => set("regalos", { ...inv.regalos, banco: v })}
            placeholder="BBVA"
          />
          <Campo
            etiqueta="Titular de la cuenta"
            valor={inv.regalos.titular}
            onChange={(v) => set("regalos", { ...inv.regalos, titular: v })}
            placeholder="Mariana Estrada Ruiz"
          />
        </div>
        <Campo
          etiqueta="CLABE"
          valor={inv.regalos.clabe}
          onChange={(v) => set("regalos", { ...inv.regalos, clabe: v })}
          placeholder="012320004512873645"
          ayuda="Si la pones, el invitado ve un botón para copiarla sin teclearla. Déjala vacía si no quieren lluvia de sobres."
        />
      </Bloque>

      <Bloque
        titulo="Una nota"
        descripcion="Lo incómodo pero necesario: «solo adultos», estacionamiento, alguna indicación."
      >
        <Campo
          etiqueta="Título"
          valor={inv.nota.titulo}
          onChange={(v) => set("nota", { ...inv.nota, titulo: v })}
          placeholder="Una nota"
        />
        <Area
          etiqueta="Texto"
          valor={inv.nota.texto}
          onChange={(v) => set("nota", { ...inv.nota, texto: v })}
          placeholder="Hemos reservado un lugar especial para ti…"
        />
      </Bloque>

      <Bloque
        titulo="Confirmación de asistencia"
        descripcion="Las respuestas caen solas en el tablero «Confirmaciones» de este mismo evento."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="WhatsApp que recibe las confirmaciones"
            valor={inv.rsvp.whatsapp}
            onChange={(v) => set("rsvp", { ...inv.rsvp, whatsapp: v })}
            placeholder="526671234567"
            ayuda="Con lada del país (52 en México) y sin espacios. Opcional: es el camino alterno para quien prefiera mandarlo por WhatsApp."
          />
          <Campo
            etiqueta="Fecha límite para confirmar"
            valor={inv.rsvp.fechaLimite}
            onChange={(v) => set("rsvp", { ...inv.rsvp, fechaLimite: v })}
            placeholder="1 de marzo de 2027"
          />
        </div>
      </Bloque>

      <Bloque
        titulo="Música de fondo"
        descripcion="Suena al tocar «Abrir invitación», con un botón para silenciarla. Es opcional; sin enlace, el botón no aparece."
      >
        <Campo
          etiqueta="Enlace de la canción (mp3)"
          valor={inv.musica}
          onChange={(v) => set("musica", v)}
          placeholder="https://…/cancion.mp3"
          ayuda="Tiene que ser un archivo mp3 con dirección pública (no sirve un enlace de Spotify o de YouTube). Asegúrate de tener permiso para usar esa canción."
        />
      </Bloque>

      {/* Barra de guardado: siempre a la vista, porque la ficha es larga */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-6 py-3">
          <div className="min-w-0 flex-1 text-sm">
            {aviso ? (
              <span
                className={
                  aviso.tipo === "ok"
                    ? "text-green-700 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400"
                }
              >
                {aviso.texto}
              </span>
            ) : sucio ? (
              <span className="text-muted-foreground">Tienes cambios sin guardar.</span>
            ) : (
              <span className="text-muted-foreground">Todo guardado.</span>
            )}
          </div>
          <Button onClick={() => void guardar()} disabled={guardando || !sucio}>
            {guardando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Guardar invitación
          </Button>
        </div>
      </div>
    </main>
  );
}
