"use client";

/**
 * PANEL DE QUIEN ORGANIZA — el bloque que explica las DOS llaves del evento.
 *
 * POR QUÉ EXISTE (14 ago 2026):
 *   El sistema lleva desde la migración 0009 trabajando con dos enlaces: el del
 *   invitado (`?e=…`, el del QR) y el privado del anfitrión (`?e=…&a=…`, el
 *   único que permite borrar). El candado es de verdad y está en la base de
 *   datos. Pero **ninguna pantalla lo contaba**: el anfitrión abría su enlace y
 *   lo único que notaba era que le salían botones de basura en las fotos. No
 *   tenía forma de saber cuál de los dos enlaces estaba a punto de pegar en el
 *   grupo de WhatsApp de la boda.
 *
 *   Un anfitrión que comparte su enlace privado por error le da a 200 invitados
 *   permiso para vaciar el álbum. El candado no lo puede impedir: la llave es
 *   correcta. Por eso esto es una pantalla, y no una regla más en el servidor.
 *
 * DOS DECISIONES QUE PARECEN DETALLES Y NO LO SON:
 *
 *   1. El enlace privado sale TAPADO. Este álbum se proyecta en la pantalla
 *      grande durante la cena; si el anfitrión abre su enlace ahí, la llave
 *      quedaría escrita en la pared para que cualquiera la fotografíe. Se
 *      enseña solo cuando alguien decide enseñarla.
 *
 *   2. Hay un botón para SALIR. El enlace del anfitrión se abre a menudo en una
 *      pantalla prestada —la del salón, la del DJ, un proyector— y la llave se
 *      recuerda en ese navegador. Sin una forma de olvidarla, se queda ahí
 *      después de la boda.
 */

import * as React from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  LogOut,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Button, cn } from "@salones/ui";
import {
  claveAnfitrion,
  espacioDelEvento,
  estaConectado,
  esAnfitrion,
  eventoActual,
  olvidarClaveAnfitrion,
  sufijoAnfitrion,
  sufijoEvento,
  textoDeTamano,
  type EspacioEvento,
} from "@salones/sync";

/**
 * Cuánto espacio lleva usado el álbum.
 *
 * Solo lo ve quien organiza, que es el único que puede hacer algo si se llena
 * (pedir más espacio). A un invitado no le sirve de nada y le mete una
 * preocupación que no es suya.
 *
 * Si no se puede saber (modo local, sin red, o la migración 0018 todavía sin
 * aplicar) **no se dibuja nada**: un contador en blanco confunde menos que uno
 * inventado, y uno inventado en la pantalla de una boda es peor todavía.
 */
function Contador({ espacio }: { espacio: EspacioEvento }) {
  const porcentaje = espacio.cupo > 0 ? Math.min(100, (espacio.usado / espacio.cupo) * 100) : 0;
  // Se avisa ANTES de que sea un problema: al 90% ya no da tiempo a reaccionar
  // en mitad de una fiesta.
  const apretado = porcentaje >= 75;

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-border bg-background p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <HardDrive className="size-4 text-primary" /> Espacio del álbum
        </h4>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{textoDeTamano(espacio.usado)}</span> de{" "}
          {textoDeTamano(espacio.cupo)}
        </p>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(porcentaje)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Espacio usado del álbum"
      >
        <div
          className={cn("h-full rounded-full transition-all", apretado ? "bg-amber-500" : "bg-primary")}
          style={{ width: `${Math.max(porcentaje, 1)}%` }}
        />
      </div>

      {apretado ? (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-500">
          Queda poco espacio. Cuando se llene, los invitados dejarán de poder subir: pide más antes
          del evento.
        </p>
      ) : null}
    </div>
  );
}

