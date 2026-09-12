"use client";

/**
 * SIN CÓDIGO DE EVENTO, EL VISITANTE ESTRENA SU PROPIA VITRINA.
 *
 * Copia de `apps/rsvp/src/components/estrena-vitrina.tsx` (que a su vez copia
 * la de `apps/portal`) — mismo problema, mismo remedio: quien abre esta app a
 * pelo (sin `?e=`) caía en el "demo" COMPARTIDO, y los 8 invitados de muestra
 * tienen ids FIJOS ("SR-1042"…) — los mismos para cualquiera que la abra, sin
 * importar quién ni cuándo. Como la llave primaria de `items` es GLOBAL
 * (0001_estado_actual.sql), dos visitantes distintos leían y sobrescribían la
 * MISMA fila de Ana Herrera Medina.
 *
 * ⚠️ RECARGA COMPLETA (`window.location.replace`), NO `router.replace` de
 * Next.js. Con el router de Next, `PasesCliente` ya se había montado con la
 * URL vieja (sin `?e=`) y su efecto de carga —que corre UNA vez, con
 * dependencias vacías— ya había capturado `eventoActual() === "demo"` antes
 * de que el redirect terminara: el navegador cambiaba a `?e=demo-xxxxxx`,
 * pero la app se quedaba suscrita al "demo" compartido para siempre (mismo
 * defecto encontrado y verificado en vivo en RSVP). Con una recarga de
 * verdad, `PasesCliente` nace de cero con `?e=` ya puesto.
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
