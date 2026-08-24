import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { Intro } from "@/components/intro";
import { Espacios } from "@/components/espacios";
import { Eventos } from "@/components/eventos";
import { Stats } from "@/components/stats";
import { Galeria } from "@/components/galeria";
import { Paquetes } from "@/components/paquetes";
import { Testimonios } from "@/components/testimonios";
import { Contacto } from "@/components/contacto";
import { ExperienciaEventos } from "@/components/experiencia-eventos";
import { PuertaInvitado } from "@/components/puerta-invitado";
import { Footer } from "@/components/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { VersionSwitch } from "@/components/version-switch";

export default function Page() {
  return (
    <>
      <Nav />
      {/* `pb-24` en celular: el boton flotante de WhatsApp se sentaba
          encima del ultimo renglon de cada seccion (una frase cortada a media
          palabra en Paquetes, el campo Mensaje en Contacto). */}
      <main className="pb-24 md:pb-0">
        <Hero />
        <Intro />
        <Espacios />
        <Eventos />
        <Stats />
        <Galeria />
        <Paquetes />
        <Testimonios />
        <Contacto />
        {/* El bloque digital: primero se vende la experiencia, luego se entra. */}
        <ExperienciaEventos />
        <PuertaInvitado />
      </main>
      <Footer />
      <WhatsappFab />
      <VersionSwitch href="/premium" label="Versión inmersiva" />
    </>
  );
}
