/**
 * API del VIDEO RECUERDO (corre en el servidor, no en el navegador).
 *
 * - POST /api/recuerdo        -> junta todos los brindis y manda el render a
 *                                Shotstack. Devuelve { id }.
 * - GET  /api/recuerdo?id=... -> consulta el estado del render. Devuelve
 *                                { status, url } (url cuando status = "done").
 *
 * La clave de Shotstack es SECRETA: vive solo aquí (variable de entorno
 * SHOTSTACK_API_KEY en Vercel), nunca en el navegador.
 */
import { NextResponse } from "next/server";
import { construirEdit } from "@/lib/recuerdo";
import { listarBrindis } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const KEY = process.env.SHOTSTACK_API_KEY;
const ENV = process.env.SHOTSTACK_ENV ?? "stage"; // "stage" (gratis) o "v1" (producción)
const BASE = `https://api.shotstack.io/edit/${ENV}`;

export async function POST() {
  if (!KEY) {
    return NextResponse.json(
      { error: "Falta configurar la clave de Shotstack (SHOTSTACK_API_KEY)." },
      { status: 500 },
    );
  }
  const videos = await listarBrindis();
  const urls = videos.map((v) => v.url);
  if (urls.length === 0) {
    return NextResponse.json({ error: "Todavía no hay brindis para juntar." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BASE}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY },
      body: JSON.stringify(construirEdit(urls)),
    });
    const data = await res.json().catch(() => null);
    const id = data?.response?.id;
    if (!res.ok || !id) {
      return NextResponse.json(
        { error: data?.message ?? "No se pudo iniciar el video recuerdo." },
        { status: 502 },
      );
    }
    return NextResponse.json({ id, clips: urls.length });
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con Shotstack." }, { status: 502 });
  }
}

export async function GET(req: Request) {
  if (!KEY) {
    return NextResponse.json(
      { error: "Falta configurar la clave de Shotstack (SHOTSTACK_API_KEY)." },
      { status: 500 },
    );
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id del render." }, { status: 400 });

  try {
    const res = await fetch(`${BASE}/render/${id}`, { headers: { "x-api-key": KEY } });
    const data = await res.json().catch(() => null);
    return NextResponse.json({
      status: data?.response?.status ?? "unknown",
      url: data?.response?.url ?? null,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el estado." }, { status: 502 });
  }
}
