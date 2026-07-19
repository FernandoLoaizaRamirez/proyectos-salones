-- ============================================================================
-- 0006 · BRANDING POR SALÓN (tema en runtime — Fase 3, semilla, ADITIVO)
-- ----------------------------------------------------------------------------
-- Guarda el branding de cada salón (tenant) para pintarlo EN VIVO sin recompilar:
-- nombre de marca, logo, colores y redondeo. El código de @salones/ui ya sabe
-- inyectarlo como variables CSS (BrandingScope / brandingAVariables); esta tabla
-- es de DÓNDE saldrán esos datos, en vez de estar escritos en el código.
--
--   tenant_branding(tenant_id, nombre, logo_url, primario, primario_texto,
--                   acento, radio)
--
-- LECTURA PÚBLICA a propósito: el branding NO es secreto (el invitado ve el logo
-- y los colores del salón de todos modos). Por eso lleva una política que permite
-- SELECT a cualquiera con la llave pública. La ESCRITURA queda cerrada (sin
-- política de insert/update/delete = solo el rol de servicio): editar la marca
-- desde la web es un paso posterior (con login + rol). Es la PRIMERA tabla del
-- plano de control con lectura abierta; las demás siguen cerradas.
--
-- Es ADITIVA: solo crea una tabla nueva; no toca `items`, ni las apps en vivo,
-- ni el resto del plano de control.
-- ============================================================================

create table if not exists tenant_branding (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  nombre          text,          -- nombre de marca (si difiere del tenant)
  logo_url        text,          -- logo del salón (URL)
  primario        text,          -- color CSS (oklch/hex/rgb)  → --primary
  primario_texto  text,          -- texto sobre el primario     → --primary-fg
  acento          text,          -- color de acento             → --accent / --ring
  radio           text,          -- redondeo, p. ej. '0.4rem'   → --radius
  actualizado     timestamptz not null default now()
);

-- RLS activada.
alter table tenant_branding enable row level security;

-- LECTURA PÚBLICA (branding = información pública). Idempotente.
drop policy if exists tenant_branding_lectura_publica on tenant_branding;
create policy tenant_branding_lectura_publica
  on tenant_branding for select
  using (true);

-- La llave pública (anon) y las sesiones (authenticated) pueden LEER; nadie
-- escribe por aquí (sin política de escritura = solo service-role).
grant select on tenant_branding to anon, authenticated;

-- --------------------------------------------------------------------------
-- SEMILLA: branding del salón demo (tema "Vino & Oro", el mismo de la vitrina).
-- --------------------------------------------------------------------------
insert into tenant_branding
  (tenant_id, nombre, logo_url, primario, primario_texto, acento, radio) values
  ('d0000000-0000-4000-8000-000000000001',
   'Suite Salones (demo)', null,
   'oklch(0.45 0.11 15)', 'oklch(0.98 0.01 90)', 'oklch(0.74 0.11 85)', '0.4rem')
on conflict (tenant_id) do nothing;
