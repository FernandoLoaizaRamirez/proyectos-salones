import { CalendarHeart, SearchX } from "lucide-react";
import { TemaScope, resolverTema } from "@salones/ui";

/**
 * Las dos pantallas "que no son el módulo", con la voz del evento.
 *
 * Antes eran un candado gris y un párrafo de software ("Esta experiencia no
 * está activa"). En la casa de una boda eso desentona: el invitado no compró
 * nada ni tiene que enterarse de qué contrató el salón. Se le dice lo justo,
 * en el tono de la fiesta, y se le devuelve al camino.
 */

/** El evento del enlace no existe (código mal escrito o evento cerrado). */
export function EventoNoEncontrado() {
  return (
    <TemaScope tema={resolverTema({ nombre: "Evento no encontrado" })}>
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          No encontramos este evento
        </h1>
        <p className="mt-2 text-muted-foreground">
          Revisa el enlace que te compartieron: puede que el código esté incompleto.
        </p>
      </main>
    </TemaScope>
  );
}

/**
 * La experiencia existe pero este evento no la incluye. Sin candados ni jerga
 * de licencias: una nota breve y el resto de la celebración a un toque.
 */
export function ExperienciaNoIncluida({ que }: { que: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card px-6 py-12 text-center">
      <CalendarHeart className="mx-auto size-8 text-primary/60" />
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold">
        {que} no forma parte de esta celebración
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Quien organiza eligió otras experiencias para este día. Vuelve al evento para ver todo lo
        que sí te espera.
      </p>
    </div>
  );
}
