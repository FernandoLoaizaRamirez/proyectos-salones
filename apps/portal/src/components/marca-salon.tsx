import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { BrandingSalon } from "@salones/ui";

/**
 * LA MARCA DEL SALÓN EN EL PORTAL — la casa de quien organiza, no la nuestra.
 *
 * EL PROBLEMA QUE RESUELVE: `logoUrl` llevaba meses viajando de balde. Existe
 * como columna en la tabla (0007_branding.sql:26), la Edge Function lo devuelve
 * (evento-config/index.ts:127), llega al tipo y aterriza en `config.branding`…
 * y ahí se moría: `brandingAVariables` solo convierte colores, y nadie más lo
 * leía. La única marca que veía el invitado era la línea gris de 14 px que dice
 * "En <salón>". Un portal que se vende como "del salón" enseñaba el logo de
 * nadie.
 *
 * Y AL REVÉS: el portal tampoco tenía camino de vuelta a la web del salón. El
 * único enlace del pie apunta a nuestro catálogo — o sea al PROVEEDOR. Para el
 * invitado, la fiesta es del salón; nosotros no deberíamos existir en esa
 * pantalla.
 *
 * SIN LOGO TAMBIÉN FUNCIONA: la mayoría de los salones no van a tener un PNG
 * listo el primer día. Si no hay `logoUrl` se pinta un monograma con la inicial
 * sobre el color de la marca, que es exactamente lo que hace el sitio del salón
 * en su barra de navegación. Nunca se ve un hueco.
 */
export function MarcaSalon({ branding, salon }: { branding: BrandingSalon; salon?: string | null }) {
  // `branding.nombre` es el nombre del SALÓN cuando la Edge Function lo manda;
  // `salon` es el respaldo por si el branding viene vacío y solo tenemos el
  // nombre suelto. Uno de los dos siempre hay.
  const nombre = salon || branding.nombre;
  const inicial = nombre.trim().slice(0, 1).toUpperCase() || "S";

  // El sitio del salón puede venir por evento (lo suyo, cuando la base lo
  // guarde) o por variable de entorno del despliegue (lo de hoy). Si no hay
  // ninguno, la marca se pinta igual pero no enlaza a ningún lado.
  const sitio = branding.sitioUrl || process.env.NEXT_PUBLIC_SITIO_SALON_URL || null;

  const contenido = (
    <>
      {branding.logoUrl ? (
        <Image
          src={branding.logoUrl}
          alt={nombre}
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-[var(--radius)] object-contain"
          // El logo viene de la base y cada salón sube el suyo: no hay forma de
          // saber de qué dominio saldrá, así que no se optimiza en el servidor.
          unoptimized
        />
      ) : (
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] bg-primary text-sm font-bold text-primary-foreground"
        >
          {inicial}
        </span>
      )}
      <span className="truncate font-semibold tracking-tight">{nombre}</span>
      {sitio ? (
        <ArrowLeft className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      ) : null}
    </>
  );

  return (
    <div className="mb-10 flex items-center justify-between gap-4 border-b border-border pb-5">
      {sitio ? (
        <a
          href={sitio}
          className="group flex min-w-0 items-center gap-3 transition-colors hover:text-primary"
          title={`Ir al sitio de ${nombre}`}
        >
          {contenido}
        </a>
      ) : (
        <div className="flex min-w-0 items-center gap-3">{contenido}</div>
      )}
    </div>
  );
}
