"use client";

/**
 * Página del pase individual (lo que abre el invitado desde el enlace que le
 * comparten). Los datos del pase viajan dentro del propio enlace, sin
 * servidor. Lo que SÍ se consulta —solo cuando hay un evento real (`?e=`)—
 * son los textos del evento (ver ../../lib/evento-real) y la mesa del acomodo.
 */
import * as React from "react";
import {
  COLECCION_ACOMODO,
  COLECCION_MESAS,
  buscarEnAcomodo,
  codificarInvitadoEnlace,
  mesaDe,
  normalizarAcomodoCrudo,
  normalizarMesasCrudas,
  normalizarNombre,
} from "@salones/core";
import { obtenerSync, esVitrina } from "@salones/sync";
import { decodificarPase, type Invitado } from "@/lib/evento";
import { useEventoReal } from "@/lib/evento-real";
import { PassTicket } from "@/components/pass-ticket";

// La dirección del portal se puede apuntar por variable de entorno (para
// probar contra uno local); si no, la publicada en producción.
const PORTAL_BASE =
  process.env.NEXT_PUBLIC_PORTAL_URL || "https://proyectos-salones-portal.vercel.app";

export default function PasePage() {
  const [inv, setInv] = React.useState<Invitado | null | "cargando">("cargando");
  const { codigo, textos } = useEventoReal();
  /** La mesa según el acomodo real del evento, si se encontró sin duda. */
  const [mesaViva, setMesaViva] = React.useState<string | null>(null);

  React.useEffect(() => {
    // El decodificador entiende los enlaces nuevos del panel Y los viejos ya
    // repartidos por WhatsApp (ver decodificarPase).
    const hash = window.location.hash.replace(/^#/, "");
    setInv(hash ? decodificarPase(hash) : null);
  }, []);

  /*
   * LA MESA VIVA: la del acomodo real MANDA sobre la congelada en el enlace.
   * El pase se reparte una sola vez, pero el organizador puede reacomodar las
   * mesas después de repartirlo (y suele hacerlo); el enlace guarda la mesa de
   * aquel día, el acomodo guarda la de hoy.
   *
   * Es UNA lectura al abrir, sin suscripción: el acomodo no cambia mientras el
   * invitado mira su boleto, y sondear gastaría sus datos para nada. La
   * coincidencia es por nombre y solo si es INEQUÍVOCA — mismo criterio que la
   * sección "Tu lugar" de la invitación: una única coincidencia, o una única
   * EXACTA sin acentos ni mayúsculas. En la duda, o sin red, o sin acomodo
   * publicado, se queda la mesa del enlace: nada lanza y decirle una mesa
   * equivocada sería peor que dejar la de antes.
   */
  React.useEffect(() => {
    if (esVitrina(codigo) || inv === "cargando" || inv === null) return;
    let vivo = true;
    (async () => {
      try {
        const sync = obtenerSync();
        const [mesasCrudas, acomodoCrudo] = await Promise.all([
          sync.listar(codigo, COLECCION_MESAS),
          sync.listar(codigo, COLECCION_ACOMODO),
        ]);
        if (!vivo) return;
        const mesas = normalizarMesasCrudas(mesasCrudas);
        const acomodo = normalizarAcomodoCrudo(acomodoCrudo);
        if (!mesas.length || !acomodo.length) return;
        const candidatos = buscarEnAcomodo(inv.nombre, acomodo);
        const exactos = candidatos.filter(
          (c) => normalizarNombre(c.nombre) === normalizarNombre(inv.nombre),
        );
        const unico =
          candidatos.length === 1 ? candidatos[0] : exactos.length === 1 ? exactos[0] : null;
        if (!unico) return;
        const mesa = mesaDe(unico, mesas);
        if (mesa) setMesaViva(mesa.nombre);
      } catch {
        /* sin red o sin servidor: el boleto se queda con la mesa del enlace */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [codigo, inv]);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      {inv === "cargando" ? (
        <p className="text-muted-foreground">Cargando pase…</p>
      ) : inv ? (
        <div className="w-full max-w-sm">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Tu pase para {textos.nombre}
          </p>
          <PassTicket
            inv={mesaViva !== null ? { ...inv, mesa: mesaViva } : inv}
            textos={{ nombre: textos.nombre, fechaCorta: textos.fechaCorta }}
          />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Guarda esta pantalla o toma una captura. Muéstrala en la entrada del evento.
          </p>
          {codigo !== "demo" ? (
            // EL PUENTE AL PORTAL: solo con un evento real. La identidad viaja
            // en el fragmento (`#`), que nunca toca el servidor, con el id TAL
            // CUAL: si es el UUID del panel, el portal lo reconoce como su
            // renglón de siempre.
            <a
              href={`${PORTAL_BASE}/?e=${encodeURIComponent(codigo)}#${codificarInvitadoEnlace({
                id: inv.id,
                nombre: inv.nombre,
                cupos: inv.personas,
              })}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-10 w-full items-center justify-center rounded-[var(--radius)] border border-border text-sm font-medium transition-colors hover:bg-muted"
            >
              Abrir el portal del evento
            </a>
          ) : null}
        </div>
      ) : (
        <div className="max-w-sm text-center">
          <p className="text-muted-foreground">
            Este pase no es válido. Pide a los organizadores que te reenvíen tu invitación.
          </p>
        </div>
      )}
    </main>
  );
}
