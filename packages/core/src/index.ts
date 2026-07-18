/**
 * @salones/core — Vocabulario común de datos de la suite.
 *
 * Aquí vive la "fuente de verdad" del dominio: qué es un Evento, un Invitado,
 * una Mesa, etc. Todas las apps usan estos tipos para hablar el mismo idioma,
 * aunque cada una guarde sus datos por separado.
 *
 * A partir de la plataforma multi-cliente, este paquete deja de ser decorativo y
 * pasa a ser protagonista: además del dominio del evento, define la TENENCIA
 * (Tenant / User / Role — ver ./tenencia) y el motor de ENTITLEMENTS
 * (Plan / Feature / resolveEntitlements — ver ./entitlements). Todo es código
 * PURO (solo depende de `zod`), así que corre igual en el cliente y en el servidor.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Catálogos                                                          */
/* ------------------------------------------------------------------ */

export const TipoEvento = {
  Boda: "boda",
  XV: "xv",
  Corporativo: "corporativo",
  Bautizo: "bautizo",
  Otro: "otro",
} as const;
export type TipoEvento = (typeof TipoEvento)[keyof typeof TipoEvento];

export const EstadoRSVP = {
  Pendiente: "pendiente",
  Confirmado: "confirmado",
  Rechazado: "rechazado",
} as const;
export type EstadoRSVP = (typeof EstadoRSVP)[keyof typeof EstadoRSVP];

/**
 * Modo de venta / licenciamiento. Reservado para más adelante: la maquinaria
 * de cobros y licencias aún no está construida, pero el dominio ya conoce
 * estos tres modos para que entre limpia cuando toque.
 */
export const AppMode = {
  Managed: "MANAGED",
  Rental: "RENTAL",
  Owned: "OWNED",
} as const;
export type AppMode = (typeof AppMode)[keyof typeof AppMode];

/* ------------------------------------------------------------------ */
/* Esquemas y tipos                                                   */
/* ------------------------------------------------------------------ */

export const SalonSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  ciudad: z.string().optional(),
  logoUrl: z.string().url().optional(),
});
export type Salon = z.infer<typeof SalonSchema>;

export const AnfitrionSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
});
export type Anfitrion = z.infer<typeof AnfitrionSchema>;

export const InvitadoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string().email().optional(),
  telefono: z.string().optional(),
  acompanantes: z.number().int().min(0).default(0),
  estadoRsvp: z
    .enum([EstadoRSVP.Pendiente, EstadoRSVP.Confirmado, EstadoRSVP.Rechazado])
    .default(EstadoRSVP.Pendiente),
  mesaId: z.string().optional(),
  grupo: z.string().optional(),
});
export type Invitado = z.infer<typeof InvitadoSchema>;

export const MesaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  capacidad: z.number().int().min(1),
});
export type Mesa = z.infer<typeof MesaSchema>;

export const ProveedorSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  categoria: z.string(),
  contacto: z.string().optional(),
});
export type Proveedor = z.infer<typeof ProveedorSchema>;

export const EventoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tipo: z.enum([
    TipoEvento.Boda,
    TipoEvento.XV,
    TipoEvento.Corporativo,
    TipoEvento.Bautizo,
    TipoEvento.Otro,
  ]),
  fecha: z.string().describe("Fecha del evento en formato ISO (AAAA-MM-DD)"),
  salonId: z.string().optional(),
  anfitrionId: z.string().optional(),
});
export type Evento = z.infer<typeof EventoSchema>;

/* ------------------------------------------------------------------ */
/* Plataforma multi-cliente: tenencia + entitlements                  */
/* ------------------------------------------------------------------ */

export * from "./tenencia";
export * from "./entitlements";
