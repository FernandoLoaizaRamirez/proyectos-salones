/**
 * Un documento legal. Rutas: /legal/privacidad, /legal/terminos, /legal/imagen.
 *
 * Se generan las tres de forma estática: son páginas que tienen que estar SIEMPRE
 * disponibles, incluso si la base de datos o la red fallan.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { documento, DOCUMENTOS } from "@salones/legal";
import { datosLegales, camposPendientes } from "@/lib/legal";
import { AvisoPendiente } from "../aviso-pendiente";

export function generateStaticParams() {
  return DOCUMENTOS.map((d) => ({ documento: d }));
}

export async function generateMetadata({ params }: { params: Promise<{ documento: string }> }) {
  const doc = documento((await params).documento, datosLegales);
  return doc ? { title: doc.titulo, description: doc.resumen } : {};
}

export default async function DocumentoLegal({
  params,
}: {
  params: Promise<{ documento: string }>;
}) {
  const doc = documento((await params).documento, datosLegales);
  if (!doc) notFound();

  const pendientes = camposPendientes();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/legal"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Información legal
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{doc.titulo}</h1>
      <p className="mt-2 text-muted-foreground">{doc.resumen}</p>

      {pendientes.length > 0 ? <AvisoPendiente campos={pendientes} /> : null}

      <div className="mt-10 space-y-8">
        {doc.secciones.map((seccion) => (
          <section key={seccion.titulo}>
            <h2 className="text-lg font-medium">{seccion.titulo}</h2>
            <div className="mt-3 space-y-3">
              {seccion.parrafos.map((parrafo, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {parrafo}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        Última actualización: {doc.actualizado}. Para cualquier duda sobre tus datos, escribe a{" "}
        {datosLegales.contacto}.
      </p>
    </main>
  );
}
