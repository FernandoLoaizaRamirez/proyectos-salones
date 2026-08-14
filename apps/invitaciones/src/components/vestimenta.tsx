import type { Invitacion } from "@salones/core";

export function Vestimenta({ inv }: { inv: Invitacion }) {
  const colores = inv.vestimentaColores.filter(Boolean);
  if (!inv.vestimenta && !inv.vestimentaNota && !colores.length) return null;
  return (
    <section id="vestimenta" className="compacta">
      <div className="env centro">
        <p className="eyebrow rev">Código de vestimenta</p>
        <h2 className="titulo rev">Etiqueta</h2>
        {inv.vestimenta ? (
          <p id="vestTema" className="rev d1">
            {inv.vestimenta}
          </p>
        ) : null}
        {inv.vestimentaNota ? (
          <p className="texto rev d1">{inv.vestimentaNota}</p>
        ) : null}
        {colores.length ? (
          <div className="paleta rev d2">
            {colores.map((c) => (
              <i key={c} style={{ background: c }} title={c} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
