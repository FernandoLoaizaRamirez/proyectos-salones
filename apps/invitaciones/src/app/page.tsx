import { Hero } from "@/components/hero";
import { Frase } from "@/components/frase";
import { Detalles } from "@/components/detalles";
import { Itinerario } from "@/components/itinerario";
import { Vestimenta } from "@/components/vestimenta";
import { Galeria } from "@/components/galeria";
import { Rsvp } from "@/components/rsvp";
import { Footer } from "@/components/footer";

export default function Page() {
  return (
    <main>
      <Hero />
      <Frase />
      <Detalles />
      <Itinerario />
      <Vestimenta />
      <Galeria />
      <Rsvp />
      <Footer />
    </main>
  );
}
