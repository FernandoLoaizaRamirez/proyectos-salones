"use client";

/**
 * DE QUÉ EVENTO SON ESTOS PASES.
 *
 * Los pases eran de los últimos rincones con los nombres quemados de la
 * muestra: el boleto de una boda real decía "Boda Ana & Rodrigo". Aquí la app
 * aprende a leer el código del evento (`?e=`, igual que todas las apps) y a
 * sacar sus textos de la colección `invitacion`, la misma que captura el salón
 * en su panel para la invitación digital.
 *
 * Reglas de la carga (calcadas de `apps/photobooth/src/lib/evento-real.ts`):
 *   · UNA sola lectura con `listar`, nada de suscribirse: el nombre de una
 *     boda no cambia mientras el invitado mira su boleto, y sondear gastaría
 *     batería y datos del teléfono para nada.
 *   · NUNCA lanza: sin red, sin servidor o sin datos capturados, se cae a los
 *     textos de la muestra. Un boleto que no abre camino a la fiesta es peor
 *     que uno con los nombres de ejemplo.
 */
import * as React from "react";
import {
  COLECCION_INVITACION,
  fechaCorta,
  fechaLarga,
  invitacionDe,
  invitacionTieneContenido,
  nombresInvitacion,
} from "@salones/core";
import { eventoActual, obtenerSync, esVitrina } from "@salones/sync";
import { evento } from "@/lib/evento";

/** Los textos del evento que pintan el boleto y los mensajes. */
export type TextosEvento = {
  nombre: string;
  /** "sábado 20 de marzo de 2027" — para el mensaje de WhatsApp. */
  fecha: string;
  /** "20 de marzo de 2027" — el pie del boleto. */
  fechaCorta: string;
};

/** Los textos de la muestra, el respaldo de todo lo demás. */
const TEXTOS_DEMO: TextosEvento = {
  nombre: evento.nombre,
  fecha: evento.fecha,
  fechaCorta: evento.fechaCorta,
};

type DatosEvento = { textos: TextosEvento; conDatosReales: boolean };

/**
 * La consulta se hace UNA vez por código y se comparte entre todos los
 * componentes que usen el hook (la página del boleto, la pantalla del
 * organizador): sin esta caché, cada uno dispararía su propia lectura de la
 * misma colección.
 */
const consultas = new Map<string, Promise<DatosEvento>>();

function consultar(codigo: string): Promise<DatosEvento> {
  let p = consultas.get(codigo);
  if (!p) {
    p = (async () => {
      try {
        const items = await obtenerSync().listar(codigo, COLECCION_INVITACION);
        const inv = invitacionDe(codigo, items);
        if (inv && invitacionTieneContenido(inv)) {
          return {
            textos: {
              // El "nuestro evento" final es para la invitación a medio
              // capturar (fecha sin nombres): mejor un boleto que dice
              // "nuestro evento" que uno con un hueco o con la muestra.
              nombre: nombresInvitacion(inv).trim() || "nuestro evento",
              fecha: fechaLarga(inv.fechaISO),
              fechaCorta: fechaCorta(inv.fechaISO),
            },
            conDatosReales: true,
          };
        }
      } catch {
        // Sin red o sin servidor: se sigue con la muestra, que nunca falla.
      }
      return { textos: TEXTOS_DEMO, conDatosReales: false };
    })();
    consultas.set(codigo, p);
  }
  return p;
}

/**
 * El evento del que son estos pases: su código, los textos que pintan el
 * boleto y si esos textos son de verdad (capturados por el salón) o los de la
 * muestra.
 */
export function useEventoReal(): {
  codigo: string;
  textos: TextosEvento;
  conDatosReales: boolean;
} {
  const [estado, setEstado] = React.useState<{
    codigo: string;
    textos: TextosEvento;
    conDatosReales: boolean;
  }>({ codigo: "demo", textos: TEXTOS_DEMO, conDatosReales: false });

  React.useEffect(() => {
    let vivo = true;
    // El código se lee tras montar (viene del enlace) para que el primer
    // render del cliente coincida con el del servidor y no se rompa la
    // hidratación. En la vitrina no hay nada más que hacer: el estado inicial
    // YA es la muestra.
    const codigo = eventoActual();
    if (esVitrina(codigo)) return;
    // El código se fija de inmediato: aunque la lectura tarde o falle, los
    // enlaces que se arman con él (el pase, el portal) tienen que apuntar al
    // evento correcto.
    setEstado((prev) => ({ ...prev, codigo }));
    void consultar(codigo).then((datos) => {
      if (vivo) setEstado({ codigo, ...datos });
    });
    return () => {
      vivo = false;
    };
  }, []);

  return estado;
}
