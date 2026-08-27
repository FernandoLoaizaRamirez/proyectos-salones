/**
 * MÓDULO "MI PASE" (dentro del portal) — datos y utilidades.
 *
 * El pase del invitado deja de vivir solo en el enlace de WhatsApp: si este
 * teléfono ya sabe quién es (perfil del enlace personal, o su nombre dicho en
 * cualquier módulo), su boleto con QR aparece aquí, dentro de la experiencia y
 * con la marca del salón.
 *
 * Los datos los ESCRIBE el panel del salón ("mandar a la puerta" sube la lista
 * a la colección `pases`, la misma que lee la app de la puerta); aquí solo se
 * LEEN y se normalizan — cualquiera con el enlace puede dar de alta filas en
 * cualquier colección (migración 0016), así que nada se pinta sin filtrar.
 *
 * EL QR ES EL DE VERDAD: `contenidoQRPase` de @salones/core, la MISMA receta
 * que usa la puerta. El boleto del portal se escanea en la entrada igual que
 * el del enlace.
 */
import { idPaseDeInvitado, normalizarNombre } from "@salones/core";

export { contenidoQRPase, idPaseDeInvitado } from "@salones/core";

/** Colección compartida en el lugar central (la misma que usa `apps/pases-qr`). */
export const COLECCION_PASES = "pases";

/** Los dos tipos de acceso que la puerta distingue. */
export type TipoPase = "General" | "VIP";

/** Un pase tal como viaja en la colección (misma forma que en la puerta). */
export type PaseInvitado = {
  id: string;
  nombre: string;
  mesa: string;
  personas: number;
  tipo: TipoPase;
};

/**
 * Convierte lo que venga de la colección en pases que se puedan pintar. Filas
 * sin id o sin nombre se descartan; números y tipos raros caen a lo prudente
 * (1 persona, acceso General) — mejor un boleto modesto que una pantalla rota.
 */
export function normalizarPasesCrudos(items: { id: string; [k: string]: unknown }[]): PaseInvitado[] {
  return items
    .filter((i) => typeof i.id === "string" && i.id && typeof i.nombre === "string" && i.nombre)
    .map((i) => ({
      id: i.id,
      nombre: i.nombre as string,
      mesa: typeof i.mesa === "string" ? i.mesa : "",
      personas:
        typeof i.personas === "number" && i.personas > 0 ? Math.floor(i.personas) : 1,
      tipo: i.tipo === "VIP" ? "VIP" : "General",
    }));
}

/**
 * Los 8 pases de la MUESTRA — los mismos de la app de la puerta (ids `SR-…`
 * idénticos), para que la vitrina cuente una sola boda entre por donde se
 * entre. Jamás se escriben al almacén: sus ids fijos chocarían con la llave
 * primaria global de `items` y toda boda real nacería con invitados falsos.
 */
export const PASES_MUESTRA: PaseInvitado[] = [
  { id: "SR-1042", nombre: "Ana Herrera Medina", mesa: "1", personas: 2, tipo: "VIP" },
  { id: "SR-1043", nombre: "Rodrigo Salazar Ruiz", mesa: "1", personas: 2, tipo: "VIP" },
  { id: "SR-2087", nombre: "Familia Loaiza Ramírez", mesa: "4", personas: 4, tipo: "General" },
  { id: "SR-2091", nombre: "Valentina Montes", mesa: "6", personas: 1, tipo: "General" },
  { id: "SR-2104", nombre: "Grupo Alvarado", mesa: "8", personas: 3, tipo: "General" },
  { id: "SR-2115", nombre: "Carlos y Diana Pérez", mesa: "5", personas: 2, tipo: "General" },
  { id: "SR-2151", nombre: "Miguel Ángel Torres", mesa: "3", personas: 2, tipo: "VIP" },
  { id: "SR-2168", nombre: "Regina y José", mesa: "7", personas: 2, tipo: "General" },
];

/** El pase de muestra que se enseña al visitante de la vitrina sin perfil. */
export const PASE_EJEMPLO = PASES_MUESTRA[3]!; // Valentina Montes

/**
 * EL PASE DE ESTE TELÉFONO, si se puede afirmar sin duda.
 *
 *   1. Por ID — el camino fuerte: el perfil trae el id del renglón del
 *      anfitrión (llegó con enlace personal) y su pase es la fila
 *      `PS-<uuid>` (o el id tal cual, para los `SR-…` de la puerta).
 *   2. Por NOMBRE — solo si la coincidencia es EXACTA (sin acentos ni
 *      mayúsculas) y ÚNICA. El QR abre la puerta del evento: enseñarle a
 *      alguien el pase equivocado por un nombre parecido sería peor que
 *      pedirle que pregunte en la entrada.
 */
export function miPase(
  perfil: { id?: string; nombre: string } | null,
  pases: PaseInvitado[],
): PaseInvitado | null {
  if (!perfil) return null;
  if (perfil.id) {
    const idFila = idPaseDeInvitado(perfil.id);
    const porId = pases.find((p) => p.id === idFila || p.id === perfil.id);
    if (porId) return porId;
  }
  if (!perfil.nombre.trim()) return null;
  const buscado = normalizarNombre(perfil.nombre);
  const exactos = pases.filter((p) => normalizarNombre(p.nombre) === buscado);
  return exactos.length === 1 ? exactos[0]! : null;
}

/** "Mesa 4" sin repetir la palabra si el salón ya bautizó la mesa. */
export function etiquetaMesa(mesa: string): string {
  const limpia = mesa.trim();
  if (!limpia) return "";
  return /^mesa/i.test(limpia) ? limpia : `Mesa ${limpia}`;
}
