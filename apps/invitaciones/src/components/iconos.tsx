/**
 * Los iconos del diseño, dibujados a mano con los mismos trazos que la
 * plantilla. No se usa una librería de iconos a propósito: son seis, van con el
 * grosor de línea del resto de la botánica, y cargar un paquete entero para eso
 * en el teléfono de un invitado sería pagar de más por nada.
 */
const comunes = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconoReloj() {
  return (
    <svg {...comunes}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconoMapa() {
  return (
    <svg {...comunes}>
      <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function IconoCalendario() {
  return (
    <svg {...comunes}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function IconoCopiar() {
  return (
    <svg {...comunes}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </svg>
  );
}

export function IconoWhatsApp() {
  return (
    <svg {...comunes}>
      <path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1121 11.5z" />
    </svg>
  );
}

/** El corazón del filete de la portada (va en color, no hereda). */
export function IconoCorazon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F7DCE6"
      strokeWidth={1.1}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 21c0-6 3-9 8-10-5-1-8-4-8-10 0 6-3 9-8 10 5 1 8 4 8 10z" />
    </svg>
  );
}
