/**
 * Carpetas generadas o de terceros: el lint nunca entra ahí.
 * Vive en su propio archivo para que cada configuración la reutilice
 * sin arrastrar el resto de las reglas.
 */
export const ignoresComunes = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/next-env.d.ts",
];
