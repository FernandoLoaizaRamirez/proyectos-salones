/**
 * EL PERFIL DEL INVITADO — la memoria común de este teléfono en el portal.
 *
 * POR QUÉ EXISTE: hasta hoy cada módulo pedía el nombre por su cuenta (el muro
 * el suyo, la playlist el suyo, la trivia el suyo…) y nada conectaba que todas
 * esas respuestas eran de la MISMA persona. El perfil es esa conexión: se
 * escribe una vez —al abrir el enlace personal, o la primera vez que alguien se
 * presenta en cualquier módulo— y todos los demás lo encuentran listo.
 *
 * De dónde sale el `id`: SOLO del enlace personal del anfitrión (el fragmento
 * `#` que empaqueta `codificarInvitadoEnlace` de core). Es la única fuente que
 * ata a esta persona con un renglón real de la lista del anfitrión; un nombre
 * tecleado a mano nunca lo trae. Por eso la fusión de `guardarPerfil` cuida el
 * id como oro: un perfil que ya lo tiene JAMÁS lo pierde por guardar un nombre.
 *
 * Todo vive en el navegador (localStorage, por evento): el perfil no viaja a
 * ningún servidor por sí mismo. Los accesos van con try/catch porque un
 * localStorage lleno o bloqueado no puede tumbar la pantalla de un invitado.
 */
import * as React from "react";
import { leerInvitadoDeHash } from "@salones/core";

export type PerfilInvitado = {
  /** El id del renglón del anfitrión, si llegó con su enlace personal. */
  id?: string;
  nombre: string;
  /** Cuántos lugares ampara su invitación, si se sabe. */
  cupos?: number;
};

/**
 * Aviso interno de "el perfil cambió": los módulos abiertos en la misma pestaña
 * lo escuchan para refrescarse (el evento `storage` del navegador solo suena en
 * las OTRAS pestañas, nunca en la que escribió).
 */
const EVENTO_PERFIL = "portal:perfil";

/** Clave del perfil de ESTE dispositivo, POR EVENTO (dos bodas no se mezclan). */
export function clavePerfil(evento: string): string {
  return `portal:invitado:${evento}`;
}

/** Lee el perfil guardado. NUNCA lanza: sin perfil (o con basura) da `null`. */
export function leerPerfil(evento: string): PerfilInvitado | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(clavePerfil(evento));
    if (!raw) return null;
    const obj = JSON.parse(raw) as Partial<PerfilInvitado>;
    if (typeof obj?.nombre !== "string" || !obj.nombre.trim()) return null;
    return {
      nombre: obj.nombre,
      ...(typeof obj.id === "string" && obj.id ? { id: obj.id } : {}),
      ...(typeof obj.cupos === "number" && obj.cupos > 0 ? { cupos: Math.floor(obj.cupos) } : {}),
    };
  } catch {
    return null;
  }
}

/** Avisa a los módulos abiertos que el perfil cambió. */
function avisar(): void {
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_PERFIL));
  } catch {
    /* sin CustomEvent no hay aviso en vivo; el perfil igual quedó guardado */
  }
}

/**
 * Guarda el perfil FUSIONANDO con el existente: el nombre nuevo sí reemplaza al
 * viejo (la persona corrigió cómo se llama), pero un perfil con id nunca pierde
 * su id por guardar uno sin id — perder el id sería desconectar a la persona de
 * su renglón en la lista del anfitrión por el simple hecho de firmar el muro.
 */
export function guardarPerfil(evento: string, perfil: PerfilInvitado): PerfilInvitado {
  const previo = leerPerfil(evento);
  const fusionado: PerfilInvitado = {
    ...previo,
    ...perfil,
    ...(perfil.id ? { id: perfil.id } : previo?.id ? { id: previo.id } : {}),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(clavePerfil(evento), JSON.stringify(fusionado));
    } catch {
      /* sin espacio: el perfil vive solo esta visita, nada se rompe */
    }
    avisar();
  }
  return fusionado;
}

/** Borra el perfil ("No soy yo": otro invitado agarró este teléfono). */
export function olvidarPerfil(evento: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(clavePerfil(evento));
  } catch {
    /* si no se pudo borrar, el aviso igual hace que se relea lo que haya */
  }
  avisar();
}

/**
 * Captura el perfil que viene en el enlace personal (`#` del anfitrión). Si el
 * fragmento trae un invitado válido, se guarda —fusionado, ver arriba— y se
 * devuelve; con un hash vacío o manoseado no pasa nada.
 */
export function capturarPerfilDeHash(evento: string): PerfilInvitado | null {
  if (typeof window === "undefined") return null;
  const inv = leerInvitadoDeHash(window.location.hash);
  if (!inv) return null;
  return guardarPerfil(evento, { id: inv.id, nombre: inv.nombre, cupos: inv.cupos });
}

/**
 * El perfil VIVO para los componentes: arranca en `null` y se lee tras montar
 * (el servidor no tiene localStorage; leer antes desincronizaría la
 * hidratación), y se relee cuando otro módulo lo guarda ('portal:perfil') o
 * cuando lo cambia otra pestaña ('storage').
 */
export function usePerfil(evento: string): PerfilInvitado | null {
  const [perfil, setPerfil] = React.useState<PerfilInvitado | null>(null);

  React.useEffect(() => {
    const releer = () => setPerfil(leerPerfil(evento));
    releer();
    window.addEventListener(EVENTO_PERFIL, releer);
    window.addEventListener("storage", releer);
    return () => {
      window.removeEventListener(EVENTO_PERFIL, releer);
      window.removeEventListener("storage", releer);
    };
  }, [evento]);

  return perfil;
}
