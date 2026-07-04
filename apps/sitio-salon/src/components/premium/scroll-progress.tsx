"use client";

import * as React from "react";

/** Barra dorada superior que indica el avance de lectura de la página. */
export function ScrollProgress() {
  const [p, setP] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className="h-full w-full origin-left bg-gradient-to-r from-gold/50 via-gold to-gold/50"
        style={{ transform: `scaleX(${p})` }}
      />
    </div>
  );
}
