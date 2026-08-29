"use client";

/**
 * LOS CLIENTES DEL SALÓN (Etapa 3, pieza 1) — el CRM de mostrador.
 *
 * La ficha de quien contrata: nombre, teléfono (con WhatsApp a un toque, que
 * en México es EL canal), correo y notas — y debajo de cada ficha, sus
 * eventos. Hasta hoy esto vivía en el WhatsApp del salón; ahora vive donde
 * viven sus eventos.
 *
 * Quién ve y toca qué lo decide la base (RLS de la 0030: cualquier miembro
 * del salón — capturar clientes es trabajo de mostrador, no de admin).
 * Borrar una ficha NO borra sus eventos (la base los suelta con `set null`).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button, Card, Confirmar } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";
import { leerIdentidad } from "@/lib/sesion";
import {
  actualizarCliente,
  borrarCliente,
  crearCliente,
  enlaceWhatsApp,
  eventosPorCliente,
  listarClientes,
  type ClienteFila,
  type DatosCliente,
} from "@/lib/clientes";

const CAMPO =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm";

const VACIO: DatosCliente = { nombre: "", telefono: "", email: "", notas: "" };

/** El formulario de la ficha (sirve para alta y para corrección). */
function CamposCliente({
  datos,
  onChange,
}: {
  datos: DatosCliente;
  onChange: (d: DatosCliente) => void;
}) {
  const set = (k: keyof DatosCliente, v: string) => onChange({ ...datos, [k]: v });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input
        className={CAMPO}
        value={datos.nombre}
        onChange={(e) => set("nombre", e.target.value)}
        placeholder="Nombre (p. ej. Carmen Medina y Luis Ortega)"
        maxLength={120}
      />
      <input
        className={CAMPO}
        value={datos.telefono ?? ""}
        onChange={(e) => set("telefono", e.target.value)}
        placeholder="Teléfono (10 dígitos)"
        inputMode="tel"
        maxLength={20}
      />
      <input
        className={CAMPO}
        value={datos.email ?? ""}
        onChange={(e) => set("email", e.target.value)}
        placeholder="Correo (opcional)"
        type="email"
        maxLength={120}
      />
      <input
        className={CAMPO}
        value={datos.notas ?? ""}
        onChange={(e) => set("notas", e.target.value)}
        placeholder="Notas (paquete, apartado, lo que sea)"
        maxLength={300}
      />
    </div>
  );
}

