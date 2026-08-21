import type { Metadata } from "next";
import { Preloader } from "@/components/premium/preloader";
import { ScrollProgress } from "@/components/premium/scroll-progress";
import { NavPremium } from "@/components/premium/nav-premium";
import { HeroPremium } from "@/components/premium/hero-premium";
import { IntroPremium } from "@/components/premium/intro-premium";
import { EspaciosPremium } from "@/components/premium/espacios-premium";
import { EventosPremium } from "@/components/premium/eventos-premium";
import { StatsPremium } from "@/components/premium/stats-premium";
import { GaleriaPremium } from "@/components/premium/galeria-premium";
import { PaquetesPremium } from "@/components/premium/paquetes-premium";
import { TestimoniosPremium } from "@/components/premium/testimonios-premium";
import { ContactoPremium } from "@/components/premium/contacto-premium";
import { PuertaInvitado } from "@/components/puerta-invitado";
import { Footer } from "@/components/footer";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { VersionSwitch } from "@/components/version-switch";

export const metadata: Metadata = {
  title: "Experiencia inmersiva · Hacienda Santa Renata",
  description:
    "La versión inmersiva del sitio: una experiencia cinematográfica de gala nocturna, con carrusel, parallax e interacción.",
};

export default function PremiumPage() {
  return (
    <div className="premium min-h-screen bg-background text-foreground">
      <Preloader />
      <ScrollProgress />
      <NavPremium />
      <main>
        <HeroPremium />
        <IntroPremium />
        <EspaciosPremium />
        <EventosPremium />
        <StatsPremium />
        <GaleriaPremium />
        <PaquetesPremium />
        <TestimoniosPremium />
        <ContactoPremium />
        <PuertaInvitado />
      </main>
      <Footer />
      <WhatsappFab />
      <VersionSwitch href="/" label="Versión clásica" />
    </div>
  );
}
