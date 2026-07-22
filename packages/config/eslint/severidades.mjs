/**
 * Política de severidades compartida.
 *
 * El lint acaba de entrar al CI, así que lo que hoy no está limpio se queda en
 * AVISO: sirve de lista de pendientes sin bloquear a nadie. Lo que sí queda en
 * ERROR es lo que delata un fallo de verdad, no un gusto de estilo.
 */

/**
 * eslint-plugin-react-hooks v7 enciende como error toda la familia de reglas
 * del React Compiler. Son nuevas y muy exigentes: piden refactores reales
 * (por ejemplo, `setEstado(Date.now())` dentro de un efecto es justo la forma
 * correcta de evitar el desajuste de hidratación, y aun así lo marca).
 *
 * Se quedan en aviso. Siguen siendo ERROR, porque delatan fallos de verdad:
 *   - rules-of-hooks     → un hook dentro de un `if` rompe React.
 *   - set-state-in-render → bucle infinito de renderizado.
 */
export const reactCompilerEnAviso = {
  "react-hooks/static-components": "warn",
  "react-hooks/use-memo": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/immutability": "warn",
  "react-hooks/globals": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/error-boundaries": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/config": "warn",
  "react-hooks/gating": "warn",
};

/**
 * Deuda de TypeScript conocida. `_` al principio del nombre significa
 * "ya sé que no se usa, lo dejo a propósito".
 */
export const typescriptEnAviso = {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
};
