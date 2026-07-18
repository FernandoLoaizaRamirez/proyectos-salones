import { defineConfig } from "vitest/config";

/**
 * Configuración de pruebas del monorepo. Cubre dos lugares:
 *   - `packages/**`  → lógica pura de los paquetes compartidos (p. ej. el motor
 *     `resolveEntitlements` de @salones/core).
 *   - `tests/**`     → pruebas transversales del repo, como la suite de
 *     AISLAMIENTO contra el Supabase real (se salta sola si faltan las env).
 * Se excluyen los artefactos de build para que las corridas sean rápidas.
 */
export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/.turbo/**", "**/dist/**"],
  },
});
