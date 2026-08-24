export { Button, buttonVariants } from "./components/button";
export type { ButtonProps } from "./components/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export { ThemeProvider } from "./components/theme-provider";
export { ThemeToggle } from "./components/theme-toggle";
export { Logo } from "./components/logo";
export { EmptyState } from "./components/empty-state";
export { Confirmar } from "./components/confirmar";
export type { ConfirmarProps } from "./components/confirmar";
export {
  PantallaError,
  PantallaNoEncontrada,
  PantallaErrorGrave,
} from "./components/rescate";
export { AvisoParticipacion } from "./components/aviso-participacion";
export { PieLegal } from "./components/pie-legal";
export { BrandingScope } from "./components/branding-scope";
export { brandingAVariables } from "./branding";
export type { BrandingSalon } from "./branding";
// --- El sistema de temas del rediseño (salón → evento → módulo) -------------
export type {
  ClaveFuentes,
  TemaSalon,
  TemaEvento,
  TemaResuelto,
  DatosEventoTema,
} from "./tema/tipos";
export { resolverTema, esColorSeguro, esUrlSegura } from "./tema/resolver";
export { temaAVariables, legibleEnAmbosTemas } from "./tema/variables";
export { ratioContraste, luminancia, derivarTextoSobre } from "./tema/contraste";
export { FUENTES, parejaDe, hrefFuentes, familiasCSS } from "./tema/fuentes";
export type { ParejaTipografica } from "./tema/fuentes";
export { TEMA_DEMO, EVENTO_DEMO, DATOS_EVENTO_DEMO, TEMA_DEMO_RESUELTO } from "./tema/demo";
// --- La cáscara de la experiencia -------------------------------------------
export { TemaScope } from "./components/tema-scope";
export { FuentesTema } from "./components/fuentes-tema";
export { AppShell } from "./components/app-shell";
export { CintaExperiencia } from "./components/cinta-experiencia";
export type { ExperienciaEnlace } from "./components/cinta-experiencia";
export { PieExperiencia } from "./components/pie-experiencia";
export { cn } from "./lib/cn";
export { guardarLocal, leerLocal } from "./lib/almacen";
export { aCSV, descargarCSV } from "./lib/csv";
export type { ColumnaCSV } from "./lib/csv";
