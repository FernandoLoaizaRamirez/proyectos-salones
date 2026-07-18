-- ============================================================================
-- 0002 · PLANO DE CONTROL (tablas nuevas — Fase 0)
-- ----------------------------------------------------------------------------
-- Crea el esqueleto de la plataforma multi-cliente SIN tocar la tabla `items`
-- ni las apps en vivo. Todo es ADITIVO: solo agrega tablas nuevas y su semilla.
--
--   tenants ............. el salón / cliente dueño de sus datos
--   tenant_members ...... usuarios del staff + su rol (se enlaza a Auth en Fase 1)
--   events .............. eventos reales (alta autenticada en Fase 1; el ?e= = codigo)
--   guests ............. invitados tipados (se usa a fondo en fases siguientes)
--   plans / features .... catálogo comercial (paquetes y funciones vendibles)
--   plan_features ....... qué funciones trae cada plan
--   tenant_entitlements . encender/apagar una función para un cliente
--   event_overrides ..... encender/apagar una función para un evento puntual
--
-- SEGURIDAD: todas estas tablas quedan con RLS activada y SIN políticas =
-- cerradas a cal y canto (solo el rol de servicio del backend las puede tocar).
-- Las políticas por tenant/rol se agregan en la Fase 1, cuando exista el login.
-- ============================================================================

create extension if not exists pgcrypto;   -- para gen_random_uuid()

-- --------------------------------------------------------------------------
-- CATÁLOGO COMERCIAL: planes y funciones
-- --------------------------------------------------------------------------
create table if not exists plans (
  id           text primary key,            -- 'gestionado' | 'renta' | 'compra'
  nombre       text not null,
  descripcion  text,
  orden        int  not null default 0,
  creado       timestamptz not null default now()
);

create table if not exists features (
  clave        text primary key,            -- 'muro','playlist','rsvp','dinamicas','album','sync-colectivo',…
  nombre       text not null,
  descripcion  text,
  creado       timestamptz not null default now()
);

create table if not exists plan_features (
  plan_id       text not null references plans(id)      on delete cascade,
  feature_clave text not null references features(clave) on delete cascade,
  primary key (plan_id, feature_clave)
);

-- --------------------------------------------------------------------------
-- TENENCIA: salón (tenant), miembros del staff, eventos, invitados
-- --------------------------------------------------------------------------
create table if not exists tenants (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique,           -- subdominio futuro: <slug>.suite-salones.app
  nombre    text not null,
  ciudad    text,
  logo_url  text,
  plan_id   text references plans(id),
  estado    text not null default 'activo', -- 'activo' | 'suspendido'
  creado    timestamptz not null default now()
);

create table if not exists tenant_members (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid not null,                 -- auth.users(id) — se valida en la Fase 1
  rol        text not null default 'staff', -- 'owner' | 'admin' | 'staff'
  creado     timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  codigo      text not null unique,         -- el ?e=<codigo> del enlace del invitado
  nombre      text not null,
  tipo        text,                         -- boda | xv | corporativo | bautizo | otro
  fecha       date,
  estado      text not null default 'activo', -- 'activo' | 'cerrado'
  created_by  uuid,
  creado      timestamptz not null default now()
);

create index if not exists events_tenant on events (tenant_id);

create table if not exists guests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  nombre       text not null,
  email        text,
  telefono     text,
  estado_rsvp  text not null default 'pendiente', -- pendiente | confirmado | rechazado
  creado       timestamptz not null default now()
);

create index if not exists guests_event on guests (event_id);

-- --------------------------------------------------------------------------
-- ENTITLEMENTS: overrides por cliente y por evento
-- --------------------------------------------------------------------------
create table if not exists tenant_entitlements (
  tenant_id     uuid not null references tenants(id)     on delete cascade,
  feature_clave text not null references features(clave) on delete cascade,
  habilitado    boolean not null,
  primary key (tenant_id, feature_clave)
);

create table if not exists event_overrides (
  event_id      uuid not null references events(id)      on delete cascade,
  feature_clave text not null references features(clave) on delete cascade,
  habilitado    boolean not null,
  primary key (event_id, feature_clave)
);

-- --------------------------------------------------------------------------
-- SEGURIDAD: RLS activada y SIN políticas = cerradas (solo service-role).
-- (En la Fase 1 se agregan políticas por tenant + rol.)
-- --------------------------------------------------------------------------
alter table plans               enable row level security;
alter table features            enable row level security;
alter table plan_features       enable row level security;
alter table tenants             enable row level security;
alter table tenant_members      enable row level security;
alter table events              enable row level security;
alter table guests              enable row level security;
alter table tenant_entitlements enable row level security;
alter table event_overrides     enable row level security;

-- ==========================================================================
-- SEMILLA (datos iniciales)
-- ==========================================================================

-- Los 3 modelos comerciales que ya viven en el catálogo.
insert into plans (id, nombre, descripcion, orden) values
  ('gestionado', 'Gestionado', 'Servicio en la nube: junta el contenido de todos los teléfonos en vivo.', 1),
  ('renta',      'Renta',      'Apps por evento en modo local (un dispositivo).',                          2),
  ('compra',     'Compra',     'Licencia propia de las apps en modo local.',                               3)
on conflict (id) do nothing;

-- Las funciones: los 5 módulos conectados hoy + la sincronización colectiva
-- (lo que distingue "gestionado" de "renta/compra") + realtime (a futuro).
insert into features (clave, nombre, descripcion) values
  ('muro',           'Muro de mensajes',         'Libro de firmas digital con modo pantalla.'),
  ('playlist',       'Playlist colaborativa',    'Los invitados piden y votan canciones.'),
  ('rsvp',           'Confirmación (RSVP)',      'Confirmación de asistencia en línea.'),
  ('dinamicas',      'Dinámicas y juegos',       'Trivia, bingo y rompehielos en vivo.'),
  ('album',          'Álbum de fotos',           'Los invitados suben fotos y videos por QR.'),
  ('sync-colectivo', 'Sincronización colectiva', 'Junta el contenido de todos los teléfonos en la nube (servicio gestionado).'),
  ('realtime',       'Tiempo real premium',      'Actualización instantánea por websockets (a futuro).')
on conflict (clave) do nothing;

-- Qué funciones trae cada plan.
--   gestionado = los 5 módulos + sync-colectivo (nube en vivo)
--   renta / compra = los 5 módulos en modo local (sin sync-colectivo)
insert into plan_features (plan_id, feature_clave) values
  ('gestionado','muro'), ('gestionado','playlist'), ('gestionado','rsvp'),
  ('gestionado','dinamicas'), ('gestionado','album'), ('gestionado','sync-colectivo'),
  ('renta','muro'), ('renta','playlist'), ('renta','rsvp'), ('renta','dinamicas'), ('renta','album'),
  ('compra','muro'), ('compra','playlist'), ('compra','rsvp'), ('compra','dinamicas'), ('compra','album')
on conflict do nothing;

-- Tenant "demo": dueño de las vitrinas públicas de hoy. UUID fijo y conocido
-- para que la migración 0003 lo pueda usar como valor por defecto de `items`.
insert into tenants (id, slug, nombre, ciudad, plan_id, estado) values
  ('d0000000-0000-4000-8000-000000000001', 'demo', 'Suite Salones (demo)', null, 'gestionado', 'activo')
on conflict (id) do nothing;

-- Evento "demo": adopta el evento que ya usan las apps públicas (?e ausente → "demo").
insert into events (id, tenant_id, codigo, nombre, tipo, estado) values
  ('e0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001',
   'demo', 'Demostración pública', 'otro', 'activo')
on conflict (codigo) do nothing;
