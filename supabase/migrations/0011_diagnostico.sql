-- ============================================================================
-- 0011 · DIAGNOSTICO — que los fallos dejen rastro
-- ----------------------------------------------------------------------------
-- EL PROBLEMA:
--   Hoy, si algo se rompe un sabado a las 11 de la noche, nadie se entera. No
--   hay ningun sitio donde queden los fallos, y encima el codigo se los TRAGA:
--   `@salones/sync` tiene varios `catch {}` que se comen el error y siguen. El
--   resultado es el peor posible: el invitado ve "no hay mensajes" en vez de un
--   aviso, y el operador se entera por un WhatsApp enfadado.
--
-- QUE SE GUARDA (y que NO):
--   Solo lo imprescindible para saber QUE fallo y DONDE:
--     app, evento, tipo de fallo, mensaje tecnico, ruta (SIN la query) y
--     navegador.
--
--   ⚠️ NUNCA se guarda contenido de invitados (nombres, mensajes, fotos) NI la
--   QUERY de la direccion. Esto ultimo es deliberado y no es un detalle: la
--   llave de anfitrion viaja como `?a=<clave>`, asi que registrar la direccion
--   completa convertiria el registro de errores en una lista de llaves para
--   borrar bodas. El cliente manda la ruta ya recortada y aqui se recorta OTRA
--   VEZ, por si acaso.
--
-- QUIEN ESCRIBE Y QUIEN LEE:
--   Escribe SOLO la Edge Function `diagnostico`, con la llave de servicio. La
--   tabla nace con RLS activada y sin politicas = cerrada a cal y canto: con la
--   llave publica no se puede ni leer ni escribir. Lee el staff del salon, a
--   traves de la misma funcion.
--
-- Aditiva y sin riesgo: no toca nada de lo que ya existe.
-- Runbook: docs/DIAGNOSTICO.md
-- ============================================================================

create table if not exists app_errores (
  id        bigserial primary key,
  creado    timestamptz not null default now(),
  app       text not null,                 -- muro | album | playlist | rsvp | ...
  evento    text,                          -- el codigo del evento, si se sabe
  tipo      text not null,                 -- sin-pase | fallo-red | subida | ...
  mensaje   text,                          -- texto tecnico, recortado
  ruta      text,                          -- SIN query. Ver el aviso de arriba.
  navegador text,
  -- Cuantas veces se ha repetido este mismo fallo (el cliente agrupa y reporta
  -- una vez cada pocos minutos; aqui se suma).
  repeticiones int not null default 1
);

alter table app_errores enable row level security;   -- sin politicas = cerrada

-- Consultar "que ha fallado ultimamente" tiene que ser instantaneo.
create index if not exists app_errores_creado on app_errores (creado desc);
create index if not exists app_errores_evento on app_errores (evento, creado desc);

-- Candados de tamano: un cliente malicioso no puede llenar la base con textos
-- enormes. La funcion ya recorta, esto es el cinturon de seguridad.
alter table app_errores drop constraint if exists app_errores_tamano;
alter table app_errores add constraint app_errores_tamano check (
  length(coalesce(mensaje, '')) <= 500
  and length(coalesce(ruta, '')) <= 200
  and length(coalesce(navegador, '')) <= 200
  and length(app) <= 40
  and length(tipo) <= 40
  and length(coalesce(evento, '')) <= 60
);

comment on table app_errores is
  'Fallos de las apps. NUNCA contenido de invitados ni la query de la direccion (ahi viaja la llave de anfitrion).';


-- --------------------------------------------------------------------------
-- LIMPIEZA — los errores caducan
-- --------------------------------------------------------------------------
-- No hace falta guardarlos para siempre: sirven para reaccionar, no para hacer
-- historia. La funcion `diagnostico` llama a esto de vez en cuando, asi que no
-- hace falta programar ninguna tarea (que ademas el plan gratis no tiene).
create or replace function limpiar_errores_viejos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_borrados integer;
begin
  delete from public.app_errores where creado < now() - interval '30 days';
  get diagnostics v_borrados = row_count;
  return v_borrados;
end $$;

revoke all     on function limpiar_errores_viejos() from public;
grant  execute on function limpiar_errores_viejos() to service_role;


-- ============================================================================
-- PARA REVERTIR
-- ----------------------------------------------------------------------------
--   drop function if exists limpiar_errores_viejos();
--   drop table if exists app_errores;
-- ============================================================================
