"use client";

import * as React from "react";
import {
  EstadoRSVP,
  tituloInvitacion,
  type Invitacion,
  type InvitadoEnlace,
} from "@salones/core";
import { obtenerSync } from "@salones/sync";
import { Rincon } from "./botanica";
import { IconoWhatsApp } from "./iconos";

/**
 * CONFIRMAR ASISTENCIA desde la propia invitación.
 *
 * Va por dos caminos a la vez, y es a propósito:
 *
 *   · Se GUARDA en la colección "respuestas" del evento —la misma que usan el
 *     portal y la app de RSVP—, así que cae sola en el tablero "Confirmaciones"
 *     del panel del salón. Sin esto, el salón tendría que ir contando mensajes
 *     de WhatsApp a mano, que es justo lo que se vende no hacer.
 *   · Y si el salón puso un WhatsApp, queda el botón para mandarlo también por
 *     ahí. Es el único camino que funciona SIN servidor (planes de renta y
 *     compra), y a mucha gente le tranquiliza ver el mensaje enviado.
 *
 * ÚNICA DIFERENCIA CON LA PLANTILLA ORIGINAL: aquí se pregunta el NOMBRE. Allá
 * no hacía falta porque cada invitado abría un enlace personal que ya lo
 * identificaba; este se comparte igual para todos, así que sin el nombre el
 * salón recibiría "alguien confirmó para 4".
 *
 * Y cuando SÍ hay enlace personal (llegó con su `#`), lo mejor de los dos
 * mundos: el nombre y sus lugares vienen precargados —editables, por si
 * contesta otro de la familia— y la respuesta viaja con SU id, así que cae en
 * su renglón del tablero "Confirmaciones" del panel en vez de crear uno nuevo.
 */
const COLECCION_RESPUESTAS = "respuestas";

/** Recuerda qué contestó ESTE teléfono, para corregir en vez de duplicar. */
const claveMia = (evento: string) => `invitacion:rsvp:${evento}`;

