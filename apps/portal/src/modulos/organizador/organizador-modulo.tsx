"use client";

/**
 * EL PORTAL DEL ORGANIZADOR — la casa de los novios (sección 13 del mapa).
 *
 * Se abre SOLO con el enlace privado que entrega el salón
 * (`/organizador?e=CODIGO&a=LLAVE`): sin llave se enseña la puerta, no los
 * datos. La llave queda recordada en este navegador al aterrizar
 * (`claveAnfitrion` la lee de la URL), así que la moderación del álbum y el
 * muro del portal se enciende sola para este dispositivo.
 *
 * Lo que la pantalla PINTA se lee con el código (igual que los tableros de
 * anfitrión de siempre); lo que la llave PUEDE (borrar, cerrar, moderar) lo
 * hace valer el servidor (0009/0016): una llave inventada pinta números pero
 * no toca nada.
 */
import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  Camera,
  Download,
  KeyRound,
  ListMusic,
  Loader2,
  MessageSquareHeart,
  Users,
} from "lucide-react";
import { Button, Card, EmptyState, aCSV, descargarCSV } from "@salones/ui";
import { claveAnfitrion } from "@salones/sync";
import { tiempoRelativo } from "@/modulos/muro/lib";
import {
  EstadoRSVP,
  RESUMEN_ORGANIZADOR_VACIO,
  herramientasDelOrganizador,
  medirParaOrganizador,
  type ResumenOrganizador,
} from "@/lib/organizador";

export function OrganizadorModulo({
  evento,
  nombreEvento,
}: {
  evento: string;
  nombreEvento: string;
}) {
  /** La llave del enlace (o la ya recordada). `null` tras montar = sin llave. */
  const [llave, setLlave] = React.useState<string | null | "leyendo">("leyendo");
  const [resumen, setResumen] = React.useState<ResumenOrganizador | null>(null);

  // La llave se lee tras montar (viene de la URL o del almacén del navegador;
  // el servidor no los tiene). Leerla además la RECUERDA para todo el portal.
  React.useEffect(() => {
    setLlave(claveAnfitrion(evento));
  }, [evento]);

  React.useEffect(() => {
    if (typeof llave !== "string") return;
    let vivo = true;
    medirParaOrganizador(evento).then((r) => {
      if (vivo) setResumen(r);
    });
    return () => {
      vivo = false;
    };
  }, [evento, llave]);

  if (llave === "leyendo") return null;

  // Sin llave: la puerta, sin pistas. El enlace privado lo entrega el salón.
  if (!llave) {
    return (
      <EmptyState
        icon={<KeyRound className="size-8" />}
        title="Este es el portal de quien organiza"
        description="Ábrelo desde el enlace privado que te entregó tu salón (el que trae tu llave). Si no lo tienes a la mano, pídeselo a ellos: es tuyo."
      />
    );
  }

  const r = resumen ?? RESUMEN_ORGANIZADOR_VACIO;

  const exportar = () => {
    const csv = aCSV(r.respuestas, [
      { titulo: "Invitado", valor: (x) => x.nombre || "Invitado de la lista" },
      {
        titulo: "Respuesta",
        valor: (x) => (x.estado === EstadoRSVP.Confirmado ? "Sí viene" : "No podrá"),
      },
      { titulo: "Personas", valor: (x) => x.personas },
    ]);
    descargarCSV(`confirmaciones-${nombreEvento}`, csv);
  };

  return (
    <div className="space-y-10">
      {/* Cómo va la fiesta */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: r.confirmados, l: "Confirmaron" },
            { n: r.personas, l: "Personas" },
            { n: r.fotos, l: "Fotos y videos" },
            { n: r.mensajes, l: "Mensajes" },
          ].map((t) => (
            <Card key={t.l} className="p-4 text-center">
              <div className="text-3xl font-semibold text-primary tabular-nums">
                {resumen === null ? <Loader2 className="mx-auto size-6 animate-spin" /> : t.n}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{t.l}</div>
            </Card>
          ))}
        </div>
        {r.canciones > 0 || r.jugadores > 0 ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ListMusic className="size-4 text-primary" /> {r.canciones}{" "}
              {r.canciones === 1 ? "canción pedida" : "canciones pedidas"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4 text-primary" /> {r.jugadores}{" "}
              {r.jugadores === 1 ? "jugador en la trivia" : "jugadores en la trivia"}
            </span>
          </p>
        ) : null}
      </section>

      {/* Confirmaciones */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-semibold">
            <CalendarCheck className="size-5 text-primary" /> Confirmaciones
          </h2>
          {r.respuestas.length > 0 ? (
            <Button size="sm" variant="outline" onClick={exportar}>
              <Download className="size-4" /> Bajar para el banquete
            </Button>
          ) : null}
        </div>

        {resumen === null ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Viendo cómo va…
          </p>
        ) : r.respuestas.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Todavía no llega ninguna respuesta. En cuanto tus invitados confirmen, aquí las verás
            llegar.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-[var(--radius)] border border-border">
            {r.respuestas.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {x.nombre || "Invitado de la lista"}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-sm">
                  <span
                    className={
                      x.estado === EstadoRSVP.Confirmado
                        ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                        : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {x.estado === EstadoRSVP.Confirmado
                      ? `Sí · ${x.personas} ${x.personas === 1 ? "persona" : "personas"}`
                      : "No podrá"}
                  </span>
                  {x.fecha ? (
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {tiempoRelativo(x.fecha)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Las herramientas del organizador */}
      <section>
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl font-semibold">
          <Camera className="size-5 text-primary" /> Tus herramientas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Con tu llave ya activa en este navegador: en el álbum y el muro puedes quitar lo que
          sobre.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {herramientasDelOrganizador(evento, llave).map((h) =>
            h.externa ? (
              <a
                key={h.nombre}
                href={h.href}
                className="group flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-4 transition hover:border-ring hover:shadow-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-medium">
                    {h.nombre}
                    <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-foreground" />
                  </span>
                  <span className="block text-sm text-muted-foreground">{h.descripcion}</span>
                </span>
              </a>
            ) : (
              <Link
                key={h.nombre}
                href={h.href}
                className="group flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-4 transition hover:border-ring hover:shadow-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{h.nombre}</span>
                  <span className="block text-sm text-muted-foreground">{h.descripcion}</span>
                </span>
              </Link>
            ),
          )}
        </div>
      </section>

      {/* Los mensajes recientes, de probadita */}
      {r.mensajes > 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquareHeart className="size-4 text-primary" />
          Hay {r.mensajes} {r.mensajes === 1 ? "mensaje" : "mensajes"} esperándote en el muro.
        </p>
      ) : null}

      <div className="rounded-[var(--radius)] border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <p>
          <strong className="font-medium text-foreground">Tu enlace es privado:</strong> quien lo
          tenga puede quitar fotos y mensajes. No lo compartas con los invitados — a ellos dales
          el enlace normal del evento.
        </p>
        <p className="mt-1.5">
          La marca, la invitación y las experiencias contratadas se ajustan con tu salón: un
          mensaje y ellos lo dejan como quieres.
        </p>
      </div>
    </div>
  );
}
