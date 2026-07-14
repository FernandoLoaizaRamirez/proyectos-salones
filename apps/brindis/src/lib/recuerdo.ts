/**
 * Arma el "VIDEO RECUERDO": junta una portada + todos los brindis + música en un
 * solo video vertical, que Shotstack renderiza en la nube.
 *
 * Los "Smart Clips" de Shotstack (start:"auto" + length:"auto") encadenan los
 * videos uno tras otro respetando la duración de cada uno, sin que tengamos que
 * saberla de antemano (los brindis duran distinto).
 *
 * TODO editable: música, texto de la portada y colores.
 */
import { evento } from "@/lib/brindis";

/** Música de fondo (asset público de ejemplo). Cámbiala por la que prefieras. */
const MUSICA = "https://s3-ap-southeast-2.amazonaws.com/shotstack-assets/music/moment.mp3";

type Clip = {
  asset: Record<string, unknown>;
  start: number | "auto";
  length: number | "auto";
  fit?: string;
  transition?: { in?: string; out?: string };
};

/** Construye el edit JSON de Shotstack a partir de las URLs de los brindis. */
export function construirEdit(urls: string[]): Record<string, unknown> {
  const portada: Clip = {
    asset: {
      type: "text",
      text: `Un brindis para\n${evento.nombre}`,
      font: { family: "Montserrat ExtraBold", color: "#f4e3a1", size: 44 },
      alignment: { horizontal: "center", vertical: "center" },
    },
    start: 0,
    length: 3,
    transition: { out: "fade" },
  };

  const clips: Clip[] = urls.map((src) => ({
    asset: { type: "video", src },
    start: "auto",
    length: "auto",
    fit: "crop",
    transition: { in: "fade", out: "fade" },
  }));

  return {
    timeline: {
      background: "#0b0b0b",
      soundtrack: { src: MUSICA, effect: "fadeInFadeOut" },
      tracks: [{ clips: [portada, ...clips] }],
    },
    output: {
      format: "mp4",
      size: { width: 1080, height: 1920 },
    },
  };
}