export default function Clientes() {
  const router = useRouter();
  const [cargando, setCargando] = React.useState(true);
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [clientes, setClientes] = React.useState<ClienteFila[]>([]);
  const [eventos, setEventos] = React.useState<Map<string, { codigo: string; nombre: string }[]>>(
    new Map(),
  );
  const [nuevo, setNuevo] = React.useState<DatosCliente>(VACIO);
  const [editando, setEditando] = React.useState<string | null>(null);
  const [edicion, setEdicion] = React.useState<DatosCliente>(VACIO);
  const [guardando, setGuardando] = React.useState(false);
  const [aviso, setAviso] = React.useState("");
  const [porBorrar, setPorBorrar] = React.useState<ClienteFila | null>(null);

  const releer = React.useCallback(async () => {
    const supabase = obtenerSupabase();
    if (!supabase) return;
    const [lista, mapa] = await Promise.all([listarClientes(supabase), eventosPorCliente(supabase)]);
    setClientes(lista);
    setEventos(mapa);
  }, []);

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
      setTenantId(leerIdentidad(data.session.user)?.tenantId ?? null);
      await releer();
      setCargando(false);
    });
  }, [router, releer]);

  const alta = async () => {
    const supabase = obtenerSupabase();
    if (!supabase || !tenantId) return;
    setGuardando(true);
    setAviso("");
    const creado = await crearCliente(supabase, tenantId, nuevo);
    await releer();
    setGuardando(false);
    if (!creado) {
      setAviso(
        nuevo.nombre.trim()
          ? "No pudimos guardar la ficha. Revisa tu conexión y vuelve a intentarlo."
          : "La ficha necesita al menos el nombre.",
      );
      return;
    }
    setNuevo(VACIO);
  };

  const corregir = async (id: string) => {
    const supabase = obtenerSupabase();
    if (!supabase) return;
    setGuardando(true);
    setAviso("");
    const ok = await actualizarCliente(supabase, id, edicion);
    await releer();
    setGuardando(false);
    if (!ok) {
      setAviso("No pudimos guardar la corrección.");
      return;
    }
    setEditando(null);
  };

  const borrar = async () => {
    const supabase = obtenerSupabase();
    if (!supabase || !porBorrar) return;
    setPorBorrar(null);
    setGuardando(true);
    setAviso("");
    const ok = await borrarCliente(supabase, porBorrar.id);
    await releer();
    setGuardando(false);
    if (!ok) setAviso("No se pudo borrar la ficha.");
  };

  if (cargando) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <Link
        href="/panel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Panel
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
          <Users className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quién contrata cada evento, con su teléfono a un toque. Borrar una ficha no borra sus
            eventos.
          </p>
        </div>
      </div>

      {/* Alta */}
      <Card className="mt-8 p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Plus className="size-4 text-primary" /> Nuevo cliente
        </h2>
        <div className="mt-4">
          <CamposCliente datos={nuevo} onChange={setNuevo} />
        </div>
        <Button className="mt-4" size="sm" onClick={() => void alta()} disabled={guardando}>
          {guardando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Guardar cliente
        </Button>
      </Card>

      {aviso ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{aviso}</p> : null}

      {/* Lista */}
      {clientes.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Aún no hay clientes. El primero que captures aparecerá aquí, con sus eventos debajo.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {clientes.map((c) => {
            const wa = enlaceWhatsApp(c.telefono);
            const suyos = eventos.get(c.id) ?? [];
            const enEdicion = editando === c.id;
            return (
              <li key={c.id}>
                <Card className="p-5">
                  {enEdicion ? (
                    <>
                      <CamposCliente datos={edicion} onChange={setEdicion} />
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => void corregir(c.id)} disabled={guardando}>
                          <Check className="size-4" /> Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditando(null)}>
                          <X className="size-4" /> Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium">{c.nombre}</h3>
                          {/* break-words: un correo largo o una URL pegada en
                              notas no tiene espacios donde quebrar y, sin
                              esto, ensancharía la página en el celular (el
                              fallo móvil nº1 de la casa). */}
                          <p className="mt-0.5 break-words text-sm text-muted-foreground">
                            {[c.telefono, c.email].filter(Boolean).join(" · ") || "Sin contacto"}
                          </p>
                          {c.notas ? (
                            <p className="mt-1 break-words text-sm text-muted-foreground">{c.notas}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {wa ? (
                            <a href={wa} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                <MessageCircle className="size-4" /> WhatsApp
                              </Button>
                            </a>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Corregir a ${c.nombre}`}
                            onClick={() => {
                              setEditando(c.id);
                              setEdicion({
                                nombre: c.nombre,
                                telefono: c.telefono ?? "",
                                email: c.email ?? "",
                                notas: c.notas ?? "",
                              });
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Borrar a ${c.nombre}`}
                            onClick={() => setPorBorrar(c)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                      {suyos.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                          {suyos.map((ev) => (
                            <Link
                              key={ev.codigo}
                              href={`/eventos/${encodeURIComponent(ev.codigo)}`}
                              className="rounded-full bg-muted px-3 py-1 text-xs font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              {ev.nombre}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Confirmar
        abierto={porBorrar !== null}
        titulo={`¿Borrar la ficha de ${porBorrar?.nombre ?? ""}?`}
        descripcion="Se borra solo la ficha (nombre, teléfono, notas). Sus eventos se quedan, sin cliente asignado."
        textoConfirmar="Sí, borrarla"
        onConfirmar={() => void borrar()}
        onCancelar={() => setPorBorrar(null)}
      />
    </main>
  );
}
