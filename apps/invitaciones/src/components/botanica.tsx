/**
 * LA BOTÁNICA DEL DISEÑO — las ramas, la guarda floral y el marco de la intro.
 *
 * Son las tres ilustraciones que hacen que esto parezca una invitación de papel
 * y no una página web: la rama de acuarela en las esquinas de las secciones, la
 * guarda (el filete floral que separa bloques) y el marco de la tarjeta de
 * apertura. Van dibujadas a mano en SVG, con los MISMOS trazos que la plantilla
 * original, porque el efecto de que se dibujen solas al aparecer depende de que
 * sean líneas (`stroke`) y no rellenos.
 *
 * Quien anima el trazo es `@/lib/revelados`; aquí solo está el dibujo.
 */

/** Los ocho trazos de la rama y sus tres bayas. */
const RAMA = [
  "M8,114 C40,102 66,82 82,54 C90,40 96,26 100,10",
  "M34,101 C29,86 36,73 51,69 C51,84 46,96 34,101",
  "M40,95 C51,88 63,91 69,102 C56,107 44,104 40,95",
  "M56,80 C51,66 58,53 72,49 C73,64 68,76 56,80",
  "M62,74 C73,68 85,71 90,82 C78,86 66,83 62,74",
  "M76,56 C72,43 79,31 91,27 C92,41 87,52 76,56",
  "M82,50 C92,45 102,48 106,58 C95,62 85,58 82,50",
  "M92,30 C90,20 96,10 105,7 C106,18 101,26 92,30",
];
const BAYAS: [number, number, number][] = [
  [104, 4, 3.2],
  [112, 16, 2.6],
  [97, 44, 2.4],
];

function TrazosRama({ prefijo }: { prefijo: string }) {
  return (
    <>
      {RAMA.map((d, i) => (
        <path key={`${prefijo}-r${i}`} data-draw="" d={d} />
      ))}
      {BAYAS.map((b, i) => (
        <circle key={`${prefijo}-b${i}`} className="flor" data-draw="" cx={b[0]} cy={b[1]} r={b[2]} />
      ))}
    </>
  );
}

/**
 * La rama en una esquina de la sección. `donde` es cuál de las cuatro:
 * si = superior izquierda, sd = superior derecha, ii / id = las de abajo.
 */
export function Rincon({ donde }: { donde: "si" | "sd" | "ii" | "id" }) {
  return (
    <div className={`rincon ri-${donde}`} aria-hidden="true">
      <svg viewBox="0 0 120 120" fill="none">
        <TrazosRama prefijo={`rincon-${donde}`} />
      </svg>
    </div>
  );
}

/** Hojas de la guarda: dos grupos de cuatro, a los lados de la flor central. */
const HOJAS_GUARDA = [
  "M40,20 C40,10 48,4 58,5 C57,15 50,21 40,20",
  "M64,20 C64,30 56,36 46,35 C47,25 54,19 64,20",
  "M88,20 C88,10 96,4 106,5 C105,15 98,21 88,20",
  "M112,20 C112,30 104,36 94,35 C95,25 102,19 112,20",
  "M208,20 C208,10 216,4 226,5 C225,15 218,21 208,20",
  "M232,20 C232,30 224,36 214,35 C215,25 222,19 232,20",
  "M256,20 C256,10 264,4 274,5 C273,15 266,21 256,20",
  "M280,20 C280,30 272,36 262,35 C263,25 270,19 280,20",
];

/** El filete floral que separa secciones. */
export function Guarda({ id }: { id: string }) {
  return (
    <span className="guarda rev" aria-hidden="true">
      <svg viewBox="0 0 320 40">
        <path data-draw="" d="M6,20 H132" />
        <path data-draw="" d="M188,20 H314" />
        {HOJAS_GUARDA.map((d, i) => (
          <path key={`${id}-h${i}`} data-draw="" d={d} />
        ))}
        <g transform="translate(160,20)">
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={`${id}-p${i}`}
              className="flor"
              data-draw=""
              transform={`rotate(${i * 72})`}
              d="M0,-3 C7,-13 16,-11 14,-1 C11,5 3,4 0,-3"
            />
          ))}
          <circle className="flor" data-draw="" cx="0" cy="0" r="2.6" />
        </g>
        <path data-draw="" d="M146,20 C150,14 154,14 158,20" />
        <path data-draw="" d="M162,20 C166,26 170,26 174,20" />
      </svg>
    </span>
  );
}

/** Esquinas del marco de la intro: la misma rama, girada a cada lado. */
const ESQUINAS_MARCO = [
  "translate(6,6) scale(0.62)",
  "translate(294,6) scale(-0.62,0.62)",
  "translate(6,394) scale(0.62,-0.62)",
  "translate(294,394) scale(-0.62,-0.62)",
];

/** El marco de la tarjeta de apertura, que se dibuja solo al entrar. */
export function MarcoIntro() {
  return (
    <svg id="marcoIntro" viewBox="0 0 300 400" fill="none" aria-hidden="true">
      <path data-draw="" d="M18,52 V348 M282,52 V348 M52,14 H248 M52,386 H248" />
      <path data-draw="" d="M18,52 C18,31 32,16 52,14" />
      <path data-draw="" d="M282,52 C282,31 268,16 248,14" />
      <path data-draw="" d="M18,348 C18,369 32,384 52,386" />
      <path data-draw="" d="M282,348 C282,369 268,384 248,386" />
      {ESQUINAS_MARCO.map((t, i) => (
        <g key={`marco-e${i}`} transform={t}>
          <TrazosRama prefijo={`marco-${i}`} />
        </g>
      ))}
    </svg>
  );
}
