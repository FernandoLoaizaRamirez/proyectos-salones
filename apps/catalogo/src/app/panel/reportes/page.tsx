"use client";

/**
 * LOS REPORTES DEL SALÓN (Etapa 3, pieza 2) — los números que ya tenías,
 * por fin juntos.
 *
 * Una fila por evento con lo que ya vive en la base: confirmaciones y
 * personas (lo del banquete), fotos, mensajes y canciones (lo del recuerdo),
 * y la actividad de la 0031 (cuántas veces se abrió el portal y la
 * invitación, cuántos pases se vieron — CONTADORES, jamás quién). Arriba, el
 * total del salón; abajo, el botón a Excel con la receta de la casa (aCSV:
 * separador ;, BOM, escapado — sin eso "José" sale roto y todo cae en una
 * columna).
 *
 * Los contadores de contenido se miden con el código del evento contra el
 * lugar central (medirEvento, igual que el puesto de mando); la ficha y la
 * actividad, con la sesión del staff (la RLS acota por salón).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Download, Loader2 } from "lucide-react";
import { Button, Card, aCSV, descargarCSV } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";
import {
  RESUMEN_VACIO,
  listarEventos,
  medirEvento,
  type EventoFila,
  type ResumenEvento,
} from "@/lib/eventos";

/** La actividad de un evento, ya sumada entre días. */
type Actividad = { portal: number; invitacion: number; rsvp: number; pase: number };
const ACTIVIDAD_CERO: Actividad = { portal: 0, invitacion: 0, rsvp: 0, pase: 0 };

type FilaReporte = { evento: EventoFila; resumen: ResumenEvento; actividad: Actividad };

