"use client";

import * as React from "react";
import { Plus, Check, X, Trash2, Download, MessageCircle } from "lucide-react";
import { Button, Card, cn, Confirmar, guardarLocal } from "@salones/ui";
import {
  invitadosIniciales,
  evento,
  idDesdeQR,
  nuevoId,
  codificarPase,
  type Invitado,
  type Tipo,
} from "@/lib/evento";
import { PassTicket } from "./pass-ticket";
import { Escaner } from "./escaner";

const LISTA = "pases-sr-lista";
const INGRESOS = "pases-sr-ingresados";

/** Hora legible (ej. "5:22 p. m.") de una marca de tiempo. Vacío si no es válida. */
function horaDe(ts: unknown): string {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return "";
  return new Date(ts).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
}

type Aviso = {
  estado: "ok" | "repetido" | "invalido";
  titulo: string;
  detalle?: string;
  hora?: string;
} | null;
type Tab = "invitados" | "pases" | "checkin";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function PasesCliente() {
  const [tab, setTab] = React.useState<Tab>("invitados");
  const [invitados, setInvitados] = React.useState<Invitado[]>([]);
  const [ingresados, setIngresados] = React.useState<Record<string, number>>({});
  const [cargado, setCargado] = React.useState(false);

  // Formulario de alta / edición
  const [form, setForm] = React.useState<{ nombre: string; mesa: string; personas: string; tipo: Tipo }>(
    { nombre: "", mesa: "", personas: "2", tipo: "General" },
  );
  const [editId, setEditId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState("");

  const [paseVer, setPaseVer] = React.useState<Invitado | null>(null);
  const [resultado, setResultado] = React.useState<Aviso>(null);
  const [confirmarReinicio, setConfirmarReinicio] = React.useState(false);
  const [importPendiente, setImportPendiente] = React.useState<Invitado[] | null>(null);
  const [errorImportar, setErrorImportar] = React.useState("");

  const invitadosRef = React.useRef(invitados);
  const ingresadosRef = React.useRef(ingresados);
  const ultimo = React.useRef<{ id: string; t: number } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  // Carga inicial
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LISTA);
      setInvitados(raw ? JSON.parse(raw) : invitadosIniciales);
      const ing = localStorage.getItem(INGRESOS);
      if (ing) setIngresados(JSON.parse(ing));
    } catch {
      setInvitados(invitadosIniciales);
    }
    setCargado(true);
  }, []);
  React.useEffect(() => {
    invitadosRef.current = invitados;
    if (cargado) guardarLocal(LISTA, JSON.stringify(invitados));
  }, [invitados, cargado]);
  React.useEffect(() => {
    ingresadosRef.current = ingresados;
    if (cargado) guardarLocal(INGRESOS, JSON.stringify(ingresados));
  }, [ingresados, cargado]);

  const totalPersonas = invitados.reduce((s, i) => s + i.personas, 0);
  const nIngresados = invitados.filter((i) => ingresados[i.id]).length;
  const personasDentro = invitados
    .filter((i) => ingresados[i.id])
    .reduce((s, i) => s + i.personas, 0);

  // --- Organizador: alta / edición / borrado ---
  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setFormError("Escribe el nombre del invitado.");
      return;
    }
    setFormError("");
    const personas = Math.max(1, parseInt(form.personas, 10) || 1);
    const mesa = form.mesa.trim() || "—";
    if (editId) {
      setInvitados((l) =>
        l.map((i) =>
          i.id === editId ? { ...i, nombre: form.nombre.trim(), mesa, personas, tipo: form.tipo } : i,
        ),
      );
    } else {
      setInvitados((l) => [
        { id: nuevoId(l), nombre: form.nombre.trim(), mesa, personas, tipo: form.tipo },
        ...l,
      ]);
    }
    setForm({ nombre: "", mesa: "", personas: "2", tipo: "General" });
    setEditId(null);
  };

  const editar = (inv: Invitado) => {
    setEditId(inv.id);
    setForm({ nombre: inv.nombre, mesa: inv.mesa, personas: String(inv.personas), tipo: inv.tipo });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const cancelarEdicion = () => {
    setEditId(null);
    setForm({ nombre: "", mesa: "", personas: "2", tipo: "General" });
    setFormError("");
  };
  const eliminar = (id: string) => {
    setInvitados((l) => l.filter((i) => i.id !== id));
    setIngresados((s) => {
      const n = { ...s };
      delete n[id];
      return n;
    });
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify(invitados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitados.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  /**
   * ¿Esto que viene del archivo tiene pinta de una lista de invitados?
   *
   * Antes se metía tal cual lo que trajera el JSON: un archivo equivocado
   * sustituía la lista de la puerta por basura, el día del evento, sin deshacer.
   */
  const esListaDeInvitados = (data: unknown): data is Invitado[] =>
    Array.isArray(data) &&
    data.length > 0 &&
    data.every(
      (x) =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as Invitado).id === "string" &&
        typeof (x as Invitado).nombre === "string",
    );

  const importar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let data: unknown;
      try {
        data = JSON.parse(String(r.result));
      } catch {
        setErrorImportar("Ese archivo no se puede leer. ¿Es el .json que exportaste desde aquí?");
        return;
      }
      if (!esListaDeInvitados(data)) {
        setErrorImportar("Ese archivo no contiene una lista de invitados válida.");
        return;
      }
      setErrorImportar("");
      // Si ya hay lista, no se pisa sin preguntar: se queda esperando.
      if (invitados.length > 0) setImportPendiente(data);
      else setInvitados(data);
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const aplicarImportacion = () => {
    if (importPendiente) setInvitados(importPendiente);
    setImportPendiente(null);
  };

  const compartir = (inv: Invitado) => {
    const url = `${window.location.origin}/pase#${codificarPase(inv)}`;
    const msg = `¡Hola! Aquí está tu pase para ${evento.nombre} (${evento.fecha}). Ábrelo y muéstralo en la entrada:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  // --- Check-in ---
  const marcar = (id: string, val: boolean) =>
    setIngresados((s) => {
      const n = { ...s };
      if (val) n[id] = Date.now();
      else delete n[id];
      return n;
    });

  const registrar = React.useCallback((inv: Invitado) => {
    const yaTs = ingresadosRef.current[inv.id];
    if (yaTs) {
      setResultado({
        estado: "repetido",
        titulo: inv.nombre,
        detalle: `Ya había ingresado · Mesa ${inv.mesa} · ${inv.personas} pers`,
        hora: horaDe(yaTs),
      });
    } else {
      const ts = Date.now();
      setIngresados((s) => ({ ...s, [inv.id]: ts }));
      setResultado({
        estado: "ok",
        titulo: inv.nombre,
        detalle: `¡Puede ingresar! · Mesa ${inv.mesa} · ${inv.personas} pers`,
        hora: horaDe(ts),
      });
    }
  }, []);

  const onDetectar = React.useCallback(
    (texto: string) => {
      const id = idDesdeQR(texto);
      const now = Date.now();
      if (id && ultimo.current && ultimo.current.id === id && now - ultimo.current.t < 2500) return;
      if (id) ultimo.current = { id, t: now };
      const inv = id ? invitadosRef.current.find((i) => i.id === id) : undefined;
      if (!inv) {
        setResultado({
          estado: "invalido",
          titulo: "Pase no válido",
          detalle: "No se reconoció este código.",
        });
        return;
      }
      registrar(inv);
    },
    [registrar],
  );

  // El aviso grande se oculta solo después de unos segundos; la hora queda
  // registrada en la lista de abajo como comprobante permanente.
  React.useEffect(() => {
    if (!resultado) return;
    const t = window.setTimeout(() => setResultado(null), 6000);
    return () => window.clearTimeout(t);
  }, [resultado]);

  return (
    <div>
      {/* Pestañas */}
      <div className="mb-8 inline-flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
        {(
          [
            ["invitados", "Invitados"],
            ["pases", "Pases"],
            ["checkin", "Entrada"],
          ] as const
        ).map(([clave, texto]) => (
          <button
            key={clave}
            onClick={() => setTab(clave)}
            aria-selected={tab === clave}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === clave
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {texto}
          </button>
        ))}
      </div>

      {/* ---------- INVITADOS (organizador) ---------- */}
      {tab === "invitados" ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
          <div ref={formRef}>
            <Card className="p-6">
            <h2 className="text-lg font-semibold">
              {editId ? "Editar invitado" : "Agregar invitado"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Al guardar se crea su pase con QR automáticamente.
            </p>
            <form onSubmit={guardar} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nombre</label>
                <input
                  className={campo}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre del invitado o familia"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Mesa</label>
                  <input
                    className={campo}
                    value={form.mesa}
                    onChange={(e) => setForm({ ...form, mesa: e.target.value })}
                    placeholder="Ej. 4"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Personas</label>
                  <select
                    className={campo}
                    value={form.personas}
                    onChange={(e) => setForm({ ...form, personas: e.target.value })}
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Tipo de acceso</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["General", "VIP"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: t })}
                      className={cn(
                        "rounded-[var(--radius)] border px-3 py-2 text-sm transition-colors",
                        form.tipo === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editId ? (
                    <>
                      <Check className="size-4" /> Guardar
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" /> Agregar
                    </>
                  )}
                </Button>
                {editId ? (
                  <Button type="button" variant="outline" onClick={cancelarEdicion}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>
            </Card>
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{invitados.length}</span> invitados ·{" "}
                <span className="font-semibold text-foreground">{totalPersonas}</span> personas
              </p>
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  onChange={importar}
                  className="hidden"
                />
                <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  Importar
                </Button>
                <Button variant="outline" size="sm" onClick={exportar}>
                  <Download className="size-4" /> Exportar
                </Button>
              </div>
            </div>

            {errorImportar ? (
              <p className="mb-4 rounded-[var(--radius)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {errorImportar}
              </p>
            ) : null}

            <Confirmar
              abierto={importPendiente !== null}
              titulo="¿Sustituir la lista de invitados?"
              descripcion={
                <>
                  El archivo trae <strong>{importPendiente?.length ?? 0}</strong> invitados y
                  sustituye por completo a los <strong>{invitados.length}</strong> que tienes
                  ahora. <strong>No hay deshacer.</strong> Si quieres conservar la lista actual,
                  cancela y usa <em>Exportar</em> primero.
                </>
              }
              textoConfirmar="Sí, sustituir la lista"
              onConfirmar={aplicarImportacion}
              onCancelar={() => setImportPendiente(null)}
            />

            <div className="space-y-2">
              {invitados.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Aún no hay invitados. Agrega el primero con el formulario.
                </Card>
              ) : (
                invitados.map((inv) => (
                  <Card key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{inv.nombre}</span>
                        {inv.tipo === "VIP" ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                            VIP
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Mesa {inv.mesa} · {inv.personas} pers · {inv.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setPaseVer(inv)}>
                        Ver pase
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => editar(inv)}>
                        Editar
                      </Button>
                      <button
                        onClick={() => eliminar(inv.id)}
                        aria-label={`Eliminar ${inv.nombre}`}
                        className="grid size-9 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- PASES ---------- */}
      {tab === "pases" ? (
        <div>
          <p className="text-sm text-muted-foreground">
            Así se ve el pase que recibe cada invitado. Toca uno para verlo en grande y enviarlo.
          </p>
          {invitados.length === 0 ? (
            <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
              Agrega invitados en la pestaña “Invitados” para generar sus pases.
            </Card>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {invitados.map((inv) => (
                <button key={inv.id} onClick={() => setPaseVer(inv)} className="text-left">
                  <PassTicket inv={inv} size="sm" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ---------- ENTRADA / CHECK-IN ---------- */}
      {tab === "checkin" ? (
        <div>
          <Escaner onDetectar={onDetectar} />

          {resultado ? (
            <div
              key={`${resultado.titulo}-${resultado.hora ?? ""}`}
              className={cn(
                "mt-4 flex items-center gap-4 rounded-[var(--radius)] border-2 p-5 shadow-lg",
                resultado.estado === "ok"
                  ? "border-green-500/60 bg-green-500/10"
                  : resultado.estado === "repetido"
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-red-500/60 bg-red-500/10",
              )}
            >
              <div
                className={cn(
                  "grid size-14 shrink-0 place-items-center rounded-full text-white",
                  resultado.estado === "ok"
                    ? "bg-green-500"
                    : resultado.estado === "repetido"
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
              >
                {resultado.estado === "invalido" ? (
                  <X className="size-8" />
                ) : (
                  <Check className="size-8" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xl font-bold leading-tight",
                    resultado.estado === "ok"
                      ? "text-green-700 dark:text-green-400"
                      : resultado.estado === "repetido"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-red-700 dark:text-red-400",
                  )}
                >
                  {resultado.titulo}
                </p>
                {resultado.detalle ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{resultado.detalle}</p>
                ) : null}
                {resultado.hora ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Escaneado a las {resultado.hora}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
            <div className="text-sm">
              <span className="font-semibold">{nIngresados}</span> de {invitados.length} pases ·{" "}
              <span className="font-semibold">{personasDentro}</span> de {totalPersonas} personas
              dentro
            </div>
            <Button variant="ghost" size="sm" onClick={() => setConfirmarReinicio(true)}>
              Reiniciar
            </Button>
          </div>

          <Confirmar
            abierto={confirmarReinicio}
            titulo="¿Borrar el registro de entrada?"
            descripcion={
              <>
                Se olvidan los <strong>{nIngresados}</strong> pases que ya entraron. La lista de
                invitados no se toca, pero el control de la puerta empieza de cero y{" "}
                <strong>no se puede recuperar</strong>: quien ya pasó podría volver a entrar sin
                que nadie lo note.
              </>
            }
            textoConfirmar="Sí, empezar de cero"
            onConfirmar={() => {
              setIngresados({});
              setConfirmarReinicio(false);
            }}
            onCancelar={() => setConfirmarReinicio(false)}
          />

          <div className="mt-4 space-y-2">
            {invitados.map((inv) => {
              const dentro = !!ingresados[inv.id];
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{inv.nombre}</span>
                      {inv.tipo === "VIP" ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          VIP
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Mesa {inv.mesa} · {inv.personas} pers · {inv.id}
                    </div>
                    {dentro ? (
                      <div className="mt-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        Ingresó{horaDe(ingresados[inv.id]) ? ` · ${horaDe(ingresados[inv.id])}` : ""}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant={dentro ? "primary" : "outline"}
                    size="sm"
                    onClick={() => marcar(inv.id, !dentro)}
                  >
                    {dentro ? (
                      <>
                        <Check className="size-4" /> Ingresó
                      </>
                    ) : (
                      "Marcar ingreso"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ---------- Modal: ver / enviar pase ---------- */}
      {paseVer ? (
        <div
          onClick={() => setPaseVer(null)}
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <PassTicket inv={paseVer} />
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => compartir(paseVer)}>
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </Button>
              <Button variant="outline" onClick={() => setPaseVer(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
