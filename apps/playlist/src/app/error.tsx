"use client";

/**
 * Pantalla de rescate de esta app: lo que se ve si algo revienta al pintar.
 * Sin este archivo, Next enseña su mensaje genérico en inglés y sin la marca del
 * salón — delante de los invitados, en plena fiesta.
 */
import { PantallaError } from "@salones/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <PantallaError reset={reset} />;
}
