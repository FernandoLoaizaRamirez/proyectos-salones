"use client";

/**
 * MÓDULO "MI MESA" montado DENTRO del portal (sexto módulo).
 *
 * El invitado encuentra su mesa sin preguntar en la entrada: si este teléfono
 * ya tiene perfil (llegó con su enlace personal, o se presentó en cualquier
 * otro módulo), su mesa aparece sola y por su nombre; si no, la busca. Los
 * datos los ESCRIBE la app del organizador (apps/mesas) en las colecciones
 * `mesas` y `acomodo` del evento; aquí solo se LEEN con el molde compartido de
 * `@salones/core`, que filtra cualquier fila colada — un invitado con el enlace
 * puede dar de alta filas en cualquier colección (migración 0016), así que
 * nada de lo que llega se pinta sin normalizar.
 */
import * as React from "react";
import { Armchair, Search, Users } from "lucide-react";
import { Card, EmptyState, cn } from "@salones/ui";
import { obtenerSync, esVitrina } from "@salones/sync";
import { usePerfil } from "@/lib/perfil";
import {
  COLECCION_ACOMODO,
  COLECCION_MESAS,
  SEMILLA_ACOMODO,
  SEMILLA_MESAS,
  asientosOcupados,
  buscarEnAcomodo,
  companerosDe,
  lugaresTexto,
  mesaDe,
  normalizarAcomodoCrudo,
  normalizarMesasCrudas,
  normalizarNombre,
  porOrdenAcomodo,
  type InvitadoMesa,
  type MesaEvento,
} from "./lib";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function MesasModulo({ evento }: { evento: string }) {
  const perfil = usePerfil(evento);
  const [mesas, setMesas] = React.useState<MesaEvento[]>([]);
  const [acomodo, setAcomodo] = React.useState<InvitadoMesa[]>([]);
  const [busqueda, setBusqueda] = React.useState("");
  /** A quién eligió ver en el buscador (guardamos el id, no la fila, para que
   * la tarjeta se refresque sola si el organizador lo cambia de mesa en vivo). */
  const [elegidoId, setElegidoId] = React.useState<string | null>(null);

  // Acomodo en vivo: mismo patrón de suscripción que el álbum y el muro, pero
  // con DOS colecciones (las mesas y quién va en cada una).
  React.useEffect(() => {
    const sync = obtenerSync();
    const cancelarMesas = sync.suscribir(evento, COLECCION_MESAS, (items) =>
      setMesas(normalizarMesasCrudas(items).sort(porOrdenAcomodo)),
    );
    const cancelarAcomodo = sync.suscribir(evento, COLECCION_ACOMODO, (items) =>
      setAcomodo(normalizarAcomodoCrudo(items).sort(porOrdenAcomodo)),
    );
    return () => {
      cancelarMesas();
      cancelarAcomodo();
    };
  }, [evento]);

  // Mientras el evento de demostración esté vacío se enseña la semilla de
  // muestra (la misma boda que en apps/mesas). NUNCA se escribe al almacén; con
  // un acomodo real desaparece. Un evento real jamás la ve.
  const conSemilla = esVitrina(evento) && mesas.length === 0 && acomodo.length === 0;
  const mesasVista = conSemilla ? SEMILLA_MESAS : mesas;
  const acomodoVista = conSemilla ? SEMILLA_ACOMODO : acomodo;

  /**
   * El renglón del acomodo que corresponde al perfil de este teléfono. Con
   * varios parecidos gana el nombre igual-igual (sin acentos ni mayúsculas);
   * si no hay exacto, el primero que se le parezca.
   */
  const mio = React.useMemo(() => {
    if (!perfil?.nombre) return null;
    const parecidos = buscarEnAcomodo(perfil.nombre, acomodoVista);
    const exacto = parecidos.find(
      (i) => normalizarNombre(i.nombre) === normalizarNombre(perfil.nombre),
    );
    return exacto ?? parecidos[0] ?? null;
  }, [perfil, acomodoVista]);

  // Quién se muestra en la tarjeta grande: lo elegido en el buscador manda; sin
  // elección, el del perfil.
  const elegido = elegidoId ? (acomodoVista.find((i) => i.id === elegidoId) ?? null) : null;
  const protagonista = elegido ?? mio;
  const esMio = Boolean(protagonista && mio && protagonista.id === mio.id);

  const mesa = protagonista ? mesaDe(protagonista, mesasVista) : null;
  const companeros = protagonista && mesa ? companerosDe(protagonista, acomodoVista) : [];
  const resultados = React.useMemo(
    () => buscarEnAcomodo(busqueda, acomodoVista),
    [busqueda, acomodoVista],
  );

  // Evento real sin acomodo todavía: se dice claro y sin drama, no una pantalla
  // rota ni la boda de otros.
  if (mesasVista.length === 0 && acomodoVista.length === 0) {
    return (
      <EmptyState
        icon={<Armchair className="size-8" />}
        title="El acomodo de mesas se publicará pronto"
        description="Los organizadores siguen acomodando los lugares. Vuelve a asomarte más cerca de la fiesta."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* La tarjeta grande: tu mesa (o la de quien se buscó) */}
      {protagonista ? (
        <Card className="p-6 text-center sm:p-8">
          <p className="text-sm text-muted-foreground">
            {esMio ? `Tu mesa, ${protagonista.nombre}` : `La mesa de ${protagonista.nombre}`}
          </p>
          {mesa ? (
            <>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight">{mesa.nombre}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {esMio ? "Tu invitación cubre" : "Su invitación cubre"}{" "}
                {lugaresTexto(protagonista.asientos)}.
              </p>
              {companeros.length > 0 ? (
                <div className="mx-auto mt-5 max-w-md text-left">
                  <p className="flex items-center justify-center gap-1.5 text-sm font-medium">
                    <Users className="size-4 text-primary" />
                    {esMio ? "La compartes con" : "La comparte con"}
                  </p>
                  <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {companeros.map((c) => (
                      <li key={c.id} className="rounded-full bg-muted px-3 py-1 text-sm">
                        {c.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-muted-foreground">
              {esMio
                ? "Aún no tienes mesa asignada; los organizadores siguen acomodando los lugares."
                : "Aún no tiene mesa asignada."}
            </p>
          )}
        </Card>
      ) : null}

      {/* El buscador: siempre presente, por si el perfil no está en la lista o
          se quiere encontrar a alguien más. */}
      <Card className="p-6">
        <h3 className="font-semibold">
          {protagonista ? "¿Buscas a alguien más?" : "Encuentra tu mesa"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Escribe el nombre tal como aparece en la invitación.
        </p>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(campo, "pl-9")}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o familia"
            maxLength={60}
          />
        </div>
        {resultados.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {resultados.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setElegidoId(r.id);
                    setBusqueda("");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-border px-3 py-2 text-left text-sm transition-colors hover:border-ring hover:bg-muted"
                >
                  <span className="min-w-0 truncate font-medium">{r.nombre}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {mesaDe(r, mesasVista)?.nombre ?? "Sin mesa aún"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : busqueda.trim() ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No encontramos ese nombre. Prueba con el apellido o pregunta en la entrada.
          </p>
        ) : null}
      </Card>

      {/* El plano general: todas las mesas con su ocupación */}
      <section>
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Armchair className="size-5 text-primary" />
          Las mesas del evento
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {mesasVista.map((m) => {
            const ocupados = asientosOcupados(m.id, acomodoVista);
            const esLaSuya = protagonista?.mesaId === m.id;
            return (
              <Card key={m.id} className={cn("p-4", esLaSuya && "border-primary")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">{m.nombre}</span>
                  {esLaSuya ? (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {esMio ? "Tu mesa" : "Su mesa"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ocupados} de {m.capacidad} lugares ocupados
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {conSemilla ? (
        <p className="text-xs text-muted-foreground">
          Acomodo de muestra: así se verá cuando los organizadores publiquen el suyo.
        </p>
      ) : null}
    </div>
  );
}
