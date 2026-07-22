import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

import { ignoresComunes } from "./ignores.mjs";
import { typescriptEnAviso } from "./severidades.mjs";

/**
 * Reglas base para los paquetes sin framework (core, sync, payments).
 * Prettier va al final para apagar las reglas de formato que chocan con él.
 */
export default tseslint.config(
  { ignores: ignoresComunes },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: typescriptEnAviso },
  prettier,
);
