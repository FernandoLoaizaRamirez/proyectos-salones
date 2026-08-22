"use client";

/**
 * LA VITRINA DEL VISITANTE, YA PUESTA EN EL ENLACE.
 * ---------------------------------------------------------------------------
 * EL PROBLEMA QUE RESUELVE: una app que se abre sin `?e=` no sabe todavía si el
 * servidor admite vitrinas por visitante. Lo pregunta sin bloquear la pantalla
 * y **aplica la respuesta en la SIGUIENTE carga** (a propósito: bloquear la
 * primera pintada por una consulta de red sería peor). Consecuencia para la
 * venta: la PRIMERA visita a cada app cae en el "demo" compartido y se ve
 * vacía, y eso pasa una vez por app. Justo la primera impresión del salón.
 *
 * LA SALIDA: que el catálogo mande el código en el enlace. `eventoActual()` de
 * @salones/sync usa el `?e=` tal cual y se salta la sonda, así que el visitante
 * entra directo a su vitrina, ya sembrada, sin recargar.
 *
 * REGALO: el mismo código va en TODOS los enlaces del catálogo, así que lo que
 * el visitante arme en "Acomodo de mesas" le aparece luego en "¿En qué mesa me
 * toca?". Antes cada app era un mundo aparte.
 *
 * OJO CON EL ALMACENAMIENTO: el catálogo vive en otro dominio que las apps, así
 * que NO comparte `localStorage` con ellas. Por eso el código se inventa aquí y
 * viaja por la dirección; no se puede "leer el que ya tenga la app".
 */

import * as React from "react";
import { PREFIJO_VITRINA } from "@salones/sync";
import { QR } from "@/components/qr";

/** Misma llave que usa @salones/sync, para que el nombre no se invente dos veces. */
const LLAVE = "salones:vitrina";

/** El código de este visitante. Se inventa una vez y se recuerda. */
function leerOInventar(): string | null {
  try {
    const guardada = window.localStorage.getItem(LLAVE);
    if (guardada && /^[a-z0-9-]{1,60}$/i.test(guardada)) return guardada;
    const nueva = PREFIJO_VITRINA + Math.random().toString(36).slice(2, 8);
    window.localStorage.setItem(LLAVE, nueva);
    return nueva;
  } catch {
    // Navegación privada o almacenamiento bloqueado: sin código, y los enlaces
    // se quedan como estaban. Se pierde la mejora, no la demo.
    return null;
  }
}

/**
 * Devuelve el código, o `null` mientras no se sepa.
 *
 * Empieza en `null` A PROPÓSITO: en el servidor no hay `localStorage`, y si el
 * primer dibujado no coincidiera con el del servidor React se quejaría de
 * hidratación. Se rellena justo después de montar.
 */
export function useVitrina(): string | null {
  const [vitrina, setVitrina] = React.useState<string | null>(null);
  React.useEffect(() => {
    setVitrina(leerOInventar());
  }, []);
  return vitrina;
}

/** La misma dirección, con el código pegado. Sin código, la deja intacta. */
export function conVitrina(url: string, vitrina: string | null): string {
  if (!vitrina) return url;
  return `${url}${url.includes("?") ? "&" : "?"}e=${vitrina}`;
}

/**
 * Enlace a una demo. Antes de montar apunta a la dirección pelada, que es
 * exactamente lo que había hasta ahora: si algo fallara, se degrada al
 * comportamiento viejo en vez de romperse.
 */
export function EnlaceDemo({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const vitrina = useVitrina();
  return (
    <a href={conVitrina(href, vitrina)} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/**
 * El QR de la portada, apuntando a la vitrina de quien mira la pantalla.
 *
 * Es el momento estrella del catálogo ("apunta la cámara de tu celular"), y el
 * que más sufría el problema: el teléfono que escanea NUNCA ha abierto esa app,
 * así que siempre caía en la primera visita vacía.
 */
export function QRDemo({ value, size }: { value: string; size?: number }) {
  const vitrina = useVitrina();
  return <QR value={conVitrina(value, vitrina)} size={size} />;
}
