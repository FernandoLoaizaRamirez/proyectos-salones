"use client";

import * as React from "react";
import type { Invitacion } from "@salones/core";
import { Rincon } from "./botanica";
import { IconoCopiar } from "./iconos";

/**
 * MESA DE REGALOS: las tiendas y la "lluvia de sobres".
 *
 * El botón de COPIAR la CLABE no es un adorno: son 18 dígitos que el invitado
 * va a teclear en la app de su banco desde el mismo teléfono, y copiar a mano
 * de una pantalla a otra es justo donde se equivoca la gente. Si el navegador
 * no deja copiar, la CLABE se queda a la vista para hacerlo a mano.
 */
export function Regalos({ inv }: { inv: Invitacion }) {
  const [copiada, setCopiada] = React.useState(false);
  const r = inv.regalos;
  const tiendas = r.tiendas.filter((t) => t.nombre && t.url);
  const haySobre = Boolean(r.clabe);
  if (!r.texto && !tiendas.length && !haySobre) return null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(r.clabe);
      setCopiada(true);
      window.setTimeout(() => setCopiada(false), 2200);
    } catch {
      /* sin portapapeles: la CLABE sigue a la vista */
    }
  };

  return (
    <section id="regalos">
      <Rincon donde="ii" />
      <div className="env centro">
        <p className="eyebrow rev">Si deseas tener un detalle</p>
        <h2 className="titulo rev">Mesa de Regalos</h2>
        {r.texto ? <p className="texto rev">{r.texto}</p> : null}

        {tiendas.length ? (
          <div className="tiendas rev d1">
            {tiendas.map((t) => (
              <a className="btn" key={t.url} href={t.url} target="_blank" rel="noopener noreferrer">
                {t.nombre}
              </a>
            ))}
          </div>
        ) : null}

        {haySobre ? (
          <div className="sobre rev d2">
            <p className="rol">Lluvia de sobres</p>
            {r.banco ? <p className="dato">{r.banco}</p> : null}
            {r.titular ? <p className="dato">{r.titular}</p> : null}
            <p id="regClabe">{r.clabe}</p>
            <button className="btn magenta" type="button" onClick={() => void copiar()}>
              <IconoCopiar />
              <span>{copiada ? "¡Copiada!" : "Copiar CLABE"}</span>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
