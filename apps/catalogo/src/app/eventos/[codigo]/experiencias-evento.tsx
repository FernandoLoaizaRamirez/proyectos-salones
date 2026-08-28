"use client";

/**
 * LAS EXPERIENCIAS DEL EVENTO, UNA POR UNA — el volante del motor (Etapa 2).
 *
 * El motor (`funciones-evento.ts`) llevaba semanas listo y probado sin que
 * ninguna pantalla lo usara. Esta tarjeta lo conecta: las 14 experiencias del
 * portal, agrupadas como las ve el invitado, cada una con su interruptor. Es
 * la pantalla de VENTA: "el plan Básico trae estas tres; mira lo que pasa si
 * te encendemos el photobooth" — delante del salón, sin tocar la base a mano.
 *
 * LO QUE SE PINTA ES LO QUE VE EL INVITADO, no lo que pedimos: el estado se
 * resuelve con el MISMO motor del portal (`resolveEntitlements`: plan del
 * salón + overrides del salón + overrides del evento, el evento gana). El plan
 * llega de la misma función pública que alimenta al portal (`evento-config`);
 * los overrides del evento se leen de la base directo, que responde al
 * instante tras cada cambio.
 *
 * Dos reglas heredadas del motor (a propósito, no limitaciones):
 *   · Una experiencia que viene DEL PLAN no se apaga desde aquí: apagar borra
 *     el override y el plan volvería a mandar. Se dice claro en pantalla.
 *   · Una CARACTERÍSTICA se apaga escribiendo `false` (la herencia hace que
 *     borrarla sea "volver al módulo", no apagarla) — ver `apagarCaracteristica`.
 *
 * Quién puede escribir lo decide la base (RLS de la 0008: dueño o admin);
 * aquí solo se traduce el rechazo a cristiano, igual que en el paquete.
 */