/** Una fila "esto es un enlace, cópialo": etiqueta, dirección y botón. */
function FilaEnlace({
  icono,
  titulo,
  descripcion,
  url,
  tapado = false,
  tono,
}: {
  icono: React.ReactNode;
  titulo: string;
  descripcion: React.ReactNode;
  url: string;
  /** Si es true, la dirección arranca oculta y hay que pulsar para verla. */
  tapado?: boolean;
  tono: "invitado" | "privado";
}) {
  const [copiado, setCopiado] = React.useState(false);
  const [visible, setVisible] = React.useState(!tapado);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin portapapeles (navegador viejo o sin permiso): se destapa la
      // dirección para que al menos se pueda copiar a mano. Quedarse callado
      // aquí sería dejar al anfitrión sin su enlace y sin saber por qué.
      setVisible(true);
    }
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border p-4",
        tono === "privado" ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-background",
      )}
    >
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        {icono}
        {titulo}
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code
          className={cn(
            "min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs",
            !visible && "select-none tracking-widest text-muted-foreground",
          )}
        >
          {visible ? url : "••••••••••••••••••••••••••••"}
        </code>
        {tapado ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar el enlace" : "Mostrar el enlace"}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {visible ? "Ocultar" : "Mostrar"}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={copiar}>
          {copiado ? (
            <>
              <Check className="size-4" /> ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="size-4" /> Copiar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/** Lo que hay que saber del visitante; sale del enlace, no del servidor. */
type Quien = {
  anfitrion: boolean;
  /** Hay llave DE VERDAD (no es la demo pública ni el modo de un solo aparato). */
  conLlave: boolean;
  urlInvitado: string;
  urlPrivada: string;
};

export function PanelAnfitrion() {
  // Arranca en "invitado" a propósito: todo esto depende del enlace y del
  // navegador, que en el servidor no existen, así que la primera pintada tiene
  // que coincidir con la del servidor o React se queja. Y si algo fallara, lo
  // que se esconde es el panel —nunca al revés—.
  const [quien, setQuien] = React.useState<Quien | null>(null);
  /** `null` mientras no se sepa, y también si no se puede saber. */
  const [espacio, setEspacio] = React.useState<EspacioEvento | null>(null);

  React.useEffect(() => {
    const evento = eventoActual();
    setQuien({
      anfitrion: esAnfitrion(evento),
      conLlave: estaConectado() && claveAnfitrion(evento) !== null,
      urlInvitado: `${window.location.origin}/${sufijoEvento()}`,
      urlPrivada: `${window.location.origin}/${sufijoAnfitrion(evento)}`,
    });

    let vivo = true;
    void espacioDelEvento(evento).then((e) => {
      if (vivo) setEspacio(e);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * Olvida la llave en ESTE navegador y se va al enlace de invitado. Las dos
   * cosas hacen falta: si solo se olvidara, la llave sigue en la dirección
   * (`&a=…`) y `claveAnfitrion` la volvería a guardar en cuanto algo la lea.
   */
  const salir = () => {
    const evento = eventoActual();
    const destino = `${window.location.origin}/${sufijoEvento()}`;
    olvidarClaveAnfitrion(evento);
    window.location.replace(destino);
  };

  if (!quien?.anfitrion) return null;
  const { conLlave, urlInvitado, urlPrivada } = quien;

  return (
    <section
      aria-label="Panel de quien organiza"
      className="rounded-[var(--radius)] border border-border bg-card p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4 text-primary" />
            Estás viendo el álbum como quien organiza
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {conLlave ? (
              <>
                {/* "recuerdos" y no "fotos y videos": este evento puede no tener
                    contratado el paquete de video, y nombrarlo aquí sonaría a que
                    se puede subir. */}
                Solo tú puedes quitar recuerdos de este álbum. Los invitados ven exactamente lo mismo
                que tú, pero sin el botón para quitarlos.
              </>
            ) : (
              // En la vitrina pública NO es cierto que solo tú puedas quitar
              // fotos: puede cualquiera que entre. Decirlo aquí sería vender una
              // seguridad que esta pantalla concreta no tiene.
              <>Así es como se ve el álbum para quien organiza el evento.</>
            )}
          </p>
        </div>
        {conLlave ? (
          <Button variant="outline" size="sm" onClick={salir}>
            <LogOut className="size-4" /> Salir de este modo
          </Button>
        ) : null}
      </div>

      {conLlave ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <FilaEnlace
              tono="invitado"
              icono={<Users className="size-4 text-primary" />}
              titulo="Enlace para los invitados"
              descripcion="Es el mismo del código QR. Compártelo con toda confianza: con él se ven y se suben fotos, pero no se puede quitar nada."
              url={urlInvitado}
            />
            <FilaEnlace
              tono="privado"
              tapado
              icono={<ShieldAlert className="size-4 text-amber-600 dark:text-amber-500" />}
              titulo="Tu enlace privado"
              descripcion={
                <>
                  <strong>No lo compartas ni lo proyectes.</strong> Quien lo tenga puede borrar las
                  fotos de todos los invitados, y lo borrado no se recupera.
                </>
              }
              url={urlPrivada}
            />
          </div>

          {espacio ? <Contador espacio={espacio} /> : null}

          <p className="mt-4 text-xs text-muted-foreground">
            Si abriste tu enlace en una pantalla prestada —la del salón, la del DJ, un proyector—
            pulsa <strong>Salir de este modo</strong> al terminar: ese navegador deja de recordar tu
            llave.
          </p>
        </>
      ) : (
        // Demostración pública (evento "demo") o modo de un solo aparato: aquí no
        // hay llave que enseñar, y fabricar una de mentira solo confundiría. Se
        // aprovecha para contar cómo funciona en un evento de verdad, que es
        // justo lo que el salón viene a entender a esta pantalla.
        <p className="mt-4 rounded-[var(--radius)] border border-dashed border-border p-4 text-sm text-muted-foreground">
          Esto es la demostración, así que aquí cualquiera puede quitar fotos. En un evento real hay{" "}
          <strong>dos enlaces</strong>: el del código QR, que reciben todos los invitados y solo
          sirve para ver y subir; y uno privado que recibes <strong>solo tú</strong>, que es el único
          que permite quitar del álbum.
        </p>
      )}
    </section>
  );
}