export function Rsvp({
  inv,
  codigo,
  invitado = null,
}: {
  inv: Invitacion;
  codigo: string;
  invitado?: InvitadoEnlace | null;
}) {
  const [nombre, setNombre] = React.useState("");
  const [asiste, setAsiste] = React.useState<boolean | null>(null);
  const [personas, setPersonas] = React.useState("2");
  const [mensaje, setMensaje] = React.useState("");
  const [aviso, setAviso] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [enviada, setEnviada] = React.useState(false);

  /*
   * El enlace personal se lee DESPUÉS del primer pintado (viene del `#`), así
   * que no puede ser el estado inicial: cuando llega, se precargan nombre y
   * personas. El nombre solo se rellena si el campo sigue vacío —puede que ya
   * lo esté escribiendo otro miembro de la familia— y los cupos caben siempre
   * en el select, porque abajo ofrece hasta max(6, cupos).
   */
  React.useEffect(() => {
    if (!invitado) return;
    setNombre((previo) => (previo.trim() ? previo : invitado.nombre));
    setPersonas(String(invitado.cupos));
  }, [invitado]);

  // Hasta 6 como siempre, o hasta los cupos del enlace si son más ("Familia
  // Núñez" con 8 lugares tiene que poder decir que van los 8).
  const topePases = Math.max(6, invitado?.cupos ?? 0);

  const textoWhatsApp = () =>
    [
      `Confirmación de asistencia · ${tituloInvitacion(inv)}`,
      "",
      `Nombre: ${nombre}`,
      `¿Asistiré?: ${asiste ? "Sí, ahí estaré" : "No podré asistir"}`,
      asiste ? `Número de personas: ${personas}` : "",
      mensaje ? `Mensaje: ${mensaje}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  const porWhatsApp = () => {
    const tel = inv.rsvp.whatsapp.replace(/\D/g, "");
    if (!tel) return;
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(textoWhatsApp())}`,
      "_blank",
      "noopener,noreferrer",
    );
    setEnviada(true);
  };

  const enviar = async () => {
    if (asiste === null) {
      setAviso("Elige una opción para continuar.");
      return;
    }
    if (!nombre.trim()) {
      setAviso("Escribe tu nombre para que sepan quién eres.");
      return;
    }
    setAviso("");
    setEnviando(true);

    // El mismo id de este teléfono en este evento: volver a contestar CORRIGE
    // la respuesta anterior en vez de dejar dos personas donde hay una.
    //
    // Con enlace personal manda SU id: así la respuesta cae en su renglón del
    // tablero del panel (la colección `respuestas` admite que el invitado
    // reescriba lo suyo — candado 0016). El id local se sigue guardando abajo
    // como respaldo, por si un día vuelve sin el enlace.
    let id = invitado?.id ?? "";
    if (!id) {
      try {
        id = localStorage.getItem(claveMia(codigo)) ?? "";
      } catch {
        /* sin almacenamiento: se manda como respuesta nueva */
      }
    }
    if (!id) id = "RS-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    try {
      await obtenerSync().guardar(codigo, COLECCION_RESPUESTAS, {
        id,
        estado: asiste ? EstadoRSVP.Confirmado : EstadoRSVP.Rechazado,
        personas: asiste ? Number(personas) : 0,
        nombre: nombre.trim(),
        mensaje: mensaje.trim(),
        fecha: Date.now(),
      });
      try {
        localStorage.setItem(claveMia(codigo), id);
      } catch {
        /* la respuesta ya viajó; solo se pierde el recordatorio */
      }
      setEnviada(true);
    } catch {
      // No se pierde: si hay WhatsApp, se manda por ahí sin reescribir nada.
      if (inv.rsvp.whatsapp) porWhatsApp();
      else setAviso("No pudimos guardar tu respuesta. Inténtalo de nuevo, por favor.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section id="rsvp">
      <Rincon donde="sd" />
      <div className="env">
        <div className="caja rev">
          <p className="eyebrow">Te esperamos</p>
          <h2 className="titulo">Confirma tu asistencia</h2>
          <p className="texto">
            {inv.rsvp.fechaLimite
              ? `Por favor confírmanos antes del ${inv.rsvp.fechaLimite}.`
              : "Por favor confírmanos lo antes posible."}
          </p>

          {enviada ? (
            <>
              <p id="rsvpMsg">
                {asiste
                  ? "¡Gracias! Tu confirmación quedó registrada. Nos vemos pronto."
                  : "Gracias por avisarnos. Te vamos a extrañar."}
              </p>
              <div className="acciones">
                <button className="btn" type="button" onClick={() => setEnviada(false)}>
                  Cambiar mi respuesta
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="opciones">
                <button
                  className="opc"
                  type="button"
                  aria-pressed={asiste === true}
                  onClick={() => {
                    setAsiste(true);
                    setAviso("");
                  }}
                >
                  Sí, ahí estaré
                </button>
                <button
                  className="opc"
                  type="button"
                  aria-pressed={asiste === false}
                  onClick={() => {
                    setAsiste(false);
                    setAviso("");
                  }}
                >
                  No podré asistir
                </button>
              </div>

              <div className="campo">
                <label htmlFor="rsvpNombre">Tu nombre</label>
                <input
                  id="rsvpNombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre y apellido"
                  autoComplete="name"
                />
              </div>

              {asiste ? (
                <div className="campo">
                  <label htmlFor="rsvpPases">¿Cuántos asistirán?</label>
                  <select
                    id="rsvpPases"
                    value={personas}
                    onChange={(e) => setPersonas(e.target.value)}
                  >
                    {Array.from({ length: topePases }, (_, i) => String(i + 1)).map((n) => (
                      <option key={n} value={n}>
                        {n === "1" ? "1 persona" : `${n} personas`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="campo">
                <label htmlFor="rsvpMensaje">Mensaje (opcional)</label>
                <textarea
                  id="rsvpMensaje"
                  rows={3}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder={
                    inv.tipo === "xv" ? "Un mensaje para la festejada" : "Un mensaje para los novios"
                  }
                />
              </div>

              {/* El aviso va ENCIMA del botón, no debajo: la tarjeta mide casi
                  lo que la pantalla del celular, así que puesto al final caía
                  fuera y quien tocaba "Enviar confirmación" sin elegir Sí/No
                  veía que "no pasaba nada" y se iba sin confirmar. */}
              <p id="rsvpMsg" role="status" aria-live="polite">
                {aviso}
              </p>

              <div className="acciones">
                <button
                  className="btn solido"
                  type="button"
                  onClick={() => void enviar()}
                  disabled={enviando}
                >
                  {enviando ? "Enviando…" : "Enviar confirmación"}
                </button>
                {inv.rsvp.whatsapp ? (
                  <button className="btn" type="button" onClick={porWhatsApp}>
                    <IconoWhatsApp />
                    WhatsApp
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
