import { defineConfig } from "vitest/config";

/**
 * Configuración de pruebas del monorepo. Por ahora las pruebas viven en los
 * paquetes compartidos (lógica pura como `resolveEntitlements`). Se excluyen los
 * artefactos de build para que las corridas sean rápidas.
 */
export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/.turbo/**", "**/dist/**"],
  },
});
