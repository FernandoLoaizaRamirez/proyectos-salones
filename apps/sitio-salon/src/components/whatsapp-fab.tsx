import { MessageCircle } from "lucide-react";
import { salon } from "@/lib/salon";

export function WhatsappFab() {
  const mensaje = encodeURIComponent(`Hola, me interesa información sobre eventos en ${salon.nombre}.`);
  const href = `https://wa.me/${salon.whatsapp}?text=${mensaje}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="size-5" />
      <span className="hidden text-sm font-medium sm:inline">WhatsApp</span>
    </a>
  );
}
