import next from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

import { ignoresComunes } from "./ignores.mjs";
import { reactCompilerEnAviso, typescriptEnAviso } from "./severidades.mjs";

/**
 * Configuración para las apps Next.js de la suite.
 *
 * `eslint-config-next` ya viene en formato plano y trae de un golpe las
 * reglas de Next, TypeScript, React, React Hooks, jsx-a11y e import. No se
 * apila encima la base de este mismo paquete: las dos registrarían el plugin
 * de TypeScript y ESLint no deja declararlo dos veces.
 */
export default [
  { ignores: ignoresComunes },
  ...next,
  {
    rules: {
      ...reactCompilerEnAviso,

      // El texto de las apps está en español y lleva comillas y apóstrofos
      // por todas partes; la regla daría cientos de falsos positivos.
      "react/no-unescaped-entities": "off",

      // Cambiar <img> por <Image /> es una mejora de rendimiento pendiente,
      // no un fallo. Varias ya llevan su comentario de excepción.
      "@next/next/no-img-element": "warn",
    },
  },
  {
    // El plugin de TypeScript solo está registrado para estos archivos, así
    // que sus reglas hay que ajustarlas dentro del mismo alcance.
    files: ["**/*.ts", "**/*.tsx"],
    rules: typescriptEnAviso,
  },
  prettier,
];
