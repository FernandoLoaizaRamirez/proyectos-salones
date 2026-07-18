-- ============================================================================
-- 0005 · PAGOS (Stripe) — tabla de suscripciones (Fase 1, ADITIVO)
-- ----------------------------------------------------------------------------
-- La plomería de cobros queda LISTA PERO APAGADA detrás de la bandera
-- PAGOS_ACTIVOS (por defecto "false"). Esta tabla guarda el vínculo entre un
-- salón (tenant) y su suscripción de Stripe:
--
--   subscriptions(tenant_id, stripe_customer, stripe_subscription, plan_id, estado)
--
-- HOY nadie escribe aquí. El webhook (apps/catalogo/.../stripe/webhook) la usará
-- cuando se encienda el cobro; mientras tanto responde "cobros desactivados".
--
-- Es ADITIVA: solo crea una tabla nueva; no cambia nada de lo existente ni toca
-- `items` ni las apps en vivo.
--
-- SEGURIDAD: nace con RLS activada y SIN políticas = cerrada a cal y canto. Solo
-- el rol de servicio (service-role, desde el webhook del servidor) la puede
-- tocar. Las políticas por tenant/rol se agregarán con el resto del plano de
-- control cuando exista el login (Fase 1).
-- ============================================================================

create extension if not exists pgcrypto;   -- para gen_random_uuid() (idempotente)

create table if not exists subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  stripe_customer     text,               -- cliente en Stripe        (cus_...)
  stripe_subscription text unique,        -- suscripción en Stripe    (sub_...)
  plan_id             text references plans(id),
  estado              text not null default 'incompleta', -- incompleta|activa|cancelada|impaga
  creado              timestamptz not null default now(),
  actualizado         timestamptz not null default now()
);

create index if not exists subscriptions_tenant on subscriptions (tenant_id);

-- RLS activada y SIN políticas = cerrada (solo service-role).
alter table subscriptions enable row level security;
