import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Configuración de pruebas del monorepo. Cubre dos lugares:
 *   - `packages/**`  → lógica pura de los paquetes compartidos (p. ej. el motor
 *     `resolveEntitlements` de @salones/core).
 *   - `tests/**`     → pruebas transversales del repo, como la suite de
 *     AISLAMIENTO contra el Supabase real (se salta sola si faltan las env).
 * Se excluyen los artefactos de build para que las corridas sean rápidas.
 */
export default defineConfig({
  resolve: {
    alias: {
      /**
       * `@/` apunta al `src` de CADA app, y aquí no hay una app: las pruebas de
       * `tests/` importan archivos de las apps por ruta relativa. Sin este
       * alias, cualquier archivo que use `@/` revienta al cargarse con
       * "Failed to load url @/lib/…".
       *
       * Se resuelve a `apps/catalogo/src` porque el panel del salón es la única
       * app cuyos `lib/` se prueban desde aquí. ⚠️ Si algún día una prueba
       * importa un archivo de OTRA app que use `@/`, cargará el del catálogo y
       * el fallo será confuso: entonces toca partir esto por carpeta.
       */
      "@": fileURLToPath(new URL("./apps/catalogo/src", import.meta.url)),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/.turbo/**", "**/dist/**"],
  },
});
