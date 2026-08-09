"use client";

import * as React from "react";
import {
  Search,
  Users,
  MapPin,
  ArrowLeft,
  Upload,
  Share2,
  X,
  Copy,
  Check,
  MessageCircle,
  QrCode,
  Settings2,
} from "lucide-react";
import { Button, Card, guardarLocal } from "@salones/ui";
import { QR } from "@/components/qr";
import {
  evento as eventoLocal,
  mesasIniciales,
  invitadosIniciales,
  invitadosDeMesa,
  normaliza,
  decodificarAcomodo,
  validarAcomodo,
  codificarAcomodo,
  type Acomodo,
  type Invitado,
} from "@/lib/mimesa";

const K_ACOMODO = "mimesa-acomodo";
const UMBRAL_QR = 1200;

function acomodoSemilla(): Acomodo {
  return {
    v: 1,
    evento: { nombre: eventoLocal.nombre, fecha: eventoLocal.fecha, lugar: eventoLocal.lugar },
    mesas: mesasIniciales,
    invitados: invitadosIniciales,
  };
}

export function MiMesaCliente() {
  const [acomodo, setAcomodo] = React.useState<Acomodo | null>(null);
  const [query, setQuery] = React.useState("");
  const [seleccion, setSeleccion] = React.useState<string | null>(null);
  const [orgAbierto, setOrgAbierto] = React.useState(false);
  const [compartir, setCompartir] = React.useState(false);
  const [urlCompartir, setUrlCompartir] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);
  const [aviso, setAviso] = React.useState("");
  const importRef = React.useRef<HTMLInputElement>(null);

  // Carga: primero el enlace (hash), luego lo guardado, luego la semilla.
  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const a = decodificarAcomodo(hash);
      if (a) {
        setAcomodo(a);
        return;
      }
    }
    try {
      const raw = localStorage.getItem(K_ACOMODO);
      setAcomodo(raw ? JSON.parse(raw) : acomodoSemilla());
    } catch {
      setAcomodo(acomodoSemilla());
    }
  }, []);

  const invitados = acomodo?.invitados ?? [];
  const mesas = acomodo?.mesas ?? [];

  const q = normaliza(query);
  const coincidencias =
    q.length >= 1
      ? invitados.filter((i) => normaliza(i.nombre).includes(q)).slice(0, 8)
      : [];

  const elegido: Invitado | null = seleccion
    ? invitados.find((i) => i.id === seleccion) ?? null
    : null;
  const mesaElegida = elegido?.mesaId ? mesas.find((m) => m.id === elegido.mesaId) : null;
  const companeros = mesaElegida
    ? invitadosDeMesa(mesaElegida.id, invitados).filter((i) => i.id !== elegido?.id)
    : [];

  const importar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const a = validarAcomodo(JSON.parse(String(reader.result)));
        if (!a) {
          setAviso("El archivo no tiene el formato de un acomodo de mesas.");
          return;
        }
        setAcomodo(a);
        // Si el navegador no deja guardar (modo privado, almacenamiento lleno) el
        // acomodo SÍ se carga: solo no sobrevive al cierre. Antes ese fallo caía
        // en el catch de abajo y decía "No se pudo leer el archivo", que es
        // mentira y manda a revisar el archivo equivocado.
        const guardado = guardarLocal(K_ACOMODO, JSON.stringify(a));
        setSeleccion(null);
        setQuery("");
        setAviso(
          guardado
            ? "Acomodo cargado. Ya puedes compartirlo con tus invitados."
            : "Acomodo cargado, pero este navegador no deja guardarlo: se perderá al cerrar la página.",
        );
      } catch {
        setAviso("No se pudo leer el archivo.");
      }
    };
    reader.readAsText(file);
  };

  const abrirCompartir = () => {
    if (!acomodo) return;
    setUrlCompartir(`${window.location.origin}/#${codificarAcomodo(acomodo)}`);
    setCompartir(true);
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlCompartir);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* noop */
    }
  };
  const compartirWhatsApp = () => {
    const msg = `¿En qué mesa te toca en ${acomodo?.evento.nombre}? Descúbrelo aquí:\n${urlCompartir}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  if (!acomodo) {
    return <p className="py-20 text-center text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="w-full max-w-lg">
      <div className="text-center">
        <p className="text-sm font-medium text-primary">¿En qué mesa me toca?</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{acomodo.evento.nombre}</h1>
        <p className="mt-1 text-muted-foreground">{acomodo.evento.fecha}</p>
      </div>

      {/* RESULTADO o BÚSQUEDA */}
      {elegido ? (
        <Card className="mt-8 p-6 text-center">
          <button
            onClick={() => setSeleccion(null)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Buscar otro nombre
          </button>
          <p className="text-sm text-muted-foreground">Hola, {elegido.nombre}</p>
          {mesaElegida ? (
            <>
              <div className="mx-auto mt-3 grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                <MapPin className="size-7" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Tu lugar es en</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-primary">
                {mesaElegida.nombre}
              </h2>
              <div className="mt-6 text-left">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Users className="size-4" /> Te acompañan en la mesa
                </div>
                {companeros.length === 0 ? (
                  <p className="rounded-[var(--radius)] border border-dashed border-border py-5 text-center text-sm text-muted-foreground">
                    Por ahora estás tú en esta mesa. ¡Pronto llegarán más!
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {companeros.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between rounded-[var(--radius)] bg-muted px-3 py-2 text-sm"
                      >
                        <span className="truncate">{c.nombre}</span>
                        {c.asientos > 1 ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {c.asientos} personas
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 px-4 py-5 text-sm text-amber-700 dark:text-amber-400">
              Aún no tienes una mesa asignada. Pregunta a los organizadores del evento.
            </div>
          )}
        </Card>
      ) : (
        <div className="mt-8">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              className="w-full rounded-[var(--radius)] border border-border bg-background py-4 pl-12 pr-4 text-lg outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe tu nombre…"
            />
          </div>

          <div className="mt-3 space-y-2">
            {query.length >= 1 && coincidencias.length === 0 ? (
              <p className="rounded-[var(--radius)] border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No encontramos ese nombre. Prueba con tu nombre o apellido tal como te registraron.
              </p>
            ) : (
              coincidencias.map((i) => {
                const mesa = i.mesaId ? mesas.find((m) => m.id === i.mesaId) : null;
                return (
                  <button
                    key={i.id}
                    onClick={() => setSeleccion(i.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-left transition-colors hover:border-ring hover:bg-muted"
                  >
                    <span className="min-w-0 truncate font-medium">{i.nombre}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {mesa ? mesa.nombre : "Sin mesa"}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {query.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {invitados.length} invitados en {mesas.length} mesas · escribe tu nombre para
              encontrar tu lugar.
            </p>
          ) : null}
        </div>
      )}

      {/* Sección del organizador */}
      <div className="mt-10 border-t border-border pt-4">
        <button
          onClick={() => setOrgAbierto((v) => !v)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="size-4" /> ¿Eres el organizador?
        </button>
        {orgAbierto ? (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              Carga el archivo del acomodo (el JSON que exportas desde “Acomodo de mesas”) y
              compártelo con tus invitados por enlace o QR.
            </p>
            {aviso ? (
              <div className="mt-3 rounded-[var(--radius)] border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
                {aviso}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                <Upload className="size-4" /> Cargar acomodo (JSON)
              </Button>
              <Button size="sm" onClick={abrirCompartir}>
                <Share2 className="size-4" /> Compartir con invitados
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={importar}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Modal de compartir */}
      {compartir ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
          onClick={() => setCompartir(false)}
        >
          <Card className="w-full max-w-md p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <QrCode className="size-5 text-primary" /> Comparte con tus invitados
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cada invitado escanea el código, escribe su nombre y ve su mesa.
                </p>
              </div>
              <button
                onClick={() => setCompartir(false)}
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
              {urlCompartir.length <= UMBRAL_QR ? (
                <QR value={urlCompartir} size={132} />
              ) : (
                <div className="grid size-[132px] shrink-0 place-items-center rounded-[var(--radius)] border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                  El acomodo es grande: compártelo por el enlace o WhatsApp (un QR quedaría difícil de
                  escanear).
                </div>
              )}
              <div className="w-full">
                <p className="mb-3 break-all rounded-[var(--radius)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {urlCompartir}
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
                  <Button onClick={compartirWhatsApp} className="w-full">
                    <MessageCircle className="size-4" /> Enviar por WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
