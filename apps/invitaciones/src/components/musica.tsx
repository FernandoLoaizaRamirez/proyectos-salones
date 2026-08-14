"use client";

import * as React from "react";

/**
 * EL BOTÓN DE MÚSICA.
 *
 * Solo aparece si el salón puso una canción. Y solo intenta sonar DESPUÉS de
 * que el invitado tocó "Abrir invitación": los navegadores del teléfono no
 * dejan que una página empiece a sonar sola, así que ese toque es el permiso.
 * Si aun así el navegador lo niega, el botón se queda en silencio, sin decir
 * nada — que suene música es un regalo, no un requisito.
 */
const ICONO_PLAY = (
  <>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </>
);
const ICONO_PAUSA = <path d="M9 5v14M15 5v14" />;

export function Musica({ url, abierta }: { url: string; abierta: boolean }) {
  const audio = React.useRef<HTMLAudioElement>(null);
  const [sonando, setSonando] = React.useState(false);

  React.useEffect(() => {
    if (!abierta || !url) return;
    const a = audio.current;
    if (!a) return;
    a.volume = 0.42;
    a.play().then(
      () => setSonando(true),
      () => setSonando(false), // el navegador dijo que no: sin ruido y sin drama
    );
  }, [abierta, url]);

  if (!url) return null;

  const alternar = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      a.volume = 0.42;
      a.play().then(
        () => setSonando(true),
        () => setSonando(false),
      );
    } else {
      a.pause();
      setSonando(false);
    }
  };

  return (
    <>
      <button
        id="btnMusica"
        type="button"
        className={`${abierta ? "listo" : ""} ${sonando ? "sonando" : ""}`.trim()}
        onClick={alternar}
        aria-pressed={sonando}
        aria-label={sonando ? "Pausar música de fondo" : "Reproducir música de fondo"}
      >
        <span className="onda" aria-hidden="true" />
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {sonando ? ICONO_PAUSA : ICONO_PLAY}
        </svg>
      </button>
      <audio ref={audio} src={url} loop preload="none" onEnded={() => setSonando(false)} />
    </>
  );
}
