"use client";

/**
 * SIN CÓDIGO DE EVENTO, EL VISITANTE ESTRENA SU PROPIA VITRINA.
 *
 * Copia de `apps/portal/src/components/estrena-vitrina.tsx` — mismo problema,
 * mismo remedio: quien abre esta app a pelo (sin `?e=`) caía en el "demo"
 * COMPARTIDO, la misma tanda de 8 invitados y sus respuestas para CUALQUIERA
 * que la abra así, sin importar quién sea ni cuándo. Dos visitantes distintos
 * —dos demos distintas de Fernando, o Fernando y un curioso que encontró el
 * enlace— terminaban leyendo y sobrescribiendo las MISMAS filas ("IN-1042" es
 * el id fijo de Ana Herrera Medina para todo el mundo).
 *
 * ⚠️ RECARGA COMPLETA (`window.location.replace`), NO `router.replace` de
 * Next.js. Con el router de Next, `RsvpCliente` ya se había montado con la
 * URL vieja (sin `?e=`) y su efecto de carga —que corre UNA vez, con
 * dependencias vacías— ya había capturado `eventoActual() === "demo"` antes
 * de que el redirect terminara. El navegador cambiaba a `?e=demo-xxxxxx`,
 * pero el componente se quedaba suscrito al "demo" compartido para siempre:
 * la URL prometía una vitrina propia y la pantalla seguía enseñando (y
 * escribiendo en) la de todos. Verificado en vivo — con `router.replace` la
 * pantalla mostraba las respuestas del "demo" compartido bajo una URL que
 * decía tener vitrina propia. Con una recarga de verdad, `RsvpCliente` nace
 * de cero con `?e=` ya puesto, y su efecto arranca con el código correcto
 * desde el primer render.
 *
 * Aquí no hace falta leer `searchParams` en el servidor: alcanza con mirar la
 * URL del navegador al montar.
 */
import * as React from "react";
import { estrenarVitrina } from "@salones/sync";

export function EstrenaVitrina() {
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("e")) return;
    const codigo = estrenarVitrina();
    // Sin poder guardar (modo privado) se queda en el demo compartido: es lo
    // que había antes, y mejor eso que un bucle de redirecciones.
    if (codigo === "demo") return;
    window.location.replace(`/?e=${encodeURIComponent(codigo)}`);
  }, []);

  return null;
}
