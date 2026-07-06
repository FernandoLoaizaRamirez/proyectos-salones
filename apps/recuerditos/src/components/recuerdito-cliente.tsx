"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { Sparkles, Download, ImagePlus, Check, MessageCircle } from "lucide-react";
import { Button, cn } from "@salones/ui";
import { evento, temas, mensajesSugeridos, type Tema } from "@/lib/recuerditos";

const campo =
  "w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

/** La tarjeta de recuerdo (vista previa y lo que se exporta como imagen). */
const RecuerditoCard = React.forwardRef<
  HTMLDivElement,
  { tema: Tema; nombre: string; mensaje: string; foto: string | null }
>(function RecuerditoCard({ tema, nombre, mensaje, foto }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex aspect-[4/5] w-full flex-col items-center justify-between overflow-hidden rounded-2xl p-8 text-center",
        tema.fondo,
        tema.texto,
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-black/10 blur-2xl" />

      <div className={cn("relative text-[0.7rem] uppercase tracking-[0.25em]", tema.suave)}>
        {evento.nombre} · {evento.fecha}
      </div>

      <div className="relative flex flex-col items-center gap-5">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt=""
            className={cn("size-28 rounded-full object-cover ring-4", tema.anillo)}
          />
        ) : (
          <div className={cn("grid size-24 place-items-center rounded-full ring-4", tema.anillo)}>
            <Sparkles className="size-9" />
          </div>
        )}
        <p
          className="px-1 text-3xl italic leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {mensaje.trim() || "¡Gracias por acompañarnos!"}
        </p>
        {nombre.trim() ? (
          <p className={cn("text-lg font-medium", tema.acento)}>— {nombre.trim()}</p>
        ) : null}
      </div>

      <div className={cn("relative text-xs tracking-[0.2em]", tema.suave)}>{evento.hashtag}</div>
    </div>
  );
});

export function RecuerditoCliente() {
  const [tema, setTema] = React.useState<Tema>(temas[0]!);
  const [nombre, setNombre] = React.useState("");
  const [mensaje, setMensaje] = React.useState("");
  const [foto, setFoto] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);
  const [listo, setListo] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setFoto(String(r.result));
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const generarPng = async () => {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
  };

  const descargar = async () => {
    setOcupado(true);
    try {
      const url = await generarPng();
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "recuerdito.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setListo(true);
        setTimeout(() => setListo(false), 2000);
      }
    } finally {
      setOcupado(false);
    }
  };

  const compartir = async () => {
    setOcupado(true);
    try {
      const url = await generarPng();
      if (!url) return;
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "recuerdito.png", { type: "image/png" });
      const nav = navigator as unknown as {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: `Recuerdo de ${evento.nombre}` });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = "recuerdito.png";
        a.click();
      }
    } catch {
      /* el usuario canceló */
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      {/* Controles */}
      <div className="order-2 space-y-6 lg:order-1">
        <div>
          <label className="mb-2 block text-sm font-medium">Elige un diseño</label>
          <div className="grid grid-cols-4 gap-2">
            {temas.map((t) => (
              <button
                key={t.id}
                onClick={() => setTema(t)}
                aria-label={t.nombre}
                className={cn(
                  "relative h-16 rounded-[var(--radius)] ring-2 transition",
                  t.fondo,
                  tema.id === t.id ? "ring-primary" : "ring-transparent hover:ring-border",
                )}
              >
                {tema.id === t.id ? (
                  <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-white text-[#111]">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Tu nombre</label>
          <input
            className={campo}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Familia González"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Mensaje</label>
          <input
            className={campo}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="¡Gracias por acompañarnos!"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {mensajesSugeridos.map((m) => (
              <button
                key={m}
                onClick={() => setMensaje(m)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Foto (opcional)</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFoto} className="hidden" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="size-4" /> {foto ? "Cambiar foto" : "Subir foto"}
            </Button>
            {foto ? (
              <Button variant="ghost" onClick={() => setFoto(null)}>
                Quitar
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Vista previa + acciones */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-24">
        <div className="mx-auto max-w-xs">
          <RecuerditoCard ref={cardRef} tema={tema} nombre={nombre} mensaje={mensaje} foto={foto} />
        </div>
        <div className="mx-auto mt-5 flex max-w-xs gap-2">
          <Button className="flex-1" onClick={descargar} disabled={ocupado}>
            {listo ? (
              <>
                <Check className="size-4" /> ¡Listo!
              </>
            ) : (
              <>
                <Download className="size-4" /> Descargar
              </>
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={compartir} disabled={ocupado}>
            <MessageCircle className="size-4" /> Compartir
          </Button>
        </div>
        <p className="mx-auto mt-3 max-w-xs text-center text-xs text-muted-foreground">
          Se guarda como imagen en tu teléfono. Compártela en WhatsApp o donde quieras.
        </p>
      </div>
    </div>
  );
}
