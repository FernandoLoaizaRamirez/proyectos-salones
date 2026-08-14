import type { Invitacion } from "@salones/core";

/**
 * LA NOTA. Aquí va lo incómodo pero necesario: "solo adultos", "el
 * estacionamiento es limitado", "no llevar blanco". Tiene su propio bloque
 * porque metida entre los detalles no la lee nadie.
 */
export function Nota({ inv }: { inv: Invitacion }) {
  if (!inv.nota.texto) return null;
  return (
    <section id="nota" className="compacta">
      <div className="env centro">
        <p className="eyebrow rev">{inv.nota.titulo || "Una nota"}</p>
        <p className="texto rev d1">{inv.nota.texto}</p>
      </div>
    </section>
  );
}
