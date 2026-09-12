/**
 * Un documento legal. Rutas: /legal/privacidad, /legal/terminos, /legal/imagen.
 *
 * QUIÉN ES EL RESPONSABLE DEPENDE DEL EVENTO: con `?e=<codigo>` la página pide
 * los datos del salón de ESE evento (`evento-config…&legal=1`, migración 0033)
 * y el aviso nombra al salón de verdad. Sin código, sirve el documento MODELO.
 *
 * ⚠️ SOBRE LA DISPONIBILIDAD, porque este comentario decía otra cosa hasta el
 * 29 ago 2026: ya NO se prerenderizan las tres de forma estática. Al leer
 * `searchParams` la ruta se resuelve bajo demanda (con revalidación de 5
 * minutos). La promesa de que estas páginas están SIEMPRE disponibles se
 * mantiene, pero ahora la sostienen otras dos cosas: el camino sin `?e=` no
 * toca la red, y `datosLegalesDe` no lanza nunca — cualquier fallo cae al
 * MODELO. `generateStaticParams` se conserva porque sigue enumerando las tres
 * claves válidas.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { documento, DOCUMENTOS, falta } from "@salones/legal";
import { datosLegalesDe, MODELO, camposPendientes } from "@/lib/legal";
import { AvisoPendiente } from "../aviso-pendiente";
import { AvisoMuestra } from "../aviso-muestra";

export function generateStaticParams() {
  return DOCUMENTOS.map((d) => ({ documento: d }));
}

export async function generateMetadata({ params }: { params: Promise<{ documento: string }> }) {
  // Los metadatos usan el MODELO a propósito: el título y la descripción de la
  // pestaña no deben depender de una llamada de red.
  const doc = documento((await params).documento, MODELO);
  return doc ? { title: doc.titulo, description: doc.resumen } : {};
}

export default async function DocumentoLegal({
  params,
  searchParams,
}: {
  params: Promise<{ documento: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const clave = (await params).documento;
  const e = (await searchParams).e;
  const { datos, estado } = await datosLegalesDe(e);
  const cola = e ? `?e=${encodeURIComponent(e)}` : "";

  const doc = documento(clave, datos);
  if (!doc) notFound();

  const pendientes = estado === "incompleto" ? camposPendientes(datos) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/legal${cola}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Información legal
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{doc.titulo}</h1>
      <p className="mt-2 text-muted-foreground">{doc.resumen}</p>

      {estado === "modelo" ? <AvisoMuestra /> : null}
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

      {/*
        El pie repetía el correo a pelo, así que publicaba «escribe a PENDIENTE»
        aunque el cuerpo del documento ya lo esquivara. Un sitio de menos donde
        se pueda escapar la marca interna.
      */}
      <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        Última actualización: {doc.actualizado}.{" "}
        {falta(datos.contacto)
          ? `Para cualquier duda sobre tus datos, habla con el personal de ${datos.salon}.`
          : `Para cualquier duda sobre tus datos, escribe a ${datos.contacto}.`}
      </p>
    </main>
  );
}