import * as React from "react";
import { Loader2, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";
import { Button, Card } from "@salones/ui";
import { resolveEntitlements, tieneCaracteristica, tieneFuncion, type Plan } from "@salones/core";
import { GRUPOS, MODULOS } from "@salones/directorio";
import { configEventoCruda } from "@salones/sync";
import { obtenerSupabase } from "@/lib/supabase";
import {
  EXPERIENCIAS,
  apagar,
  apagarCaracteristica,
  encender,
  leerOverrides,
  type Experiencia,
  type OverrideEvento,
} from "@/lib/funciones-evento";

/** El grupo del portal al que pertenece una experiencia ("Mi asistencia"…). */
function grupoDe(clave: string): string {
  const modulo = MODULOS.find((m) => m.clave === clave);
  return GRUPOS.find((g) => g.clave === modulo?.grupo)?.nombre ?? GRUPOS[0]!.nombre;
}

export function ExperienciasEvento({
  codigo,
  eventId,
  puedeCambiar,
}: {
  codigo: string;
  eventId: string;
  puedeCambiar: boolean;
}) {
  const [overrides, setOverrides] = React.useState<OverrideEvento[] | null>(null);
  /** El plan del salón y sus overrides, de la misma fuente que el portal. */
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [overridesTenant, setOverridesTenant] = React.useState<Record<string, boolean>>({});
  const [sinServidor, setSinServidor] = React.useState(false);
  /** Las claves que se están guardando (deshabilita SOLO esos botones). Es un
   *  Set y no un solo valor: dos guardados en vuelo no se pisan el spinner. */
  const [guardando, setGuardando] = React.useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = React.useState("");

  const releerOverrides = React.useCallback(async () => {
    const supabase = obtenerSupabase();
    if (!supabase) return;
    setOverrides(await leerOverrides(supabase, eventId));
  }, [eventId]);

  React.useEffect(() => {
    void releerOverrides();
    configEventoCruda(codigo).then((r) => {
      if (r.estado === "ok") {
        setPlan({ ...r.config.plan });
        setOverridesTenant(r.config.overridesTenant);
      } else {
        setSinServidor(true);
      }
    });
  }, [codigo, releerOverrides]);

  /*
   * El estado RESUELTO (lo que ve el invitado). Sin el plan a la mano (red
   * caída), se resuelve solo con los overrides del evento: la pantalla lo
   * avisa y los "del plan" salen como no incluidos — prudente, no roto.
   */
  const resueltos = React.useMemo(() => {
    const mapaEvento: Record<string, boolean> = {};
    for (const o of overrides ?? []) mapaEvento[o.feature_clave] = o.habilitado;
    return resolveEntitlements(
      plan ?? { id: "sin-plan", nombre: "", funciones: [] },
      overridesTenant,
      mapaEvento,
    );
  }, [overrides, plan, overridesTenant]);

  /*
   * Lo resuelto SIN la capa del evento: distingue "viene del plan" de
   * "encendida para este evento" aunque exista una fila redundante en true
   * (nace del atajo del Paquete, o de una clave que entró después al plan).
   * Sin esto, la fila redundante ofrecería un "Apagar" que borra la fila…
   * y el plan la vuelve a encender: un botón que promete y no cumple.
   */
  const resueltosSinEvento = React.useMemo(
    () =>
      resolveEntitlements(plan ?? { id: "sin-plan", nombre: "", funciones: [] }, overridesTenant, {}),
    [plan, overridesTenant],
  );

  const filaDe = (clave: string) => (overrides ?? []).find((o) => o.feature_clave === clave);

  /** Ejecuta un cambio, relee SIEMPRE, y traduce el fracaso a cristiano. */
  const cambiar = async (clave: string, accion: "encender" | "apagar" | "apagar-detalle") => {
    const supabase = obtenerSupabase();
    if (!supabase) return;
    setGuardando((previas) => new Set(previas).add(clave));
    setAviso("");
    const ok =
      accion === "encender"
        ? await encender(supabase, eventId, clave)
        : accion === "apagar"
          ? await apagar(supabase, eventId, clave)
          : await apagarCaracteristica(supabase, eventId, clave);
    await releerOverrides();
    // Cada guardado quita SOLO su clave: el primero en terminar no le apaga
    // el "Guardando…" al segundo.
    setGuardando((previas) => {
      const s = new Set(previas);
      s.delete(clave);
      return s;
    });
    if (!ok) {
      setAviso(
        puedeCambiar
          ? "No pudimos guardar el cambio. Revisa tu conexión y vuelve a intentarlo."
          : "Solo el dueño o un admin del salón pueden cambiar las experiencias.",
      );
    }
  };

  /*
   * La lista espera a las DOS fuentes: los overrides (un SELECT, llega rápido)
   * Y el plan (la Edge Function, llega después). Pintarse solo con la primera
   * enseñaba un instante "No incluida" en todo lo que venía del plan — delante
   * del cliente — y un clic en esa ventana escribía filas redundantes. Si la
   * config FALLA, `sinServidor` abre la lista en el modo degradado avisado.
   */
  const cargandoLista = overrides === null || (plan === null && !sinServidor);

  return (
    <Card className="mt-8 p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Las experiencias, una por una</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo que el invitado ve en el portal de ESTE evento. Enciende o apaga cada experiencia
            por separado — para vender un plan a la medida, o para encenderla delante del cliente.
          </p>

          {sinServidor ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
              Sin conexión con el servidor del portal: se muestra solo lo encendido para este
              evento; lo que venga del plan del salón no se alcanza a ver desde aquí.
            </p>
          ) : null}

          {cargandoLista ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Viendo cómo está…
            </p>
          ) : (
            GRUPOS.map((grupo) => {
              const delGrupo = EXPERIENCIAS.filter((x) => grupoDe(x.clave) === grupo.nombre);
              if (delGrupo.length === 0) return null;
              return (
                <section key={grupo.clave} className="mt-5">
                  <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {grupo.nombre}
                  </h3>
                  <ul className="mt-2 divide-y divide-border rounded-[var(--radius)] border border-border">
                    {delGrupo.map((x) => (
                      <FilaExperiencia
                        key={x.clave}
                        experiencia={x}
                        laVe={tieneFuncion(resueltos, x.clave)}
                        vieneDelPlan={tieneFuncion(resueltosSinEvento, x.clave)}
                        fila={filaDe(x.clave)}
                        filaDe={filaDe}
                        resueltos={resueltos}
                        guardando={guardando}
                        onCambiar={cambiar}
                      />
                    ))}
                  </ul>
                </section>
              );
            })
          )}

          {/* Rojo de Tailwind y no `text-destructive`: ese color no existe en
              el tema y la clase no pintaría nada (la lección del paquete). */}
          {aviso ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{aviso}</p> : null}

          <p className="mt-3 text-xs text-muted-foreground">
            El portal del invitado tarda hasta un minuto en reflejar los cambios.
          </p>
        </div>
      </div>
    </Card>
  );
}

