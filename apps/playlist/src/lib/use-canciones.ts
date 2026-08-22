"use client";

import * as React from "react";
import { obtenerSync, eventoActual } from "@salones/sync";
import { guardarLocal } from "@salones/ui";
import {
  cancionesIniciales,
  EstadoCancion,
  COLECCION_CANCIONES,
  type Cancion,
  type EstadoCancion as Estado,
} from "@/lib/playlist";

const K_MIS_VOTOS = "playlist-mis-votos";

/**
 * Estado compartido de la playlist: lo usan tanto el DJ como el invitado.
 * Lee y escribe a través del "lugar central" (@salones/sync): en local se
 * sincroniza entre pestañas del mismo dispositivo; con el servicio gestionado,
 * entre los teléfonos de todos. Mismo código.
 *
 * Los votos de ESTE dispositivo (para no dejar votar dos veces) se guardan
 * aparte, en localStorage, porque son personales de cada teléfono.
 */
export function useCanciones() {
  const [canciones, setCanciones] = React.useState<Cancion[]>([]);
  const [misVotos, setMisVotos] = React.useState<string[]>([]);
  const [cargado, setCargado] = React.useState(false);

  // Referencias a lo último, para leer sin cerrar sobre valores viejos.
  const cancionesRef = React.useRef<Cancion[]>([]);
  cancionesRef.current = canciones;
  const misVotosRef = React.useRef<string[]>([]);
  misVotosRef.current = misVotos;

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(K_MIS_VOTOS);
      setMisVotos(v ? JSON.parse(v) : []);
    } catch {
      setMisVotos([]);
    }

    const eventoId = eventoActual();
    const sync = obtenerSync();
    const cancelar = sync.suscribir<Cancion>(eventoId, COLECCION_CANCIONES, setCanciones);
    setCargado(true);

    // Solo en la demo local: si la lista está vacía, la sembramos con ejemplos.
    if (sync.nombre === "local") {
      sync.listar<Cancion>(eventoId, COLECCION_CANCIONES).then((items) => {
        if (items.length === 0) {
          for (const c of cancionesIniciales()) {
            void sync.guardar(eventoId, COLECCION_CANCIONES, c);
          }
        }
      });
    }
    return cancelar;
  }, []);

  React.useEffect(() => {
    if (cargado) guardarLocal(K_MIS_VOTOS, JSON.stringify(misVotos));
  }, [misVotos, cargado]);

  const yaVote = React.useCallback((id: string) => misVotos.includes(id), [misVotos]);

  /* ---- Nada de "guardar y confiar" (arreglado el 6 ago 2026) ---------------
   * Estas cuatro acciones lanzaban el guardado con `void` y seguían como si
   * hubiera funcionado. Con mala cobertura —lo normal en un salón lleno— la
   * canción no llegaba nunca y la pantalla decía "¡Agregada!" igualmente.
   *
   * El caso peor era VOTAR: el voto se apuntaba en este teléfono aunque el
   * guardado fallara, así que el botón quedaba deshabilitado PARA SIEMPRE y esa
   * persona ya no podía volver a intentarlo.
   *
   * Ahora todas devuelven si salió bien, y lo local solo se toca si salió bien.
   * Quien llama decide qué enseñar. */

  const agregar = React.useCallback(
    async (datos: {
      titulo: string;
      artista?: string;
      link?: string;
      pedidaPor?: string;
    }): Promise<boolean> => {
      const c: Cancion = {
        id: "SG-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
        titulo: datos.titulo,
        votos: 1,
        estado: EstadoCancion.Pendiente,
        fecha: Date.now(),
        ...(datos.artista ? { artista: datos.artista } : {}),
        ...(datos.link ? { link: datos.link } : {}),
        ...(datos.pedidaPor ? { pedidaPor: datos.pedidaPor } : {}),
      };
      try {
        await obtenerSync().guardar(eventoActual(), COLECCION_CANCIONES, c);
      } catch {
        return false;
      }
      // El autor de la canción cuenta como su primer voto (en este dispositivo).
      setMisVotos((v) => (v.includes(c.id) ? v : [...v, c.id]));
      /*
       * Y se pinta YA, sin esperar al sondeo. Antes el botón decía "¡Agregada!"
       * mientras la lista de abajo seguía diciendo "0 en cola · Aún no hay
       * canciones": durante uno a tres segundos la pantalla se contradecía sola
       * y el invitado creía que su canción no había entrado. Si el sondeo trae
       * algo distinto, manda el servidor (esto solo adelanta lo que ya se
       * guardó bien).
       */
      setCanciones((lista) => (lista.some((x) => x.id === c.id) ? lista : [...lista, c]));
      return true;
    },
    [],
  );

  const votar = React.useCallback(async (id: string): Promise<boolean> => {
    if (misVotosRef.current.includes(id)) return true;
    const actual = cancionesRef.current.find((c) => c.id === id);
    if (!actual) return false;
    try {
      await obtenerSync().guardar(eventoActual(), COLECCION_CANCIONES, {
        ...actual,
        votos: actual.votos + 1,
      });
    } catch {
      // Sin apuntar nada: así puede volver a intentarlo.
      return false;
    }
    setMisVotos((v) => (v.includes(id) ? v : [...v, id]));
    return true;
  }, []);

  const setEstado = React.useCallback(async (id: string, estado: Estado): Promise<boolean> => {
    const actual = cancionesRef.current.find((c) => c.id === id);
    if (!actual) return false;
    try {
      await obtenerSync().guardar(eventoActual(), COLECCION_CANCIONES, { ...actual, estado });
      return true;
    } catch {
      return false;
    }
  }, []);

  const eliminar = React.useCallback(async (id: string): Promise<boolean> => {
    try {
      await obtenerSync().eliminar(eventoActual(), COLECCION_CANCIONES, id);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { canciones, cargado, yaVote, agregar, votar, setEstado, eliminar };
}
