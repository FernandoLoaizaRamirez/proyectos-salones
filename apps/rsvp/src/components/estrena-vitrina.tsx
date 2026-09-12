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
 * Aquí no hace falta leer `searchParams` en el servidor: alcanza con mirar la
 * URL del navegador al montar. `replace` y no `push`, para que el botón de
 * atrás no vuelva a este paso y quede en bucle.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { estrenarVitrina } from "@salones/sync";

export function EstrenaVitrina() {
  const router = useRouter();

  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("e")) return;
    const codigo = estrenarVitrina();
    // Sin poder guardar (modo privado) se queda en el demo compartido: es lo
    // que había antes, y mejor eso que un bucle de redirecciones.
    if (codigo === "demo") return;
    router.replace(`/?e=${encodeURIComponent(codigo)}`);
  }, [router]);

  return null;
}
