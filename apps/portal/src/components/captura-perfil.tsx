"use client";

/**
 * Captura silenciosa del enlace personal del invitado.
 *
 * El anfitrión reparte enlaces con la identidad en el fragmento (`#`), y no hay
 * forma de saber por cuál puerta va a entrar cada quien: la portada, directo al
 * RSVP, a su mesa… Este componente se monta en TODAS las páginas del portal y,
 * sin pintar nada, guarda el perfil en cuanto el `#` aparece — al montar y en
 * cada `hashchange`, porque abrir un enlace personal con el portal ya abierto
 * solo cambia el fragmento y no recarga la página.
 */
import * as React from "react";
import { capturarPerfilDeHash } from "@/lib/perfil";

export function CapturaPerfil({ evento }: { evento: string }) {
  React.useEffect(() => {
    const capturar = () => void capturarPerfilDeHash(evento);
    capturar();
    window.addEventListener("hashchange", capturar);
    return () => window.removeEventListener("hashchange", capturar);
  }, [evento]);

  return null;
}
