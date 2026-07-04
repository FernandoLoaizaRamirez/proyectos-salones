"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { salon } from "@/lib/salon";

/**
 * Formulario de contacto funcional: arma un mensaje con los datos y abre WhatsApp
 * hacia el número del salón. Sin servidor ni costo; el mensaje llega al instante.
 * (Para un cliente real, basta con poner su número de WhatsApp en salon.ts.)
 */
export function ContactForm() {
  const [nombre, setNombre] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [tipo, setTipo] = React.useState("");
  const [fecha, setFecha] = React.useState("");
  const [mensaje, setMensaje] = React.useState("");
  const [error, setError] = React.useState("");

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      setError("Por favor escribe al menos tu nombre y teléfono.");
      return;
    }
    setError("");
    const lineas = [
      `Hola, me interesa información sobre eventos en ${salon.nombre}.`,
      "",
      `Nombre: ${nombre}`,
      `Teléfono: ${telefono}`,
      tipo ? `Tipo de evento: ${tipo}` : "",
      fecha ? `Fecha tentativa: ${fecha}` : "",
      mensaje ? `Mensaje: ${mensaje}` : "",
    ].filter(Boolean);
    const url = `https://wa.me/${salon.whatsapp}?text=${encodeURIComponent(lineas.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Formulario de contacto">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" value={nombre} onChange={setNombre} placeholder="Tu nombre" required />
        <Field
          label="Teléfono"
          value={telefono}
          onChange={setTelefono}
          placeholder="Tu teléfono"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de evento" value={tipo} onChange={setTipo} placeholder="Boda, XV años…" />
        <Field
          label="Fecha tentativa"
          value={fecha}
          onChange={setFecha}
          placeholder="Ej. 15 mar 2027"
        />
      </div>
      <div>
        <label htmlFor="cf-msg" className="mb-1.5 block text-sm">
          Mensaje
        </label>
        <textarea
          id="cf-msg"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={4}
          placeholder="Número de invitados y cualquier detalle"
          className="w-full rounded-[var(--radius)] border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </div>
      {error ? <p className="text-sm text-wine">{error}</p> : null}
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-primary px-5 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
      >
        <MessageCircle className="size-4" /> Enviar por WhatsApp
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Se abrirá WhatsApp con tu mensaje listo para enviar a {salon.nombre}.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm">
        {label}
        {required ? <span className="text-wine"> *</span> : null}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-[var(--radius)] border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
    </div>
  );
}
