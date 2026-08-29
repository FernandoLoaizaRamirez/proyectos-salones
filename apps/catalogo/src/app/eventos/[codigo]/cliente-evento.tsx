"use client";

/**
 * DE QUIÉN ES ESTE EVENTO — la tarjeta del cliente en el puesto de mando.
 *
 * Liga el evento con su ficha de cliente (0030): se ve el nombre y el
 * teléfono con WhatsApp a un toque, se cambia con un select, y si la persona
 * aún no tiene ficha se captura aquí mismo sin ir a la pantalla de Clientes.
 * Desligar no borra la ficha; borrar la ficha no borra el evento.
 */
import * as React from "react";
import Link from "next/link";
import { Check, Loader2, MessageCircle, UserRound } from "lucide-react";
import { Button, Card } from "@salones/ui";
import { obtenerSupabase } from "@/lib/supabase";
import { leerIdentidad } from "@/lib/sesion";
import {
  asignarClienteAEvento,
  crearCliente,
  enlaceWhatsApp,
  listarClientes,
  type ClienteFila,
} from "@/lib/clientes";

const CAMPO =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm";

export function ClienteEvento({
  eventId,
  clientIdInicial,
}: {
  eventId: string;
  clientIdInicial: string | null;
}) {
  const [clientes, setClientes] = React.useState<ClienteFila[] | null>(null);
  const [clientId, setClientId] = React.useState<string | null>(clientIdInicial);
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  const [aviso, setAviso] = React.useState("");
  /** El alta rápida: nombre y teléfono, sin salir de la ficha del evento. */
  const [alta, setAlta] = React.useState(false);
  const [nombre, setNombre] = React.useState("");
  const [telefono, setTelefono] = React.useState("");

  React.useEffect(() => {
    const supabase = obtenerSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      setTenantId(leerIdentidad(data.session?.user)?.tenantId ?? null);
      setClientes(await listarClientes(supabase));
    });
  }, []);

  const asignar = async (nuevo: string | null) => {
    const supabase = obtenerSupabase();
    if (!supabase) return;
    setGuardando(true);
    setAviso("");
    const ok = await asignarClienteAEvento(supabase, eventId, nuevo);
    setGuardando(false);
    if (!ok) {
      setAviso("No pudimos guardar el cambio.");
      return;
    }
    setClientId(nuevo);
  };

  const crearYAsignar = async () => {
    const supabase = obtenerSupabase();
    if (!supabase || !tenantId) return;
    if (!nombre.trim()) {
      setAviso("La ficha necesita al menos el nombre.");
      return;
    }
    setGuardando(true);
    setAviso("");
    const creado = await crearCliente(supabase, tenantId, { nombre, telefono });
    if (creado) {
      setClientes((previos) => [...(previos ?? []), creado]);
      const ok = await asignarClienteAEvento(supabase, eventId, creado.id);
      if (ok) {
        setClientId(creado.id);
        setAlta(false);
        setNombre("");
        setTelefono("");
      } else {
        setAviso("La ficha se guardó, pero no se pudo ligar al evento.");
      }
    } else {
      setAviso("No pudimos guardar la ficha.");
    }
    setGuardando(false);
  };

  const cliente = clientes?.find((c) => c.id === clientId) ?? null;
  const wa = enlaceWhatsApp(cliente?.telefono ?? null);

  return (
    <Card className="mt-8 p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">El cliente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quién contrata este evento. Su ficha completa vive en{" "}
            <Link href="/panel/clientes" className="underline underline-offset-2 hover:text-foreground">
              Clientes
            </Link>
            .
          </p>

          {clientes === null ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Viendo las fichas…
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <select
                  className={`${CAMPO} max-w-xs`}
                  value={clientId ?? ""}
                  disabled={guardando}
                  onChange={(e) => void asignar(e.target.value || null)}
                >
                  <option value="">Sin cliente asignado</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="size-4" /> WhatsApp
                    </Button>
                  </a>
                ) : null}
                {!alta ? (
                  <Button size="sm" variant="ghost" onClick={() => setAlta(true)}>
                    + Nueva ficha
                  </Button>
                ) : null}
              </div>

              {alta ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <input
                    className={CAMPO}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre del cliente"
                    maxLength={120}
                  />
                  <input
                    className={`${CAMPO} sm:w-44`}
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Teléfono"
                    inputMode="tel"
                    maxLength={20}
                  />
                  <Button size="sm" onClick={() => void crearYAsignar()} disabled={guardando}>
                    {guardando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Guardar y ligar
                  </Button>
                </div>
              ) : null}

              {aviso ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{aviso}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
