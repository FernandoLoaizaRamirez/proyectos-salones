"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { invitacion, tituloEvento } from "@/lib/invitacion";

export function Rsvp() {
  const [nombre, setNombre] = React.useState("");
  const [asiste, setAsiste] = React.useState<"si" | "no" | "">("");
  const [personas, setPersonas] = React.useState("1");
  const [mensaje, setMensaje] = React.useState("");
  const [error, setError] = React.useState("");

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nombre.trim() || !asiste) {
      setError("Escribe tu nombre e indícanos si podrás asistir.");
      return;
    }
    setError("");
    const lineas = [
      `Confirmación de asistencia · ${tituloEvento()}`,
      "",
      `Nombre: ${nombre}`,
      `¿Asistiré?: ${asiste === "si" ? "Sí, ahí estaré" : "No podré asistir"}`,
      asiste === "si" ? `Número de personas: ${personas}` : "",
      mensaje ? `Mensaje: ${mensaje}` : "",
    ].filter(Boolean);
    const url = `https://wa.me/${invitacion.rsvp.whatsapp}?text=${encodeURIComponent(lineas.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const campo =
    "w-full rounded-[var(--radius)] border border-cream/30 bg-cream/10 px-4 py-2.5 text-sm text-cream outline-none placeholder:text-cream/60 focus:border-cream/70";

  return (
    <section id="rsvp" className="bg-sage text-cream">
      <div className="mx-auto max-w-xl px-6 py-24 text-center md:py-28">
        <p className="eyebrow text-cream/90">Confirma tu asistencia</p>
        <h2 className="mt-4 font-display text-4xl italic md:text-5xl">¿Nos acompañas?</h2>
        <p className="mt-3 text-cream/85">
          Tu presencia es muy importante para nosotros. Por favor confirma antes del{" "}
          {invitacion.rsvp.fechaLimite}.
        </p>

        <form onSubmit={enviar} className="mt-10 space-y-4 text-left">
          <div>
            <label className="mb-1.5 block text-sm text-cream/90">Tu nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              className={campo}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm text-cream/90">¿Podrás acompañarnos?</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAsiste("si")}
                aria-pressed={asiste === "si"}
                className={`rounded-[var(--radius)] border px-4 py-2.5 text-sm transition-colors ${
                  asiste === "si"
                    ? "border-cream bg-cream text-[#2c2a25]"
                    : "border-cream/30 text-cream hover:bg-cream/10"
                }`}
              >
                Sí, ahí estaré
              </button>
              <button
                type="button"
                onClick={() => setAsiste("no")}
                aria-pressed={asiste === "no"}
                className={`rounded-[var(--radius)] border px-4 py-2.5 text-sm transition-colors ${
                  asiste === "no"
                    ? "border-cream bg-cream text-[#2c2a25]"
                    : "border-cream/30 text-cream hover:bg-cream/10"
                }`}
              >
                No podré asistir
              </button>
            </div>
          </div>

          {asiste === "si" ? (
            <div>
              <label className="mb-1.5 block text-sm text-cream/90">¿Cuántas personas asistirán?</label>
              <select value={personas} onChange={(e) => setPersonas(e.target.value)} className={campo}>
                {["1", "2", "3", "4", "5"].map((n) => (
                  <option key={n} value={n} className="text-[#2c2a25]">
                    {n} {n === "1" ? "persona" : "personas"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm text-cream/90">Mensaje (opcional)</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={3}
              placeholder="Un mensaje para los novios"
              className={campo}
            />
          </div>

          {error ? <p className="text-sm text-cream">{error}</p> : null}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-cream px-5 py-3 text-sm font-medium text-[#2c2a25] transition-opacity hover:opacity-90"
          >
            <MessageCircle className="size-4" /> Enviar confirmación por WhatsApp
          </button>
        </form>
      </div>
    </section>
  );
}
