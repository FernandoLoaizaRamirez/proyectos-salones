-- ============================================================================
-- 0003 · items MULTI-CLIENTE (columnas nuevas — Fase 0, ADITIVO)
-- ----------------------------------------------------------------------------
-- Agrega a la tabla `items` las columnas que la conectan con el plano de control,
-- SIN romper nada de lo que ya funciona:
--   tenant_id   → a qué salón/cliente pertenece la fila (default: tenant demo)
--   module      → a qué módulo corresponde (derivado de `coleccion`)
--   created_by  → quién la creó (nulo por ahora; los invitados son anónimos)
--
-- Por qué es seguro para producción:
--   • Son columnas NUEVAS con valor por defecto → los INSERT actuales de las apps
--     (que mandan solo evento/coleccion/id/dato) siguen funcionando igual.
--   • El candado RLS por `x-evento` NO se toca (solo mira la columna `evento`).
--   • Las apps piden `select=id,dato`, así que las columnas nuevas ni se asoman.
--   • `event_items` queda como NOMBRE OBJETIVO; el renombre físico (con vista de
--     compatibilidad) se hace en la Fase 1 con la secuencia de despliegue segura.
-- ============================================================================

-- 1) Columnas nuevas (rápido: metadata-only, sin reescribir la tabla).
alter table items add column if not exists tenant_id  uuid;
alter table items add column if not exists module     text;
alter table items add column if not exists created_by uuid;

-- 2) Valor por defecto de tenant_id = tenant demo (para filas nuevas de hoy).
alter table items alter column tenant_id
  set default 'd0000000-0000-4000-8000-000000000001';

-- 3) Trigger: rellena `module` (desde `coleccion`) y `tenant_id` si vinieran
--    nulos. Así quedan poblados aunque las apps no cambien una sola línea.
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

-- 4) Rellenar las filas que ya existen.
update items set module = case coleccion
    when 'mensajes'   then 'muro'
    when 'canciones'  then 'playlist'
    when 'respuestas' then 'rsvp'
    when 'ranking'    then 'dinamicas'
    when 'fotos'      then 'album'
    else coleccion
  end
where module is null;

update items set tenant_id = 'd0000000-0000-4000-8000-000000000001'
where tenant_id is null;

-- 5) Relación suave hacia `tenants` (todas las filas ya apuntan al tenant demo,
--    así que la restricción entra sin conflicto). Damos integridad sin bloquear.
alter table items drop constraint if exists items_tenant_fk;
alter table items add constraint items_tenant_fk
  foreign key (tenant_id) references tenants(id);

create index if not exists items_tenant on items (tenant_id);
