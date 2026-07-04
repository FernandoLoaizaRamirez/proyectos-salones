"use client";

import * as React from "react";

/**
 * Revela su contenido al entrar en pantalla, con dirección opcional.
 * Versión premium del componente Reveal (soporta up/left/right/scale).
 */
export function RevealP({
  children,
  delay = 0,
  from = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  from?: "up" | "left" | "right" | "scale";
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            obs.unobserve(el);
          }
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fromClass =
    from === "left"
      ? "from-left"
      : from === "right"
        ? "from-right"
        : from === "scale"
          ? "from-scale"
          : "";

  return (
    <div
      ref={ref}
      className={`p-reveal ${fromClass} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
