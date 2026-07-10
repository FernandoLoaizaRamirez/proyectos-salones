"use client";

import * as React from "react";
import {
  cancionesIniciales,
  nuevoId,
  EstadoCancion,
  type Cancion,
  type EstadoCancion as Estado,
} from "@/lib/playlist";

const K_CANCIONES = "playlist-canciones";
const K_MIS_VOTOS = "playlist-mis-votos";

/**
 * Estado compartido de la playlist: lo usan tanto el DJ como el invitado.
 * Guarda en localStorage y se sincroniza en vivo entre pestañas. Lleva la cuenta
 * de qué canciones votó ESTE dispositivo para no dejar votar dos veces.
 */
export function useCanciones() {
  const [canciones, setCanciones] = React.useState<Cancion[]>([]);
  const [misVotos, setMisVotos] = React.useState<string[]>([]);
  const [cargado, setCargado] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(K_CANCIONES);
      setCanciones(raw ? JSON.parse(raw) : cancionesIniciales());
    } catch {
      setCanciones(cancionesIniciales());
    }
    try {
      const v = localStorage.getItem(K_MIS_VOTOS);
      setMisVotos(v ? JSON.parse(v) : []);
    } catch {
      setMisVotos([]);
    }
    setCargado(true);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === K_CANCIONES && ev.newValue) {
        try {
          setCanciones(JSON.parse(ev.newValue));
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  React.useEffect(() => {
    if (cargado) localStorage.setItem(K_CANCIONES, JSON.stringify(canciones));
  }, [canciones, cargado]);
  React.useEffect(() => {
    if (cargado) localStorage.setItem(K_MIS_VOTOS, JSON.stringify(misVotos));
  }, [misVotos, cargado]);

  const yaVote = React.useCallback((id: string) => misVotos.includes(id), [misVotos]);

  const agregar = React.useCallback(
    (datos: { titulo: string; artista?: string; link?: string; pedidaPor?: string }) => {
      setCanciones((l) => {
        const c: Cancion = {
          id: nuevoId(l),
          titulo: datos.titulo,
          votos: 1,
          estado: EstadoCancion.Pendiente,
          fecha: Date.now(),
          ...(datos.artista ? { artista: datos.artista } : {}),
          ...(datos.link ? { link: datos.link } : {}),
          ...(datos.pedidaPor ? { pedidaPor: datos.pedidaPor } : {}),
        };
        // Marca esta canción como "ya votada" por este dispositivo (su autor).
        setMisVotos((v) => (v.includes(c.id) ? v : [...v, c.id]));
        return [c, ...l];
      });
    },
    [],
  );

  const votar = React.useCallback(
    (id: string) => {
      if (misVotos.includes(id)) return;
      setCanciones((l) => l.map((c) => (c.id === id ? { ...c, votos: c.votos + 1 } : c)));
      setMisVotos((v) => [...v, id]);
    },
    [misVotos],
  );

  const setEstado = React.useCallback((id: string, estado: Estado) => {
    setCanciones((l) => l.map((c) => (c.id === id ? { ...c, estado } : c)));
  }, []);

  const eliminar = React.useCallback((id: string) => {
    setCanciones((l) => l.filter((c) => c.id !== id));
  }, []);

  return { canciones, cargado, yaVote, agregar, votar, setEstado, eliminar };
}
