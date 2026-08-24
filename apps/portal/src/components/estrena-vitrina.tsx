"use client";

/**
 * SIN CÓDIGO DE EVENTO, EL VISITANTE ESTRENA SU PROPIA VITRINA.
 *
 * Quien escribe la dirección del portal a mano —un salón al que le pasaron el
 * enlace, alguien que lo recuerda— caía en `?e=demo`, la vitrina COMPARTIDA.
 * Y esa se enseña medio vacía a propósito: sus ejemplos no se siembran porque
 * los identificadores de la base son globales y chocarían entre visitantes, así
 * que el muro sale sin mensajes y el álbum con fotos sueltas de pruebas. La
 * peor primera impresión posible, justo para quien llega por su cuenta.
 *
 * El catálogo y el sitio del salón ya reparten un código propio en sus enlaces;
 * esto cierra la última puerta que no lo hacía.
 *
 * Se hace en el CLIENTE porque la vitrina vive en `localStorage` y el servidor
 * no la conoce. `replace` y no `push`: el paso es de trámite y no debe quedar
 * en el historial (el botón de atrás llevaría otra vez aquí, en bucle).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { estrenarVitrina } from "@salones/sync";

export function EstrenaVitrina() {
  const router = useRouter();

  React.useEffect(() => {
    const codigo = estrenarVitrina();
    // Sin poder guardar (modo privado) se queda en el demo compartido: es lo
    // que había antes, y mejor eso que un bucle de redirecciones.
    if (codigo === "demo") return;
    router.replace(`/?e=${encodeURIComponent(codigo)}`);
  }, [router]);

  return null;
}
