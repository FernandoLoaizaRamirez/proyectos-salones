import { AlertTriangle } from "lucide-react";

/**
 * Mientras falten datos obligatorios, se dice en grande. Un aviso de privacidad
 * sin responsable identificado no cumple: es peor publicarlo a medias que no
 * publicarlo.
 *
 * ⚠️ ESTA PÁGINA ES PÚBLICA, Y ANTES NO SE ESCRIBÍA COMO SI LO FUERA.
 *
 * Decía, con estas palabras: «Faltan por rellenar: correo de contacto,
 * domicilio del salón. Se editan en src/lib/legal.ts». Eso es una nota para
 * quien mantiene el código, y se la estaba leyendo el invitado que venía desde
 * el enlace del muro — y el salón que estaba evaluando comprar. Publicaba una
 * ruta de archivos del proyecto y sonaba a que el producto está a medias.
 *
 * Ahora hay dos textos para dos públicos:
 *   · quien lee el documento → qué significa para él y a quién acudir mientras
 *     tanto (nada de rutas, nada de jerga);
 *   · quien lo mantiene → el detalle accionable, y solo dentro del panel del
 *     salón, que está detrás del acceso del personal (`interno`).
 */
export function AvisoPendiente({ campos, interno = false }: { campos: string[]; interno?: boolean }) {
  return (
    <div className="mt-6 rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="size-4 shrink-0" />
        {interno ? "Estos documentos todavía no están listos para publicarse" : "Este aviso está incompleto"}
      </p>
      {interno ? (
        <p className="mt-2 text-sm text-amber-700/90 dark:text-amber-400/90">
          Faltan por rellenar: {campos.join(", ")}. Se editan en{" "}
          <code className="rounded bg-amber-500/15 px-1 py-0.5">src/lib/legal.ts</code>. Además, un
          abogado debe revisar los textos antes de usarlos con un cliente real.
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-700/90 dark:text-amber-400/90">
          Falta que el salón publique sus datos de contacto, así que todavía no puedes escribir a
          una dirección para ejercer tus derechos. Mientras tanto sirve igual: díselo a quien
          organiza el evento o al personal del salón, y se atiende en el momento. Lo que aparece
          más abajo describe con exactitud lo que se hace con lo que compartes.
        </p>
      )}
    </div>
  );
}
