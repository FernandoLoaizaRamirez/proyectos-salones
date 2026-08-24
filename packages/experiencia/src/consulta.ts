"use client";

/**
 * EL ESQUELETO COMPARTIDO de los hooks de este paquete: una consulta por
 * código de evento, con las reglas de la casa escritas UNA sola vez.
 *
 * Las reglas (heredadas del molde `evento-real.ts` del photobooth, con un
 * arreglo encima):
 *   · UNA consulta por código, compartida entre todos los componentes que
 *     monten el hook (single-flight: cada hook aporta SU Map de módulo).
 *   · El FALLO no se cachea: si la consulta devuelve null (red caída, servidor
 *     ausente), la entrada del Map se borra y el siguiente montaje reintenta.
 *     El molde original cacheaba el fallo para toda la sesión — el invitado
 *     abría la app en la zona muerta del salón y se quedaba sin marca toda la
 *     noche aunque la red volviera.
 *   · El código se lee TRAS montar (viene del enlace) para no romper la
 *     hidratación, y se fija SIEMPRE — también en vitrinas: los enlaces que el
 *     consumidor arme deben llevar la vitrina del visitante (`demo-xxxxxx`),
 *     no el "demo" compartido.
 *   · En vitrinas no se consulta nada: el dato inicial YA es la muestra.
 */
import * as React from "react";
import { esVitrina, eventoActual } from "@salones/sync";
import { consultaUnica } from "./consulta-unica";

export { consultaUnica };

/**
 * El ciclo de vida común: estado inicial de muestra → código real tras montar
 * → dato del servidor si llega. `consultar` devuelve null cuando no hay nada
 * mejor que la muestra (y entonces la muestra se queda).
 */
export function useConsultaEvento<T>(
  inicial: T,
  mapa: Map<string, Promise<T | null>>,
  consultar: (codigo: string) => Promise<T | null>,
): { codigo: string; dato: T } {
  const [estado, setEstado] = React.useState<{ codigo: string; dato: T }>({
    codigo: "demo",
    dato: inicial,
  });

  // A través de un ref para que una lambda nueva por render no re-dispare el
  // efecto ni rompa el single-flight (el Map es la identidad, no la función).
  const consultarRef = React.useRef(consultar);
  consultarRef.current = consultar;

  React.useEffect(() => {
    let vivo = true;
    const codigo = eventoActual();
    // El código se fija de inmediato: aunque la consulta tarde o falle, los
    // enlaces de la pantalla tienen que apuntar al evento correcto.
    setEstado((prev) => ({ ...prev, codigo }));
    if (esVitrina(codigo)) return;
    void consultaUnica(mapa, codigo, () => consultarRef.current(codigo)).then((dato) => {
      if (vivo && dato !== null) setEstado({ codigo, dato });
    });
    return () => {
      vivo = false;
    };
    // El Map viene del módulo del hook (estable) y la función va por ref: el
    // efecto corre una vez por montaje, como el molde original.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return estado;
}
