"use client";

import * as React from "react";

/** Cuenta hacia arriba hasta el valor cuando entra en pantalla. */
export function CountUp({ value, className = "" }: { value: string; className?: string }) {
  const target = parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
  const suffix = value.replace(/[\d,\s]/g, "");
  const [n, setN] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let done = false;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !done) {
            done = true;
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              setN(target);
              return;
            }
            const dur = 1300;
            const t0 = performance.now();
            const tick = (t: number) => {
              const p = Math.min(1, (t - t0) / dur);
              setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
              if (p < 1) raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  return (
    <span ref={ref} className={className}>
      {n.toLocaleString("es-MX")}
      {suffix}
    </span>
  );
}
