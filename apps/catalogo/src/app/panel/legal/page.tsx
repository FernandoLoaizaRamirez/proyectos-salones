"use client";

/**
 * LOS DOCUMENTOS LEGALES DEL SALÓN, editables desde el panel (migración 0033).
 *
 * EL AGUJERO QUE CIERRA (29 ago 2026): los datos del responsable vivían
 * QUEMADOS en `apps/catalogo/src/lib/legal.ts` con el salón de demostración
 * dentro —y con el correo y el domicilio personales de quien mantiene el
 * proyecto—, así que el aviso publicado nombraba responsable a un salón
 * inventado. Ahora cada salón captura los suyos aquí.
 *
 * LA VISTA PREVIA ES LA VERDAD: debajo del formulario se pinta el apartado 1
 * REAL del aviso, generado con las MISMAS funciones que sirven la página
 * pública. El salón lee, palabra por palabra, lo que van a leer sus invitados.
 * No hay una segunda implementación que pueda discrepar.
 *
 * QUIÉN PUEDE GUARDAR LO DECIDE LA BASE (`tl_wr_admin`: dueño o admin de SU
 * salón). Aquí solo se esconde el botón para no ofrecer lo que el servidor va a
 * negar. Y QUÉ SE PUEDE PUBLICAR también lo decide la base: el CHECK
 * `tl_publicado_completo` rechaza un aviso sin responsable identificable. El
 * botón deshabilitado es cortesía; la regla está en Postgres (lección de la
 * 0016: PostgREST es público).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2, Scale, TriangleAlert } from "lucide-react";
import { Button, Card } from "@salones/ui";
import {
  avisoPrivacidad,
  datosDelSalon,
  estadoLegal,
  AVISO_BORRADOR,
  REVISADO_POR_ABOGADO,
} from "@salones/legal";
import { obtenerSupabase } from "@/lib/supabase";
import { leerIdentidad, type Identidad } from "@/lib/sesion";
import { PROVEEDOR, SITIO_LEGAL } from "@/lib/legal";
import {
  guardarLegalSalon,
  obtenerLegalSalon,
  publicarLegalSalon,
  type LegalSalon,
} from "@/lib/legal-salon";
import type { ResultadoGuardado } from "@/lib/branding";

const CAMPO =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm";

type Borrador = {
  razonSocial: string;
  domicilio: string;
  contacto: string;
  telefono: string;
  diasConservacion: string;
};

const VACIO: Borrador = {
  razonSocial: "",
  domicilio: "",
  contacto: "",
  telefono: "",
  diasConservacion: "",
};

function aBorrador(fila: LegalSalon | null): Borrador {
  return {
    razonSocial: fila?.razonSocial ?? "",
    domicilio: fila?.domicilio ?? "",
    contacto: fila?.contacto ?? "",
    telefono: fila?.telefono ?? "",
    diasConservacion: fila?.diasConservacion ? String(fila.diasConservacion) : "",
  };
}

/** El motivo del fracaso, en cristiano. */
function explicar(r: ResultadoGuardado & { ok: false }): string {
  if (r.motivo === "sin-servidor") return "No hay conexión con el servidor. Inténtalo de nuevo.";
  if (r.motivo === "sin-permiso")
    return "Tu cuenta no puede cambiar esto. Pídeselo al dueño o a un administrador del salón.";
  return r.detalle ?? "No se pudo guardar.";
}

