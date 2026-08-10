import { cn } from "../lib/cn";

/**
 * El pie con los enlaces legales.
 *
 * POR QUÉ HACE FALTA, ADEMÁS DE `AvisoParticipacion`:
 *   Ese otro aviso vive pegado al botón de enviar, que es donde tiene que estar
 *   para que alguien se entere ANTES de entregar sus datos. Pero solo lo ve
 *   quien va a participar. Aquí faltaba lo otro: una puerta permanente a los
 *   documentos para quien NO sube nada — y esa persona también sale en las
 *   fotos de los demás y también tiene derecho a oponerse. El documento de uso
 *   de imagen está escrito justo para ella, y hasta ahora no había forma de
 *   llegar a él.
 *
 *   Antes las tres páginas legales existían pero eran huérfanas: ninguna
 *   pantalla de las 14 apps enlazaba a ellas. Publicadas y en la práctica
 *   invisibles.
 *
 * Va en la portada del portal y en la del catálogo, que son las dos pantallas
 * por las que pasa todo el mundo.
 */
export function PieLegal({
  urlLegal,
  className,
  incluirTerminos = false,
}: {
  /** Dónde viven los documentos. Por defecto, los del catálogo. */
  urlLegal?: string;
  className?: string;
  /**
   * Los términos son un contrato entre el salón y el proveedor: al invitado no
   * le dicen nada y solo hacen ruido. Por eso solo salen donde hay un cliente
   * mirando (el catálogo), no en el portal del invitado.
   */
  incluirTerminos?: boolean;
}) {
  const base = urlLegal ?? process.env.NEXT_PUBLIC_LEGAL_URL ?? "https://suite-salones.vercel.app/legal";

  const enlace = (ruta: string, texto: string) => (
    <a
      href={`${base}${ruta}`}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:text-foreground"
    >
      {texto}
    </a>
  );

  return (
    <footer className={cn("mt-12 border-t pt-6 text-xs text-muted-foreground", className)}>
      <p className="leading-relaxed">
        {enlace("/privacidad", "Aviso de privacidad")}
        {" · "}
        {enlace("/imagen", "Uso de tu imagen")}
        {incluirTerminos ? (
          <>
            {" · "}
            {enlace("/terminos", "Términos del servicio")}
          </>
        ) : null}
      </p>
      <p className="mt-2 leading-relaxed">
        ¿Sales en una foto y prefieres que no esté? Díselo a quien organiza el evento o al personal
        del salón: se retira, y no hace falta que expliques por qué.
      </p>
    </footer>
  );
}