function FilaExperiencia({
  experiencia,
  laVe,
  vieneDelPlan,
  fila,
  filaDe,
  resueltos,
  guardando,
  onCambiar,
}: {
  experiencia: Experiencia;
  laVe: boolean;
  /** ¿El plan del salón (sin la capa del evento) ya la enciende? */
  vieneDelPlan: boolean;
  fila: OverrideEvento | undefined;
  filaDe: (clave: string) => OverrideEvento | undefined;
  resueltos: Record<string, boolean>;
  guardando: ReadonlySet<string>;
  onCambiar: (clave: string, accion: "encender" | "apagar" | "apagar-detalle") => Promise<void>;
}) {
  const { clave, nombre, descripcion, caracteristicas } = experiencia;
  const ocupado = guardando.has(clave);

  /*
   * De dónde viene el encendido, en cristiano:
   *   · la ve Y el plan ya la trae → "del plan" (aquí no se apaga: apagar
   *     borra overrides y el plan volvería a mandar — incluso si existe una
   *     fila redundante en true, que nace del atajo del Paquete)
   *   · override true (y el plan no la trae) → "encendida para este evento"
   *   · override false → alguien la apagó a mano (encender la rescata)
   *   · nada → no incluida
   */
  const estado =
    laVe && vieneDelPlan
      ? "del-plan"
      : fila?.habilitado
        ? "propia"
        : fila
          ? "apagada-a-mano"
          : "no-incluida";

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            {laVe ? (
              <ToggleRight className="size-4 shrink-0 text-primary" />
            ) : (
              <ToggleLeft className="size-4 shrink-0 text-muted-foreground" />
            )}
            {nombre}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>
          {estado === "del-plan" ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Incluida en el plan del salón (se apaga desde el plan, no por evento).
            </p>
          ) : estado === "apagada-a-mano" ? (
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
              Apagada a mano para este evento.
            </p>
          ) : null}
        </div>

        {estado !== "del-plan" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={ocupado}
            onClick={() => void onCambiar(clave, laVe ? "apagar" : "encender")}
          >
            {ocupado ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Guardando…
              </>
            ) : laVe ? (
              "Apagar"
            ) : (
              "Encender"
            )}
          </Button>
        ) : null}
      </div>

      {/* Los detalles vendibles DENTRO de la experiencia (0027), solo si el
          invitado la ve: sin el módulo, la herencia ya los apaga solos. */}
      {laVe && caracteristicas.length > 0 ? (
        <ul className="mt-3 space-y-2 border-l-2 border-border pl-4">
          {caracteristicas.map((c) => {
            const filaFina = filaDe(c.clave);
            const finaOcupada = guardando.has(c.clave);
            /* La herencia la resuelve el GEMELO de core (`tieneCaracteristica`):
               la misma regla del candado del servidor (0027) — la fila fina de
               CUALQUIER capa (plan, salón o evento) manda; sin ninguna, hereda
               del módulo (que aquí ya sabemos encendido). Reimplementarla a
               mano ignoraba la capa del salón y la tarjeta mentía. */
            const laVeFina = tieneCaracteristica(resueltos, c.clave);
            return (
              <li key={c.clave} className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">
                    {c.nombre}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {laVeFina
                        ? filaFina?.habilitado
                          ? "· encendido aparte"
                          : "· va con la experiencia"
                        : "· apagado en este evento"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{c.descripcion}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={finaOcupada}
                  onClick={() =>
                    // Apagar el detalle = fila en false. Volver a incluirlo:
                    // con fila propia, borrarla (regresa a heredar); sin fila
                    // (la apagó la capa del SALÓN), encender en el evento —
                    // el evento gana, y borrar una fila inexistente no
                    // encendería nada.
                    void onCambiar(
                      c.clave,
                      laVeFina ? "apagar-detalle" : filaFina ? "apagar" : "encender",
                    )
                  }
                >
                  {finaOcupada ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : laVeFina ? (
                    "Apagar detalle"
                  ) : (
                    "Volver a incluirlo"
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
