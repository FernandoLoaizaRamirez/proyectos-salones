/**
 * Índice de los documentos legales. Es la página a la que apuntan las 14 apps.
 */
import Link from "next/link";
import { FileText, ShieldCheck, Camera, ArrowLeft } from "lucide-react";
import { Card } from "@salones/ui";
import { todosLosDocumentos } from "@salones/legal";
import { datosLegalesDe, camposPendientes } from "@/lib/legal";
import { AvisoPendiente } from "./aviso-pendiente";
import { AvisoMuestra } from "./aviso-muestra";

export const metadata = {
  title: "Información legal",
  description: "Aviso de privacidad, términos y condiciones y uso de imagen.",
};

const ICONOS = {
  privacidad: ShieldCheck,
  terminos: FileText,
  imagen: Camera,
} as const;

export default async function Legal({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const e = (await searchParams).e;
  const { datos, estado } = await datosLegalesDe(e);
  // El codigo se arrastra a las tres tarjetas. Sin esto, un invitado que abre
  // /legal?e=su-boda ve el nombre de SU salon en el indice y, al tocar "Aviso
  // de privacidad" —que es el documento que de verdad importa—, aterriza en el
  // generico. El camino desde el pie de las apps funcionaba; el del indice no.
  const cola = e ? `?e=${encodeURIComponent(e)}` : "";
  const documentos = todosLosDocumentos(datos);
  const pendientes = estado === "incompleto" ? camposPendientes(datos) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Información legal</h1>
      <p className="mt-2 text-muted-foreground">
        Qué datos se recogen en los eventos de {datos.salon}, para qué se usan y cómo
        pedir que se borren.
      </p>

      {estado === "modelo" ? <AvisoMuestra /> : null}
      {pendientes.length > 0 ? <AvisoPendiente campos={pendientes} /> : null}

      <div className="mt-8 grid gap-4">
        {documentos.map((doc) => {
          const Icono = ICONOS[doc.clave as keyof typeof ICONOS] ?? FileText;
          return (
            <Link key={doc.clave} href={`/legal/${doc.clave}${cola}`}>
              <Card className="p-5 transition-colors hover:border-ring">
                <div className="flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-muted">
                    <Icono className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-medium">{doc.titulo}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{doc.resumen}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Última actualización: {datos.actualizado}.
      </p>
    </main>
  );
}
