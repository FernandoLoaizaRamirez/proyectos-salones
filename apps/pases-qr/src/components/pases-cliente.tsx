"use client";

import * as React from "react";
import { Plus, Check, X, Trash2, Download, MessageCircle } from "lucide-react";
import { Button, Card, cn } from "@salones/ui";
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

type Resultado = { estado: "ok" | "repetido" | "invalido"; texto: string } | null;
type Tab = "invitados" | "pases" | "checkin";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export function PasesCliente() {
  const [tab, setTab] = React.useState<Tab>("invitados");
  const [invitados, setInvitados] = React.useState<Invitado[]>([]);
  const [ingresados, setIngresados] = React.useState<Record<string, boolean>>({});
  const [cargado, setCargado] = React.useState(false);

  // Formulario de alta / edición
  const [form, setForm] = React.useState<{ nombre: string; mesa: string; personas: string; tipo: Tipo }>(
    { nombre: "", mesa: "", personas: "2", tipo: "General" },
  );
  const [editId, setEditId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState("");

  const [paseVer, setPaseVer] = React.useState<Invitado | null>(null);
  const [resultado, setResultado] = React.useState<Resultado>(null);

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
    if (cargado) localStorage.setItem(LISTA, JSON.stringify(invitados));
  }, [invitados, cargado]);
  React.useEffect(() => {
    ingresadosRef.current = ingresados;
    if (cargado) localStorage.setItem(INGRESOS, JSON.stringify(ingresados));
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
  const importar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        if (Array.isArray(data)) setInvitados(data);
      } catch {
        /* archivo inválido */
      }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const compartir = (inv: Invitado) => {
    const url = `${window.location.origin}/pase#${codificarPase(inv)}`;
    const msg = `¡Hola! Aquí está tu pase para ${evento.nombre} (${evento.fecha}). Ábrelo y muéstralo en la entrada:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  // --- Check-in ---
  const marcar = (id: string, val: boolean) => setIngresados((s) => ({ ...s, [id]: val }));

  const registrar = React.useCallback((inv: Invitado) => {
    if (ingresadosRef.current[inv.id]) {
      setResultado({ estado: "repetido", texto: `${inv.nombre} ya había ingresado.` });
    } else {
      setIngresados((s) => ({ ...s, [inv.id]: true }));
      setResultado({
        estado: "ok",
        texto: `¡Bienvenidos! ${inv.nombre} · Mesa ${inv.mesa} · ${inv.personas} pers.`,
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
        setResultado({ estado: "invalido", texto: "Pase no válido o no reconocido." });
        return;
      }
      registrar(inv);
    },
    [registrar],
  );

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
              className={cn(
                "mt-4 flex items-center gap-2 rounded-[var(--radius)] border p-4 text-sm font-medium",
                resultado.estado === "ok"
                  ? "border-green-500/40 bg-green-500/10 text-green-600"
                  : resultado.estado === "repetido"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                    : "border-red-500/40 bg-red-500/10 text-red-600",
              )}
            >
              {resultado.estado === "invalido" ? (
                <X className="size-4 shrink-0" />
              ) : (
                <Check className="size-4 shrink-0" />
              )}
              {resultado.texto}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
            <div className="text-sm">
              <span className="font-semibold">{nIngresados}</span> de {invitados.length} pases ·{" "}
              <span className="font-semibold">{personasDentro}</span> de {totalPersonas} personas
              dentro
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIngresados({})}>
              Reiniciar
            </Button>
          </div>

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
