"use client";

/**
 * QUE LA INVITACIÓN SE VAYA DESCUBRIENDO AL BAJAR.
 *
 * Dos efectos, el mismo mecanismo:
 *   · Los bloques con clase `rev` entran con un fundido hacia arriba.
 *   · Las ramas y las guardas SE DIBUJAN, línea por línea. El truco es viejo y
 *     bueno: a cada trazo se le mide su largo real (`getTotalLength`), se pinta
 *     con una línea discontinua de ese mismo largo y se desplaza el hueco hasta
 *     dejarlo a cero. El navegador anima ese número y parece un pincel.
 *
 * Es un puerto fiel del original, con sus tres redes de seguridad, porque aquí
 * un fallo no se ve como un fallo: se ve como una invitación EN BLANCO —el
 * contenido empieza invisible— y el invitado nunca sabría que hay algo debajo.
 *
 *   1. Si el navegador no tiene IntersectionObserver, se revela todo de golpe.
 *   2. A los 1.5 s se engancha un repaso por scroll, por si el observador no
 *      llegó a disparar (pestaña abierta en segundo plano, por ejemplo).
 *   3. Si el visitante ya recorrió la página y aun así no se reveló NADA, se
 *      enseña todo sin animación. No salta con el visitante quieto, así que no
 *      estropea el efecto cuando funciona.
 */
import * as React from "react";

const SELECTOR = ".rev, .rincon, .guarda";

/** Prepara los trazos de una ilustración para que puedan "dibujarse". */
function prepararTrazos(cont: Element): void {
  cont.querySelectorAll<SVGGeometryElement>("[data-draw]").forEach((n) => {
    let largo = 260;
    try {
      if (typeof n.getTotalLength === "function") {
        const v = n.getTotalLength();
        if (v && Number.isFinite(v)) largo = v;
      }
    } catch {
      /* algún motor sin getTotalLength: se queda con el largo de respaldo */
    }
    n.style.strokeDasharray = String(largo);
    n.style.setProperty("--largo", String(largo));
  });
  cont.classList.add("dibujable");
  // Fuerza el cálculo de estilo para que la transición tenga valor inicial.
  void cont.getBoundingClientRect();
}

/**
 * Doble cuadro de animación con respaldo por temporizador: `requestAnimationFrame`
 * se pausa si la pestaña arranca en segundo plano, y sin el respaldo el trazo no
 * llegaría a dibujarse nunca.
 */
function alSiguienteCuadro(fn: () => void): void {
  let hecho = false;
  const ir = () => {
    if (hecho) return;
    hecho = true;
    fn();
  };
  requestAnimationFrame(() => requestAnimationFrame(ir));
  setTimeout(ir, 90);
}

function dibujarTrazos(cont: Element, escalonar: boolean, reducir: boolean): void {
  const nodos = cont.querySelectorAll<SVGGeometryElement>("[data-draw]");
  if (reducir) {
    cont.classList.add("dibujando");
    return;
  }
  // El escalonado se comprime cuando hay muchos trazos: el marco de la intro
  // tiene ~49 y a 0.075 s cada uno tardaría 5 s en dibujarse.
  const paso = Math.min(0.075, 1.5 / Math.max(nodos.length, 1));
  nodos.forEach((n, i) => {
    n.style.transitionDelay = `${escalonar ? (i * paso).toFixed(3) : 0}s`;
  });
  cont.classList.add("dibujando");
}

function revelar(el: Element, animado: boolean, reducir: boolean): void {
  if (el.classList.contains("rev")) el.classList.add("visible");
  if (el.classList.contains("rincon") || el.classList.contains("guarda")) {
    if (el.classList.contains("dibujando")) return;
    prepararTrazos(el);
    if (animado) alSiguienteCuadro(() => dibujarTrazos(el, true, reducir));
    else dibujarTrazos(el, false, reducir); // mismo tick: aparece ya dibujado
  }
}

/** Dibuja una ilustración suelta (el marco de la intro) en cuanto se monta. */
export function dibujarAhora(el: Element | null): void {
  if (!el) return;
  const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  prepararTrazos(el);
  alSiguienteCuadro(() => dibujarTrazos(el, true, reducir));
}

/**
 * Enciende los revelados de toda la página. Se vuelve a pasar cuando cambian
 * los datos, porque hasta que la invitación no llega no existen las secciones.
 *
 * La `senal` existe por las secciones que se montan DESPUÉS del primer pase:
 * el saludo personal espera a que se lea el `#` y "Tu lugar" espera su lectura
 * del acomodo, así que el observador ya hizo su ronda cuando aparecen y nadie
 * las revelaría. Cuando la página cambia la señal, el pase se repite entero —
 * es seguro repetirlo: `revelar` deja en paz lo que ya está visible o dibujado.
 */
export function useRevelados(listo: boolean, senal?: unknown): void {
  React.useEffect(() => {
    if (!listo) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const todos = () => document.querySelectorAll(SELECTOR);

    if (!("IntersectionObserver" in window)) {
      todos().forEach((e) => revelar(e, false, reducir));
      return;
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) {
          if (!en.isIntersecting) continue;
          revelar(en.target, true, reducir);
          obs.unobserve(en.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    todos().forEach((e) => obs.observe(e));

    /* Red 2: repaso por scroll, idempotente, que se retira solo. */
    const revisarManual = () => {
      const vh = window.innerHeight || 800;
      const faltan = document.querySelectorAll(
        ".rev:not(.visible), .rincon:not(.dibujando), .guarda:not(.dibujando)",
      );
      if (!faltan.length) {
        window.removeEventListener("scroll", revisarManual);
        window.removeEventListener("resize", revisarManual);
        return;
      }
      faltan.forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.top < vh * 0.95 && b.bottom > -40) revelar(el, true, reducir);
      });
    };

    const relojes: number[] = [];
    relojes.push(
      window.setTimeout(() => {
        window.addEventListener("scroll", revisarManual, { passive: true });
        window.addEventListener("resize", revisarManual, { passive: true });
        revisarManual();
      }, 1500),
    );

    /* Red 3: si ya bajó y no se reveló NADA, el mecanismo está roto. */
    const vigilar = () => {
      relojes.push(
        window.setTimeout(function chequeo() {
          if (document.querySelector(".rev.visible")) return; // funciona
          if ((window.scrollY || 0) > 60) {
            todos().forEach((e) => revelar(e, false, reducir)); // roto
            return;
          }
          relojes.push(window.setTimeout(chequeo, 2000)); // sigue quieto
        }, 4000),
      );
    };
    vigilar();

    return () => {
      obs.disconnect();
      relojes.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("scroll", revisarManual);
      window.removeEventListener("resize", revisarManual);
    };
  }, [listo, senal]);
}
