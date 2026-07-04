/** Monograma "SR" (Santa Renata) usado como marca del sitio. */
export function Monograma({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Monograma del salón">
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="25"
        fontStyle="italic"
        fill="currentColor"
      >
        SR
      </text>
    </svg>
  );
}
