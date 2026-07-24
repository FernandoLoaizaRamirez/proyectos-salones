import { cn } from "../lib/cn";

/**
 * El aviso que se pone JUNTO al botón con el que un invitado entrega algo suyo
 * (una foto, un mensaje, su nombre, un video).
 *
 * POR QUÉ AQUÍ Y NO EN UN RINCÓN DEL PIE DE PÁGINA:
 *   Para que el consentimiento valga, la persona tiene que poder enterarse
 *   ANTES de entregar sus datos, y en el momento en que los entrega. Un enlace
 *   escondido abajo del todo no cumple esa función. Por eso este aviso vive
 *   pegado al botón de enviar.
 *
 * Es deliberadamente pequeño y sin fricción: no es una casilla que haya que
 * marcar. Para los datos que aquí se manejan (nombre, mensaje, fotos del propio
 * evento; nada sensible) el consentimiento tácito con aviso previo es la figura
 * habitual. Si algún día se recogen datos sensibles, esto tendría que pasar a
 * ser una casilla expresa.
 */
export function AvisoParticipacion({
  accion = "participar",
  urlLegal,
  className,
}: {
  /** Qué está a punto de hacer la persona: "subir tus fotos", "firmar", … */
  accion?: string;
  /** Dónde viven los documentos. Por defecto, los del catálogo. */
  urlLegal?: string;
  className?: string;
}) {
  const base =
    urlLegal ??
    process.env.NEXT_PUBLIC_LEGAL_URL ??
    "https://suite-salones.vercel.app/legal";

  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      Al {accion} aceptas el{" "}
      <a
        href={`${base}/privacidad`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        aviso de privacidad
      </a>{" "}
      y el{" "}
      <a
        href={`${base}/imagen`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        uso de tu imagen
      </a>{" "}
      para este evento. Puedes pedir que se retire lo que subas, cuando quieras.
    </p>
  );
}
