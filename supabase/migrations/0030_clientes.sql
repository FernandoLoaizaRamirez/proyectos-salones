-- ============================================================================
-- 0030 — LA FICHA DE CLIENTES DEL SALÓN (Etapa 3, pieza 1 — 27 ago 2026)
--
-- El hueco que el mapa del Prompt Maestro señaló: el organizador existía como
-- LLAVE (clave_anfitrion) pero no como PERSONA. El salón no tenía dónde
-- apuntar "esta boda es de Carmen Medina, tel 667…" — su CRM era WhatsApp.
--
-- Diseño mínimo y suficiente:
--   · `clients`: la persona que contrata (nombre, teléfono, correo, notas),
--     acotada por salón — el mismo aislamiento de siempre (0008).
--   · `events.client_id`: cada evento puede señalar a su cliente. `on delete
--     set null`: borrar la ficha de una persona NO borra su boda.
--   · Escribe CUALQUIER miembro del salón (igual que events y guests: capturar
--     clientes es trabajo de mostrador, no de administrador).
--
-- Semillas: la boda de muestra gana su cliente (Carmen & Luis) para que la
-- cuenta de muestra enseñe la ficha llena, y la demo real gana el suyo.
-- ============================================================================

create table if not exists clients (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nombre    text not null,
  telefono  text,
  email     text,
  notas     text,
  creado    timestamptz not null default now()
);

create index if not exists clients_tenant_idx on clients (tenant_id);

alter table events
  add column if not exists client_id uuid references clients(id) on delete set null;

alter table clients enable row level security;

-- Un solo predicado para leer y escribir: miembros del salón dueño. (El
-- patrón de una política `for all` con using = with check — la lección de la
-- 0025: predicados copiados divergen en silencio.)
drop policy if exists clients_staff on clients;
create policy clients_staff on clients for all to authenticated
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

grant select, insert, update, delete on clients to authenticated;

-- ── Semillas (idempotentes) ─────────────────────────────────────────────────

-- El cliente de la caja de arena: la ficha que ve la cuenta de muestra.
insert into clients (id, tenant_id, nombre, telefono, notas) values
  ('ac000000-0000-4000-8000-000000000001',
   'aa000000-0000-4000-8000-000000000001',
   'Carmen Medina y Luis Ortega', '6671112233',
   'Cliente de muestra: su boda es la que ves en "Mis eventos".')
on conflict (id) do update set
  nombre = excluded.nombre, telefono = excluded.telefono, notas = excluded.notas;

update events
   set client_id = 'ac000000-0000-4000-8000-000000000001'
 where codigo = 'boda-de-muestra' and client_id is distinct from 'ac000000-0000-4000-8000-000000000001';

-- El cliente de la demo real (los novios de la muestra de toda la suite).
insert into clients (id, tenant_id, nombre, telefono) values
  ('ad000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001',
   'Ana Herrera y Rodrigo Salazar', '6673349236')
on conflict (id) do update set
  nombre = excluded.nombre, telefono = excluded.telefono;

update events
   set client_id = 'ad000000-0000-4000-8000-000000000001'
 where codigo = 'demo' and client_id is distinct from 'ad000000-0000-4000-8000-000000000001';
