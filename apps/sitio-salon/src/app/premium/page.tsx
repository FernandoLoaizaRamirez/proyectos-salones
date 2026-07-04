import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { HeroPremium } from "@/components/premium/hero-premium";
import { Intro } from "@/components/intro";
import { EspaciosPremium } from "@/components/premium/espacios-premium";
import { Eventos } from "@/components/eventos";
import { StatsPremium } from "@/components/premium/stats-premium";
import { GaleriaPremium } from "@/components/premium/galeria-premium";
import { Paquetes } from "@/components/paquetes";
import { Testimonios } from "@/components/testimonios";
import { Contacto } from "@/components/contacto";
import { Footer } from "@/components/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { VersionSwitch } from "@/components/version-switch";
import { Preloader } from "@/components/premium/preloader";

export const metadata: Metadata = {
  title: "Experiencia inmersiva · Hacienda Santa Renata",
  description: "La versión inmersiva del sitio, con WebGL, parallax e interacción.",
};

export default function PremiumPage() {
  return (
    <>
      <Preloader />
      <Nav />
      <main>
        <HeroPremium />
        <Intro />
        <EspaciosPremium />
        <Eventos />
        <StatsPremium />
        <GaleriaPremium />
        <Paquetes />
        <Testimonios />
        <Contacto />
      </main>
      <Footer />
      <WhatsappFab />
      <VersionSwitch href="/" label="Versión clásica" />
    </>
  );
}
