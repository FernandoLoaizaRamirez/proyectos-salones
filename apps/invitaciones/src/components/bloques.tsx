/**
 * LAS SECCIONES CENTRALES: saludo, cita, cuenta regresiva, padres y padrinos.
 *
 * Van juntas porque son las cuatro cortas y comparten la misma caja de papel;
 * separarlas en cinco archivos de veinte líneas habría escondido el orden en el
 * que se leen, que es lo único que importa entenderlas.
 *
 * Todas devuelven `null` si no hay nada que enseñar: una boda sin padrinos no
 * enseña un título con un hueco debajo, enseña una invitación más corta.
 */
"use client";

import * as React from "react";
import { nombresInvitacion, type Invitacion } from "@salones/core";
import { Rincon } from "./botanica";

/* ------------------------------------------------------------------ */
/* Saludo                                                             */
/* ------------------------------------------------------------------ */

export function Saludo({ inv }: { inv: Invitacion }) {
  if (!inv.saludo) return null;
  return (
    <section id="saludo" className="compacta">
      <Rincon donde="sd" />
      <div className="env">
        <div className="caja rev">
          <p className="eyebrow">Con cariño</p>
          <h2 id="saludoTitulo">Con mucho cariño para ti</h2>
          <p className="texto">{inv.saludo}</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cita                                                               */
/* ------------------------------------------------------------------ */

export function Cita({ inv }: { inv: Invitacion }) {
  if (!inv.frase) return null;
  return (
    <section id="cita" className="compacta">
      <div className="env centro">
        <p id="citaTexto" className="rev">
          {`“${inv.frase}”`}
        </p>
        <p id="citaAutor" className="rev d1">
          {inv.autorFrase || nombresInvitacion(inv)}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cuenta regresiva                                                   */
/* ------------------------------------------------------------------ */

/**
 * Cuánto falta. Los números no se pintan en el servidor —ahí no existe "ahora"—
 * sino en el primer latido dentro del navegador; hasta entonces se enseñan los
 * ceros del diseño, que es justo lo que se ve un instante en el original.
 */
export function Conteo({ inv }: { inv: Invitacion }) {
  const objetivo = React.useMemo(() => new Date(inv.fechaISO).getTime(), [inv.fechaISO]);
  const [restante, setRestante] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(objetivo)) return;
    const tic = () => setRestante(Math.max(0, objetivo - Date.now()));
    tic();
    const t = window.setInterval(tic, 1000);
    return () => window.clearInterval(t);
  }, [objetivo]);

  if (!inv.fechaISO) return null;

  const s = restante === null ? null : Math.floor(restante / 1000);
  const dd = (n: number, largo = 2) => String(n).padStart(largo, "0");
  const casillas =
    s === null
      ? [
          { v: "000", e: "Días" },
          { v: "00", e: "Horas" },
          { v: "00", e: "Min" },
          { v: "00", e: "Seg" },
        ]
      : [
          { v: dd(Math.floor(s / 86400), 3), e: "Días" },
          { v: dd(Math.floor(s / 3600) % 24), e: "Horas" },
          { v: dd(Math.floor(s / 60) % 60), e: "Min" },
          { v: dd(s % 60), e: "Seg" },
        ];
  const llego = s !== null && s <= 0;

  return (
    <section id="conteo" className="compacta">
      <Rincon donde="si" />
      <div className="env centro">
        <p className="eyebrow rev">La espera</p>
        <h2 className="titulo rev">Cuenta regresiva</h2>
        <div className="reloj rev d1">
          {casillas.map((c) => (
            <div className="casilla" key={c.e}>
              <b>{c.v}</b>
              <i>{c.e}</i>
            </div>
          ))}
        </div>
        {llego || inv.conteoNota ? (
          <p id="cdMsg" className="rev d2">
            {llego ? "¡Hoy es el gran día!" : inv.conteoNota}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Padres y padrinos                                                  */
/* ------------------------------------------------------------------ */

function Fichas({ items }: { items: { rol: string; nombres: string }[] }) {
  return (
    <div className="rejilla dos">
      {items.map((p, i) => (
        <div className={`ficha rev${i % 2 ? " d1" : ""}`} key={`${p.rol}-${i}`}>
          {p.rol ? <p className="rol">{p.rol}</p> : null}
          <p className="nom">{p.nombres}</p>
        </div>
      ))}
    </div>
  );
}

export function Padres({ inv }: { inv: Invitacion }) {
  const esXV = inv.tipo === "xv";
  const deElla = inv.padres.novia.filter(Boolean);
  const deEl = inv.padres.novio.filter(Boolean);

  /*
   * En unos XV hay unos padres y ya: una ficha por persona, sin rótulo. En una
   * boda son dos familias, así que va UNA ficha por lado con sus nombres juntos
   * — si se hiciera una ficha por persona, el rótulo "Padres de la novia" se
   * repetiría dos veces seguidas y parecería un error.
   */
  const items = esXV
    ? [...deElla, ...deEl].map((nombres) => ({ rol: "", nombres }))
    : [
        { rol: "Padres de la novia", nombres: deElla.join(" y ") },
        { rol: "Padres del novio", nombres: deEl.join(" y ") },
      ].filter((f) => f.nombres);
  if (!items.length) return null;

  return (
    <section id="padres" className="compacta">
      <div className="env centro">
        <p className="eyebrow rev">{inv.padres.titulo || "Con la bendición de"}</p>
        <h2 className="titulo rev">{esXV ? "Mis Padres" : "Nuestros Padres"}</h2>
        <Fichas items={items} />
      </div>
    </section>
  );
}

export function Padrinos({ inv }: { inv: Invitacion }) {
  const items = inv.padrinos.filter((p) => p.nombres);
  if (!items.length) return null;
  return (
    <section id="padrinos" className="compacta">
      <Rincon donde="ii" />
      <div className="env centro">
        <p className="eyebrow rev">
          {inv.tipo === "xv" ? "Quienes me acompañan" : "Quienes nos acompañan"}
        </p>
        <h2 className="titulo rev">{inv.tipo === "xv" ? "Mis Padrinos" : "Nuestros Padrinos"}</h2>
        <Fichas items={items} />
      </div>
    </section>
  );
}
