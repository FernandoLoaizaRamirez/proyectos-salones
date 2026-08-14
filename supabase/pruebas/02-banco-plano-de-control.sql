-- ============================================================================
-- Banco del PLANO DE CONTROL: lo justo de la base real para poder correr la
-- 0017 (paquete de video) y la 0018 (cupo de almacenamiento).
--
-- Hermano de `00-banco.sql`, que reproduce la tabla `items`. Este reproduce la
-- otra mitad: planes, funciones vendibles, eventos y un doble de
-- `storage.objects` — que es de donde la 0018 saca los bytes de verdad.
--
-- YA SIRVIO DE ALGO: la primera corrida cazo que `cupo_bytes_del_evento` le daba
-- 3 GB a un evento INEXISTENTE en vez de 0, o sea que fallaba abierto. Se
-- arreglo antes de que el SQL tocara produccion.
--
-- Se corre antes que las migraciones:
--   psql ... -f supabase/pruebas/02-banco-plano-de-control.sql
--   psql ... -v ON_ERROR_STOP=1 -f supabase/migrations/0017_paquete_video.sql
--   psql ... -v ON_ERROR_STOP=1 -f supabase/migrations/0018_cupo_almacenamiento.sql
--   psql ... -f supabase/pruebas/03-cupo-0018.sql     <- todo tiene que decir OK
-- ============================================================================
create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon')          then create role anon;          end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role')  then create role service_role;  end if;
end $$;

-- --- Plano de control (0002, recortado) -------------------------------------
create table plans    (id text primary key, nombre text not null, descripcion text, orden int default 0, creado timestamptz default now());
create table features (clave text primary key, nombre text not null, descripcion text, creado timestamptz default now());
create table plan_features (plan_id text references plans(id), feature_clave text references features(clave), primary key (plan_id, feature_clave));
create table tenants  (id uuid primary key default gen_random_uuid(), slug text unique, nombre text, plan_id text references plans(id));
create table events   (id uuid primary key default gen_random_uuid(), tenant_id uuid references tenants(id) on delete cascade, codigo text unique, nombre text, estado text default 'activo');
create table tenant_entitlements (tenant_id uuid references tenants(id) on delete cascade, feature_clave text references features(clave), habilitado boolean not null, primary key (tenant_id, feature_clave));
create table event_overrides     (event_id  uuid references events(id)  on delete cascade, feature_clave text references features(clave), habilitado boolean not null, primary key (event_id, feature_clave));

insert into plans (id, nombre, orden) values ('gestionado','Gestionado',1), ('renta','Renta',3), ('compra','Compra',4);
insert into features (clave, nombre) values
  ('muro','Muro'),('playlist','Playlist'),('rsvp','Rsvp'),('dinamicas','Dinamicas'),('album','Album'),('sync-colectivo','Sync');
insert into plan_features (plan_id, feature_clave) values
  ('gestionado','muro'),('gestionado','playlist'),('gestionado','rsvp'),
  ('gestionado','dinamicas'),('gestionado','album'),('gestionado','sync-colectivo');

-- --- Doble del almacen de Supabase ------------------------------------------
create schema if not exists storage;
create table storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text,
  name      text,
  metadata  jsonb
);

-- --- Datos de prueba ---------------------------------------------------------
insert into tenants (id, slug, nombre, plan_id) values
  ('d0000000-0000-4000-8000-000000000001','salon-fotos','Salon solo fotos','gestionado');
insert into events (id, tenant_id, codigo, nombre) values
  ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','boda-fotos','Boda solo fotos'),
  ('e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001','boda-video','Boda con video'),
  ('e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000001','demo','Demostracion');
