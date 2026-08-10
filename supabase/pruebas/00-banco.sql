-- Banco de pruebas: recrea lo justo de la base real para poder correr la 0016.
\set ON_ERROR_STOP on

create table if not exists items (
  evento     text not null,
  coleccion  text not null,
  id         text primary key,
  dato       jsonb not null default '{}',
  creado     timestamptz not null default now()
);
alter table items add column if not exists module     text;
alter table items add column if not exists created_by uuid;
alter table items add column if not exists tenant_id  uuid;
alter table items alter column tenant_id set default 'd0000000-0000-4000-8000-000000000001';

-- El disparador de la 0003, tal cual.
create or replace function items_completar_campos()
returns trigger language plpgsql as $$
begin
  if new.module is null then
    new.module := case new.coleccion
      when 'mensajes'   then 'muro'
      when 'canciones'  then 'playlist'
      when 'respuestas' then 'rsvp'
      when 'ranking'    then 'dinamicas'
      when 'fotos'      then 'album'
      else new.coleccion
    end;
  end if;
  if new.tenant_id is null then
    new.tenant_id := 'd0000000-0000-4000-8000-000000000001';
  end if;
  return new;
end $$;
drop trigger if exists trg_items_completar_campos on items;
create trigger trg_items_completar_campos
  before insert on items
  for each row execute function items_completar_campos();

-- Doble de la función de la 0009: un pase de anfitrión vale "ANF:<evento>".
create or replace function evento_del_pase_anfitrion(p_pase text)
returns text language sql stable as $$
  select case when p_pase like 'ANF:%' then substring(p_pase from 5) else null end;
$$;
