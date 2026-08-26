"use client";

/**
 * DE QUÉ EVENTO ES ESTE PHOTOBOOTH.
 *
 * ⚠️ DEPRECADO: este molde ya se generalizó como `useEventoReal` de
 * `@salones/experiencia` (con un arreglo encima: el fallo de red ya no se
 * cachea para toda la sesión). Esta copia se retira cuando el photobooth
 * adopte la cáscara compartida (Fase 4 del plan del rediseño). NO le añadas
 * capacidades aquí: cualquier mejora va en el paquete.
 *
 * El photobooth era el último silo de la suite: no sabía de qué evento era, y
 * los marcos de una boda real decían "Ana & Rodrigo" — los nombres quemados de
 * la muestra. Aquí aprende a leer el código del evento (`?e=`, igual que todas
 * las apps) y a sacar sus textos de la colección `invitacion`, la misma que
 * captura el salón en su panel para la invitación digital.
 *
 * Reglas de la carga (calcadas de `apps/invitaciones/src/lib/cargar.ts`):
 *   · UNA sola lectura con `listar`, nada de suscribirse: los nombres de una
 *     boda no cambian mientras el invitado se toma la foto, y sondear gastaría
 *     batería y datos del teléfono para nada.
 *   · NUNCA lanza: sin red, sin servidor o sin datos capturados, se cae a los
 *     textos de la muestra. Un photobooth que no abre en plena fiesta es peor
 *     que uno con los nombres de ejemplo.
 */
import * as React from "react";
import {
  COLECCION_INVITACION,
  fechaPuntos,
  invitacionDe,
  invitacionTieneContenido,
  nombresInvitacion,
} from "@salones/core";
import { eventoActual, obtenerSync, esVitrina } from "@salones/sync";
import { evento, type TextosMarcos } from "@/lib/photobooth";

/** Los textos de la muestra, el respaldo de todo lo demás. */
const TEXTOS_DEMO: TextosMarcos = {
  nombre: evento.nombre,
  fecha: evento.fecha,
  hashtag: evento.hashtag,
};

/**
 * Un hashtag de respaldo a partir del nombre: "Ana & Rodrigo" → "AnaRodrigo".
 * Sin espacios, sin el "&" y sin acentos, porque va en nombres de archivo y en
 * el texto de compartir, donde un hashtag con espacios se rompe.
 */
function hashtagDeNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}

type DatosEvento = { textos: TextosMarcos; conDatosReales: boolean };

/**
 * La consulta se hace UNA vez por código y se comparte entre todos los
 * componentes que usen el hook (el encabezado, la pantalla, el pie): sin esta
 * caché, cada uno dispararía su propia lectura de la misma colección.
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
          const nombre = nombresInvitacion(inv);
          return {
            textos: {
              nombre,
              fecha: fechaPuntos(inv.fechaISO),
              // Con hashtag capturado se usa ese; si no, se arma del nombre.
              // El "evento" final es para no dejar un hueco en el nombre del
              // archivo si la invitación trae fecha pero todavía no nombres.
              hashtag: inv.hashtag.trim() || hashtagDeNombre(nombre) || "evento",
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
 * El evento del que es este photobooth: su código, los textos de sus marcos y
 * si esos textos son de verdad (capturados por el salón) o los de la muestra.
 */
export function useEventoReal(): {
  codigo: string;
  textos: TextosMarcos;
  conDatosReales: boolean;
} {
  const [estado, setEstado] = React.useState<{
    codigo: string;
    textos: TextosMarcos;
    conDatosReales: boolean;
  }>({ codigo: "demo", textos: TEXTOS_DEMO, conDatosReales: false });

  React.useEffect(() => {
    let vivo = true;
    // El código se lee tras montar (viene del enlace) para que el primer
    // render del cliente coincida con el del servidor y no se rompa la
    // hidratación. En la vitrina no hay nada más que hacer: el estado inicial
    // YA es la muestra.
    const codigo = eventoActual();
    // El código se fija SIEMPRE y lo PRIMERO: aunque la lectura tarde o falle,
    // el botón de guardar en el álbum tiene que apuntar al evento correcto.
    //
    // ⚠️ Antes esto iba DESPUÉS del `return` de las vitrinas, y por eso en la
    // vitrina propia de cada visitante (`demo-xxxxxx`) el código se quedaba en
    // el "demo" compartido del estado inicial: el photobooth decía "Ya está en
    // el álbum del evento" y la foto caía en el montón común, así que el dueño
    // abría SU álbum y no estaba. Lo que no hace falta en una vitrina es
    // CONSULTAR sus textos —la muestra ya es el estado inicial—, no fijar el
    // código.
    setEstado((prev) => ({ ...prev, codigo }));
    if (esVitrina(codigo)) return;
    void consultar(codigo).then((datos) => {
      if (vivo) setEstado({ codigo, ...datos });
    });
    return () => {
      vivo = false;
    };
  }, []);

  return estado;
}
