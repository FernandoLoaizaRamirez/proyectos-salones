"use client";

import * as React from "react";
import { Camera, Download, ImagePlus, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, cn } from "@salones/ui";

type Archivo = {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
};

export function Album() {
  const [archivos, setArchivos] = React.useState<Archivo[]>([]);
  const [arrastrando, setArrastrando] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const contador = React.useRef(0);

  const agregar = React.useCallback((lista: FileList | null) => {
    if (!lista) return;
    const nuevos: Archivo[] = Array.from(lista)
      .filter((a) => a.type.startsWith("image/") || a.type.startsWith("video/"))
      .map((a) => {
        contador.current += 1;
        return {
          id: `f-${contador.current}`,
          nombre: a.name,
          url: URL.createObjectURL(a),
          tipo: a.type,
        };
      });
    setArchivos((prev) => [...nuevos, ...prev]);
  }, []);

  const eliminar = React.useCallback((id: string) => {
    setArchivos((prev) => {
      const encontrado = prev.find((x) => x.id === id);
      if (encontrado) URL.revokeObjectURL(encontrado.url);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const descargarTodo = React.useCallback(() => {
    archivos.forEach((f) => {
      const a = document.createElement("a");
      a.href = f.url;
      a.download = f.nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }, [archivos]);

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          agregar(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-[var(--radius)] border-2 border-dashed border-border p-8 text-center transition-colors",
          arrastrando && "border-primary bg-muted",
        )}
      >
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-muted text-primary">
            <ImagePlus className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Sube tus fotos y videos</p>
            <p className="text-sm text-muted-foreground">
              Arrastra los archivos aquí o toca el botón. En este modo se quedan en tu
              dispositivo.
            </p>
          </div>
          <Button onClick={() => inputRef.current?.click()}>
            <Camera className="size-4" /> Elegir archivos
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => agregar(e.target.files)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {archivos.length} {archivos.length === 1 ? "archivo" : "archivos"} en el álbum
        </p>
        {archivos.length > 0 ? (
          <Button variant="outline" size="sm" onClick={descargarTodo}>
            <Download className="size-4" /> Descargar todo
          </Button>
        ) : null}
      </div>

      {archivos.length === 0 ? (
        <EmptyState
          icon={<Camera className="size-8" />}
          title="Todavía no hay fotos"
          description="Cuando los invitados suban sus fotos, aparecerán aquí en la galería en vivo."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {archivos.map((f) => (
            <Card key={f.id} className="group relative overflow-hidden">
              {f.tipo.startsWith("video/") ? (
                <video src={f.url} className="aspect-square w-full object-cover" controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.nombre} className="aspect-square w-full object-cover" />
              )}
              <button
                type="button"
                aria-label={`Eliminar ${f.nombre}`}
                onClick={() => eliminar(f.id)}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
