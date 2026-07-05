import { invitacion, tituloEvento } from "@/lib/invitacion";

export function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-display text-4xl italic text-gold">{tituloEvento()}</p>
        <p className="mt-4 text-sm tracking-[0.3em] text-muted-foreground">{invitacion.hashtag}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          {invitacion.fechaTexto} · {invitacion.ciudad}
        </p>
        <p className="mt-10 text-xs text-muted-foreground">
          Invitación digital · Suite para Salones
        </p>
      </div>
    </footer>
  );
}
