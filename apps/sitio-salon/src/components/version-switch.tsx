import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Botón flotante para alternar entre la versión clásica y la inmersiva. */
export function VersionSwitch({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      /* `hidden md:flex`: en el celular esta pastilla y el botón de WhatsApp se
         repartían la franja de abajo y entre los dos tapaban texto en casi
         todas las secciones — hasta el enlace que lleva a la demo. En pantalla
         chica se queda solo el de WhatsApp. */
      className="fixed bottom-6 left-6 z-50 hidden items-center gap-2 rounded-full border border-gold/50 bg-background/80 px-4 py-2.5 text-sm shadow-sm backdrop-blur-md transition-colors hover:bg-gold/10 md:flex"
    >
      <Sparkles className="size-4 text-gold" />
      <span>{label}</span>
    </Link>
  );
}