export default function PanelLegal() {
  const router = useRouter();
  const [identidad, setIdentidad] = React.useState<Identidad | null>(null);
  const [userId, setUserId] = React.useState<string>("");
  const [cargando, setCargando] = React.useState(true);
  const [falloLectura, setFalloLectura] = React.useState(false);
  const [publicado, setPublicado] = React.useState(false);
  const [borrador, setBorrador] = React.useState<Borrador>(VACIO);
  const [acepta, setAcepta] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copiado, setCopiado] = React.useState(false);

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
      const id = leerIdentidad(data.session.user);
      setIdentidad(id);
      setUserId(data.session.user.id);
      if (id) {
        const fila = await obtenerLegalSalon(id.tenantId);
        // "fallo" NO se traduce a formulario vacío: guardar es un upsert, y
        // ofrecer Guardar sobre campos en blanco porque la LECTURA tropezó
        // borraría el domicilio del responsable. Mismo criterio que la marca.
        if (fila === "fallo") setFalloLectura(true);
        else {
          setBorrador(aBorrador(fila));
          setPublicado(fila?.publicado === true);
          setAcepta(Boolean(fila?.aceptoBorradorEn));
        }
      }
      setCargando(false);
    });
  }, [router]);

  const puedeEditar = identidad?.rol === "owner" || identidad?.rol === "admin";

  const filaPrevia = {
    salon: borrador.razonSocial,
    domicilio: borrador.domicilio,
    contacto: borrador.contacto,
    diasConservacion: Number(borrador.diasConservacion) || undefined,
  };
  const { pendientes, completo } = estadoLegal(filaPrevia);

  // El apartado 1 REAL, con las mismas funciones que sirven la página pública.
  // El respaldo vacío es por el tipado estricto de índices: `secciones` nunca
  // viene vacía (el aviso tiene nueve apartados fijos), pero TypeScript no lo
  // sabe y no vale la pena afirmarlo con un `!`.
  const vistaPrevia = avisoPrivacidad(datosDelSalon(filaPrevia, PROVEEDOR)).secciones[0] ?? {
    titulo: "1. Quién es responsable de tus datos",
    parrafos: [],
  };

  const guardar = async () => {
    if (!identidad) return;
    setGuardando(true);
    setAviso(null);
    setError(null);
    const dias = Number(borrador.diasConservacion);
    const r = await guardarLegalSalon(
      identidad.tenantId,
      {
        razonSocial: borrador.razonSocial,
        domicilio: borrador.domicilio,
        contacto: borrador.contacto,
        telefono: borrador.telefono,
        diasConservacion: Number.isFinite(dias) && dias > 0 ? dias : undefined,
      },
      userId,
    );
    setGuardando(false);
    if (r.ok) setAviso("Guardado. Los cambios se ven en unos minutos.");
    else setError(explicar(r));
  };

  const cambiarPublicacion = async (publicar: boolean) => {
    if (!identidad) return;
    setGuardando(true);
    setAviso(null);
    setError(null);

    // RETIRAR no guarda antes, y es a proposito: si el salon acaba de vaciar el
    // domicilio en el formulario, guardar dejaria `publicado` todavia en true
    // con el campo vacio, el CHECK saltaria, y quien queria RETIRAR leeria
    // "faltan datos para poder publicar" sin forma de salir. Retirar nunca
    // necesita los datos nuevos.
    if (!publicar) {
      const r = await publicarLegalSalon(identidad.tenantId, userId, false);
      setGuardando(false);
      if (r.ok) {
        setPublicado(false);
        setAviso("Retirado. Mientras tanto, tus invitados leen un aviso sin tus datos.");
      } else setError(explicar(r));
      return;
    }

    // Publicar SI guarda primero: publicar sobre datos sin guardar publicaria
    // los viejos.
    const g = await guardarLegalSalon(
      identidad.tenantId,
      {
        razonSocial: borrador.razonSocial,
        domicilio: borrador.domicilio,
        contacto: borrador.contacto,
        telefono: borrador.telefono,
        diasConservacion: Number(borrador.diasConservacion) || undefined,
      },
      userId,
    );
    if (!g.ok) {
      setGuardando(false);
      setError(explicar(g));
      return;
    }
    const r = await publicarLegalSalon(identidad.tenantId, userId, publicar);
    setGuardando(false);
    if (r.ok) {
      setPublicado(publicar);
      setAviso(
        publicar
          ? "Publicado. Tus invitados ya leen tu aviso (puede tardar unos minutos)."
          : "Retirado. Mientras tanto, tus invitados leen un aviso sin tus datos.",
      );
    } else setError(explicar(r));
  };

  if (cargando) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Panel
      </Link>

      <h1 className="mt-6 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Scale className="size-6 text-primary" /> Documentos legales
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        La ley dice que el responsable de los datos de tus invitados eres tú, el salón — nosotros
        solo ponemos la tecnología. Por eso tu aviso de privacidad lleva TUS datos, y solo tú los
        puedes poner.
      </p>

      {!REVISADO_POR_ABOGADO ? (
        <div className="mt-5 rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4" /> Todavía sin revisar por un abogado
          </p>
          <p className="mt-1 text-muted-foreground">{AVISO_BORRADOR}</p>
        </div>
      ) : null}

      {falloLectura ? (
        <div className="mt-5 rounded-[var(--radius)] border border-destructive/40 bg-destructive/10 p-4 text-sm">
          No se pudieron leer tus datos legales. No guardes nada todavía: podrías borrar lo que ya
          tenías. Recarga la página en un momento.
        </div>
      ) : null}

      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Tus datos como responsable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esto sale publicado en tu aviso de privacidad, y la ley lo exige.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium">Razón social o nombre del salón</span>
            <input
              className={`mt-1 ${CAMPO}`}
              value={borrador.razonSocial}
              disabled={!puedeEditar || falloLectura}
              onChange={(e) => setBorrador({ ...borrador, razonSocial: e.target.value })}
              placeholder="Jardín Los Encinos S.A. de C.V."
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Domicilio</span>
            <input
              className={`mt-1 ${CAMPO}`}
              value={borrador.domicilio}
              disabled={!puedeEditar || falloLectura}
              onChange={(e) => setBorrador({ ...borrador, domicilio: e.target.value })}
              placeholder="Calle y número, colonia, ciudad, estado, C.P."
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              El domicilio del responsable es obligatorio en el aviso de privacidad.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Correo donde atiendes a tus invitados</span>
            <input
              className={`mt-1 ${CAMPO}`}
              value={borrador.contacto}
              disabled={!puedeEditar || falloLectura}
              onChange={(e) => setBorrador({ ...borrador, contacto: e.target.value })}
              placeholder="privacidad@tusalon.mx"
              inputMode="email"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Ahí te escribirán quienes quieran ver, corregir o borrar sus datos.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Teléfono (opcional)</span>
            <input
              className={`mt-1 ${CAMPO}`}
              value={borrador.telefono}
              disabled={!puedeEditar || falloLectura}
              onChange={(e) => setBorrador({ ...borrador, telefono: e.target.value })}
              placeholder="+52 ..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">
              Días que guardas el material tras el evento (opcional)
            </span>
            <input
              className={`mt-1 ${CAMPO}`}
              value={borrador.diasConservacion}
              disabled={!puedeEditar || falloLectura}
              onChange={(e) =>
                setBorrador({
                  ...borrador,
                  // Se recorta aqui al mismo rango que exige la base
                  // (tl_conservacion_razonable): asi el salon no llega a ver un
                  // error de Postgres por teclear un numero absurdo.
                  diasConservacion: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
              placeholder="90"
              inputMode="numeric"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Si lo pones, tu aviso dirá que te comprometes a cerrar el evento y borrar el material
              en ese plazo. El sistema no borra nada solo.
            </span>
          </label>
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="font-semibold">Así lo leen tus invitados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Es el primer apartado de tu aviso de privacidad, tal cual, mientras escribes.
        </p>
        <div className="mt-4 rounded-[var(--radius)] border border-border bg-muted/40 p-4">
          <h3 className="text-sm font-medium">{vistaPrevia.titulo}</h3>
          <div className="mt-2 space-y-2">
            {vistaPrevia.parrafos.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="font-semibold">Publicar</h2>
        {pendientes.length > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Para publicar te falta {pendientes.join(", ")}. Mientras tanto, tus invitados leen un
            aviso que dice a quién acudir pero no lleva tus datos.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Ya tienes lo que la ley pide. Al publicar, tu aviso pasa a nombrarte como responsable.
          </p>
        )}

        {!REVISADO_POR_ABOGADO ? (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acepta}
              disabled={!puedeEditar}
              onChange={(e) => setAcepta(e.target.checked)}
            />
            <span className="text-muted-foreground">
              Entiendo que estos textos son un borrador que todavía no ha revisado un abogado, y los
              publico bajo mi responsabilidad.
            </span>
          </label>
        ) : null}

        {puedeEditar ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={guardar} disabled={guardando || falloLectura} variant="outline">
              {guardando ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Guardar
            </Button>
            {publicado ? (
              <Button
                onClick={() => cambiarPublicacion(false)}
                disabled={guardando}
                variant="outline"
              >
                Retirar la publicación
              </Button>
            ) : (
              <Button
                onClick={() => cambiarPublicacion(true)}
                disabled={guardando || !completo || !acepta || falloLectura}
              >
                {guardando ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Publicar
              </Button>
            )}
            {publicado ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="size-4" /> Publicado
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Solo el dueño o un administrador del salón pueden cambiar esto.
          </p>
        )}

        {aviso ? <p className="mt-4 text-sm text-muted-foreground">{aviso}</p> : null}
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="font-semibold">Dónde lo leen tus invitados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          En las apps de cada evento sale solo, en el pie: ese enlace lleva el código del evento, y
          por eso enseña TUS datos. No hace falta que hagas nada.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          La dirección de abajo es la general. Ojo: abierta así, sin evento, enseña el documento de
          muestra —el que dice &quot;tu salón anfitrión&quot;—, así que no sirve para pegarla en tu
          página como si fuera tu aviso.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-[var(--radius)] bg-muted px-3 py-2 text-xs">
            {SITIO_LEGAL}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(SITIO_LEGAL).then(
                () => {
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                },
                () => setError("No se pudo copiar. Selecciónalo a mano."),
              );
            }}
          >
            {copiado ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
