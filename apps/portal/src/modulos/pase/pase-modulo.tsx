"use client";

/**
 * MÓDULO "MI PASE" montado DENTRO del portal.
 *
 * El invitado ve su boleto con QR sin salir de la experiencia: con perfil de
 * enlace personal aparece solo; con solo su nombre, aparece si coincide sin
 * duda con la lista de la puerta (ver `miPase` en ./lib — el QR abre la
 * entrada, así que en la duda no se enseña el de otro).
 *
 * LA MESA VIVA: igual que la página del pase de la puerta, la mesa del acomodo
 * real MANDA sobre la que se congeló al repartir el pase — el organizador
 * reacomoda hasta el final. Una lectura al abrir, sin suscripción.
 *
 * En la vitrina sin perfil se enseña un pase de MUESTRA, dicho con todas sus
 * letras: así el salón ve el boleto aunque nadie se haya presentado.
 */
import * as React from "react";
import { QrCode } from "lucide-react";
import { EmptyState } from "@salones/ui";
import {
  COLECCION_ACOMODO,
  COLECCION_MESAS,
  buscarEnAcomodo,
  mesaDe,
  normalizarAcomodoCrudo,
  normalizarMesasCrudas,
  normalizarNombre,
} from "@salones/core";
import { obtenerSync, esVitrina } from "@salones/sync";
import { usePerfil } from "@/lib/perfil";
import { SEMILLA_ACOMODO, SEMILLA_MESAS } from "@/modulos/mesas/lib";
import {
  COLECCION_PASES,
  PASES_MUESTRA,
  PASE_EJEMPLO,
  miPase,
  normalizarPasesCrudos,
  type PaseInvitado,
} from "./lib";
import { BoletoPase } from "./boleto-pase";

export function PaseModulo({ evento, nombreEvento }: { evento: string; nombreEvento: string }) {
  const perfil = usePerfil(evento);
  const [pases, setPases] = React.useState<PaseInvitado[] | "cargando">("cargando");
  /** La mesa según el acomodo real, si se encontró sin duda. */
  const [mesaViva, setMesaViva] = React.useState<string | null>(null);

  // La lista de la puerta: una lectura al abrir. En la vitrina vacía, la
  // muestra; jamás se escribe nada al almacén.
  React.useEffect(() => {
    let vivo = true;
    obtenerSync()
      .listar(evento, COLECCION_PASES)
      .then((items) => {
        if (!vivo) return;
        const reales = normalizarPasesCrudos(items);
        setPases(reales.length === 0 && esVitrina(evento) ? PASES_MUESTRA : reales);
      })
      .catch(() => {
        if (vivo) setPases(esVitrina(evento) ? PASES_MUESTRA : []);
      });
    return () => {
      vivo = false;
    };
  }, [evento]);

  const mio = React.useMemo(
    () => (pases === "cargando" ? null : miPase(perfil, pases)),
    [perfil, pases],
  );

  // En la vitrina, si no hay pase propio se enseña el de muestra (etiquetado).
  const esMuestra = !mio && esVitrina(evento);
  const pase = mio ?? (esMuestra ? PASE_EJEMPLO : null);

  // La mesa del acomodo real corrige la congelada en el pase (solo el propio).
  React.useEffect(() => {
    setMesaViva(null);
    if (!mio) return;
    let vivo = true;
    (async () => {
      try {
        const sync = obtenerSync();
        const [mesasCrudas, acomodoCrudo] = await Promise.all([
          sync.listar(evento, COLECCION_MESAS),
          sync.listar(evento, COLECCION_ACOMODO),
        ]);
        if (!vivo) return;
        let mesas = normalizarMesasCrudas(mesasCrudas);
        let acomodo = normalizarAcomodoCrudo(acomodoCrudo);
        if (esVitrina(evento) && mesas.length === 0 && acomodo.length === 0) {
          mesas = SEMILLA_MESAS;
          acomodo = SEMILLA_ACOMODO;
        }
        if (!mesas.length || !acomodo.length) return;
        // Mismo criterio que la página del pase de la puerta: una única
        // coincidencia, o una única EXACTA sin acentos ni mayúsculas.
        const candidatos = buscarEnAcomodo(mio.nombre, acomodo);
        const exactos = candidatos.filter(
          (c) => normalizarNombre(c.nombre) === normalizarNombre(mio.nombre),
        );
        const unico =
          candidatos.length === 1 ? candidatos[0] : exactos.length === 1 ? exactos[0] : null;
        if (!unico) return;
        const mesa = unico.mesaId ? mesaDe(unico, mesas) : null;
        if (mesa) setMesaViva(mesa.nombre);
      } catch {
        /* sin red: el boleto se queda con la mesa que traía el pase */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [evento, mio]);

  if (pases === "cargando") return null;

  if (!pase) {
    return (
      <EmptyState
        icon={<QrCode className="size-8" />}
        title={
          pases.length === 0
            ? "Los pases están en camino"
            : "Aún no encontramos un pase a tu nombre"
        }
        description={
          pases.length === 0
            ? "Los organizadores los reparten antes de la fiesta, por WhatsApp o en este portal. Vuelve a asomarte más cerca del día."
            : "Si te llegó tu pase por WhatsApp, ábrelo desde ese enlace. Y si crees que falta el tuyo, pregunta a los organizadores."
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      {esMuestra ? (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Así se ve el pase de un invitado — cada quien recibe el suyo, con su nombre y su mesa.
        </p>
      ) : (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Tu pase para {nombreEvento}
        </p>
      )}

      <BoletoPase pase={mesaViva !== null ? { ...pase, mesa: mesaViva } : pase} />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Muestra el código en la entrada del evento. Puedes guardar una captura de pantalla: el
        pase funciona igual sin conexión.
      </p>
    </div>
  );
}
