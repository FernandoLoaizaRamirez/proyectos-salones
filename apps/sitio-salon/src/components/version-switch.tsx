import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Botón flotante para alternar entre la versión clásica y la inmersiva. */
export function VersionSwitch({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border border-gold/50 bg-background/80 px-4 py-2.5 text-sm shadow-sm backdrop-blur-md transition-colors hover:bg-gold/10"
    >
      <Sparkles className="size-4 text-gold" />
      <span>{label}</span>
    </Link>
  );
}
