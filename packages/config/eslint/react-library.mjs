import reactHooks from "eslint-plugin-react-hooks";

import base from "./base.mjs";
import { reactCompilerEnAviso } from "./severidades.mjs";

/**
 * Configuración para los paquetes de React que no son apps Next
 * (hoy solo @salones/ui): la base más las reglas de los hooks.
 *
 * `configs.flat` es la variante en formato plano; `configs.recommended`
 * a secas sigue siendo del formato antiguo y ESLint 9 la rechaza.
 */
export default [
  ...base,
  reactHooks.configs.flat.recommended,
  { rules: reactCompilerEnAviso },
];
