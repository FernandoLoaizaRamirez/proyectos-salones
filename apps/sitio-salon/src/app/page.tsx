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
import { Footer } from "@/components/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { VersionSwitch } from "@/components/version-switch";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Intro />
        <Espacios />
        <Eventos />
        <Stats />
        <Galeria />
        <Paquetes />
        <Testimonios />
        <Contacto />
      </main>
      <Footer />
      <WhatsappFab />
      <VersionSwitch href="/premium" label="Versión inmersiva" />
    </>
  );
}
