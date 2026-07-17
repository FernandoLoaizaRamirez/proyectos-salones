"use client";

import * as React from "react";
import { obtenerSync, eventoActual } from "@salones/sync";
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
    if (cargado) localStorage.setItem(K_MIS_VOTOS, JSON.stringify(misVotos));
  }, [misVotos, cargado]);

  const yaVote = React.useCallback((id: string) => misVotos.includes(id), [misVotos]);

  const agregar = React.useCallback(
    (datos: { titulo: string; artista?: string; link?: string; pedidaPor?: string }) => {
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
      void obtenerSync().guardar(eventoActual(), COLECCION_CANCIONES, c);
      // El autor de la canción cuenta como su primer voto (en este dispositivo).
      setMisVotos((v) => (v.includes(c.id) ? v : [...v, c.id]));
    },
    [],
  );

  const votar = React.useCallback((id: string) => {
    if (misVotosRef.current.includes(id)) return;
    const actual = cancionesRef.current.find((c) => c.id === id);
    if (!actual) return;
    void obtenerSync().guardar(eventoActual(), COLECCION_CANCIONES, {
      ...actual,
      votos: actual.votos + 1,
    });
    setMisVotos((v) => (v.includes(id) ? v : [...v, id]));
  }, []);

  const setEstado = React.useCallback((id: string, estado: Estado) => {
    const actual = cancionesRef.current.find((c) => c.id === id);
    if (!actual) return;
    void obtenerSync().guardar(eventoActual(), COLECCION_CANCIONES, { ...actual, estado });
  }, []);

  const eliminar = React.useCallback((id: string) => {
    void obtenerSync().eliminar(eventoActual(), COLECCION_CANCIONES, id);
  }, []);

  return { canciones, cargado, yaVote, agregar, votar, setEstado, eliminar };
}