export default function Reportes() {
  const router = useRouter();
  const [cargando, setCargando] = React.useState(true);
  const [midiendo, setMidiendo] = React.useState(false);
  const [filas, setFilas] = React.useState<FilaReporte[]>([]);

  React.useEffect(() => {
    const supabase = obtenerSupabase();
    if (!supabase) {
      router.replace("/entrar");
      return;
    }
    let vivo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/entrar");
        return;
      }
      const eventos = await listarEventos(supabase);
      if (!vivo) return;
      // Primero la lista (sale rápido), luego los números de cada evento.
      setFilas(
        eventos.map((evento) => ({ evento, resumen: RESUMEN_VACIO, actividad: ACTIVIDAD_CERO })),
      );
      setCargando(false);
      setMidiendo(true);

      /*
       * La actividad del salón, POR PÁGINAS hasta agotarla. PostgREST corta en
       * 1000 filas SIN error, y esta tabla crece una fila por evento × tipo ×
       * día: una sola consulta habría subcontado en silencio en cuanto un
       * salón pasara de 1000 filas — el reporte presumiendo menos de lo real,
       * la clase de fallo silencioso-en-verde que la casa ya pagó una vez.
       * El orden por la llave completa hace las páginas estables.
       */
      type FilaAct = { evento: string; tipo: string; contador: number };
      const TAMANO_PAGINA = 1000;
      const act: FilaAct[] = [];
      for (let desde = 0; ; desde += TAMANO_PAGINA) {
        const { data: pagina } = await supabase
          .from("actividad")
          .select("evento,tipo,contador")
          .order("evento")
          .order("tipo")
          .order("dia")
          .range(desde, desde + TAMANO_PAGINA - 1);
        if (!pagina?.length) break;
        act.push(...(pagina as FilaAct[]));
        if (pagina.length < TAMANO_PAGINA) break;
      }
      const porEvento = new Map<string, Actividad>();
      for (const fila of act) {
        const suma = porEvento.get(fila.evento) ?? { ...ACTIVIDAD_CERO };
        if (fila.tipo in suma) suma[fila.tipo as keyof Actividad] += fila.contador;
        porEvento.set(fila.evento, suma);
      }

      // Los contadores de contenido, evento por evento (colecciones chicas).
      const resumenes = await Promise.all(eventos.map((e) => medirEvento(e.codigo)));
      if (!vivo) return;
      setFilas(
        eventos.map((evento, i) => ({
          evento,
          resumen: resumenes[i] ?? RESUMEN_VACIO,
          actividad: porEvento.get(evento.codigo) ?? ACTIVIDAD_CERO,
        })),
      );
      setMidiendo(false);
    });
    return () => {
      vivo = false;
    };
  }, [router]);

  const total = React.useMemo(
    () =>
      filas.reduce(
        (t, f) => ({
          confirmados: t.confirmados + f.resumen.confirmados,
          personas: t.personas + f.resumen.personas,
          fotos: t.fotos + f.resumen.fotos,
          mensajes: t.mensajes + f.resumen.mensajes,
          canciones: t.canciones + f.resumen.canciones,
          portal: t.portal + f.actividad.portal,
          invitacion: t.invitacion + f.actividad.invitacion,
          rsvp: t.rsvp + f.actividad.rsvp,
          pase: t.pase + f.actividad.pase,
        }),
        { confirmados: 0, personas: 0, fotos: 0, mensajes: 0, canciones: 0, portal: 0, invitacion: 0, rsvp: 0, pase: 0 },
      ),
    [filas],
  );

  const exportar = () => {
    const csv = aCSV(filas, [
      { titulo: "Evento", valor: (f) => f.evento.nombre },
      { titulo: "Código", valor: (f) => f.evento.codigo },
      { titulo: "Fecha", valor: (f) => f.evento.fecha ?? "" },
      { titulo: "Estado", valor: (f) => f.evento.estado },
      { titulo: "Confirmaron", valor: (f) => f.resumen.confirmados },
      { titulo: "Personas", valor: (f) => f.resumen.personas },
      { titulo: "Fotos y videos", valor: (f) => f.resumen.fotos },
      { titulo: "Mensajes", valor: (f) => f.resumen.mensajes },
      { titulo: "Canciones", valor: (f) => f.resumen.canciones },
      { titulo: "Aperturas del portal", valor: (f) => f.actividad.portal },
      { titulo: "Aperturas de la invitación", valor: (f) => f.actividad.invitacion },
      // Cuenta ENVÍOS (una corrección también cuenta): por eso no se llama
      // "confirmaron" — ese número sale de las respuestas reales.
      { titulo: "Respuestas enviadas", valor: (f) => f.actividad.rsvp },
      { titulo: "Pases vistos", valor: (f) => f.actividad.pase },
    ]);
    descargarCSV("reporte-del-salon", csv);
  };

  if (cargando) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Panel
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
            <BarChart3 className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">Reportes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos tus eventos, con sus números juntos. La actividad cuenta cuántas veces, nunca
              quién.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportar} disabled={filas.length === 0 || midiendo}>
          <Download className="size-4" /> Exportar a Excel
        </Button>
      </div>

      {/* El total del salón */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { n: total.personas, l: "Personas confirmadas" },
          { n: total.fotos, l: "Fotos y videos" },
          { n: total.mensajes, l: "Mensajes" },
          { n: total.portal, l: "Aperturas del portal" },
        ].map((t) => (
          <Card key={t.l} className="p-5">
            <div className="text-3xl font-semibold text-primary tabular-nums">{t.n}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.l}</div>
          </Card>
        ))}
      </div>

      {filas.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Aún no hay eventos que reportar. Crea el primero desde el generador.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-3 py-3 font-medium">Fecha</th>
                <th className="px-3 py-3 text-right font-medium">Confirmaron</th>
                <th className="px-3 py-3 text-right font-medium">Personas</th>
                <th className="px-3 py-3 text-right font-medium">Fotos</th>
                <th className="px-3 py-3 text-right font-medium">Mensajes</th>
                <th className="px-3 py-3 text-right font-medium">Canciones</th>
                <th className="px-3 py-3 text-right font-medium">Portal</th>
                <th className="px-3 py-3 text-right font-medium">Invitación</th>
                <th className="px-3 py-3 text-right font-medium">Respuestas</th>
                <th className="px-3 py-3 text-right font-medium">Pases</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.evento.id} className="border-b border-border last:border-0">
                  <td className="max-w-[220px] px-4 py-2.5">
                    <Link
                      href={`/eventos/${encodeURIComponent(f.evento.codigo)}`}
                      className="block truncate font-medium transition-colors hover:text-primary"
                    >
                      {f.evento.nombre}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {f.evento.fecha ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.resumen.confirmados}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.resumen.personas}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.resumen.fotos}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.resumen.mensajes}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.resumen.canciones}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.actividad.portal}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.actividad.invitacion}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.actividad.rsvp}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.actividad.pase}</td>
                </tr>
              ))}
              <tr className="bg-muted/40 font-medium">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right tabular-nums">{total.confirmados}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{total.personas}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{total.fotos}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{total.mensajes}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{total.canciones}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{total.portal}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{total.invitacion}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{total.rsvp}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{total.pase}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {midiendo ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Midiendo el contenido de cada evento…
        </p>
      ) : null}

      <p className="mt-4 text-xs text-muted-foreground">
        Las aperturas se cuentan desde hoy que existe el registro (los eventos anteriores empiezan
        en cero). El conteo es por vez, no por persona: nadie queda identificado. "Respuestas"
        cuenta envíos del formulario (una corrección también cuenta); "Confirmaron" sale de las
        respuestas reales.
      </p>
    </main>
  );
}
