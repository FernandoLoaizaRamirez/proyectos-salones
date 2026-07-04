import { Camera } from "lucide-react";

/**
 * Muestra una fotografía (si se pasa `src`) dentro de un marco elegante.
 * Si no hay foto, deja un marcador de posición decorativo (no un hueco vacío).
 */
export function Photo({
  label,
  src,
  alt,
  className = "",
  aspect = "aspect-[4/3]",
  framed = true,
}: {
  label?: string;
  src?: string;
  alt?: string;
  className?: string;
  aspect?: string;
  framed?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden ${framed ? "rounded-[var(--radius)] border border-border" : ""} ${aspect} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? label ?? ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-cream via-muted to-[#e7d9c2]" />
          <div className="absolute inset-0 [background:radial-gradient(120%_120%_at_20%_10%,rgba(201,169,110,0.30),transparent_55%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="size-7 text-gold/50" strokeWidth={1.25} />
          </div>
        </>
      )}
      <div className="pointer-events-none absolute inset-3 rounded-[2px] border border-gold/25" />
      {label ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#241d1a]/80 to-transparent p-4">
          <span className="font-display text-lg italic text-cream">{label}</span>
        </div>
      ) : null}
    </div>
  );
}
