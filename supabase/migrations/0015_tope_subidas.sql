-- ============================================================================
-- 0015 · TOPE DE SUBIDAS  (2026-08-06)
-- ----------------------------------------------------------------------------
-- EL AGUJERO QUE TAPA:
--   `media-subir` firma permisos de subida sin llevar ninguna cuenta. Y la llave
--   publica viaja dentro del JavaScript de cada app (es publica por diseno), asi
--   que cualquiera que abra la demostracion puede pedirse pases del evento
--   "demo" y, con cada uno, permisos ILIMITADOS.
--
--   Todos los eventos comparten el MISMO almacen: son carpetas dentro del mismo
--   cajon. Llenarlo deja sin subir una sola foto a TODAS las bodas — incluida la
--   que se este celebrando esa noche.
--
-- POR QUE EL TOPE ES POR EVENTO Y NO SOLO POR PASE (decision de diseno):
--   Limitar por pase no sirve de nada por si solo: `emitir_pase` esta abierto al
--   publico, asi que quien quiera abusar simplemente pide un pase nuevo. Lo que
--   de verdad acota el dano es el tope POR EVENTO, porque para atacar un evento
--   hay que conocer su codigo. El unico codigo que conoce todo el mundo es
--   "demo", y por eso la demo aguanta mucho menos que una boda de verdad.
--
-- POR QUE ESTOS NUMEROS:
--   · 150 por pase y hora — un invitado entusiasta que selecciona 50 fotos de
--     golpe tres veces sigue cabiendo. Nadie legitimo pasa de ahi.
--   · 5000 por evento y hora — deliberadamente generoso. Bloquear la subida de
--     fotos en una boda real es MUCHO peor que dejar pasar un abuso: 300
--     invitados subiendo 16 fotos cada uno en la hora punta caben.
--   · 300 por hora en "demo" — la vitrina publica no necesita mas, y es el unico
--     sitio por donde puede entrar un desconocido.
--
-- Se cuenta el PERMISO concedido, no el archivo subido: es lo que se puede medir
-- barato y es justo lo que hay que frenar. Un permiso que no se usa tambien
-- gasta cupo, y esta bien que asi sea.
--
-- NO SE GUARDA EL PASE, se guarda su HUELLA (sha-256): si algun dia alguien lee
-- esta tabla, no se lleva llaves de nadie.
--
-- Requiere la 0006 (pase firmado) y la 0010 aplicadas.
-- ============================================================================

create table if not exists media_permisos (
  id      bigserial primary key,
  evento  text not null,
  huella  text not null,               -- sha-256 del pase, nunca el pase
  creado  timestamptz not null default now()
);

create index if not exists media_permisos_evento on media_permisos (evento, creado desc);
create index if not exists media_permisos_huella on media_permisos (huella, creado desc);
-- Para que la limpieza de lo viejo no recorra la tabla entera.
create index if not exists media_permisos_creado on media_permisos (creado);

-- RLS activada y SIN politicas = cerrada a cal y canto. Solo la toca la Edge
-- Function con la llave de servicio, a traves de la funcion de abajo.
alter table media_permisos enable row level security;


-- ----------------------------------------------------------------------------
-- ¿Se le concede una subida mas a este pase, en este evento?
--
-- Cuenta y APUNTA en la misma llamada, dentro de una sola transaccion: si dos
-- peticiones llegan a la vez, no pueden colarse las dos por el mismo hueco.
-- ----------------------------------------------------------------------------
create or replace function permitir_subida(p_evento text, p_huella text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_por_pase   int;
  v_por_evento int;
  v_tope_pase  constant int := 150;
  v_tope_evento int;
begin
  if p_evento is null or p_evento = '' or p_huella is null or p_huella = '' then
    return false;
  end if;

  -- La vitrina publica aguanta menos: es la unica que cualquiera puede pedir.
  v_tope_evento := case when p_evento = 'demo' then 300 else 5000 end;

  -- Lo de hace mas de dos horas ya no cuenta para nada: fuera.
  delete from media_permisos where creado < now() - interval '2 hours';

  select count(*) into v_por_pase
    from media_permisos
   where huella = p_huella
     and creado > now() - interval '1 hour';
  if v_por_pase >= v_tope_pase then
    return false;
  end if;

  select count(*) into v_por_evento
    from media_permisos
   where evento = p_evento
     and creado > now() - interval '1 hour';
  if v_por_evento >= v_tope_evento then
    return false;
  end if;

  insert into media_permisos (evento, huella) values (p_evento, p_huella);
  return true;
end $$;

-- Solo la Edge Function (llave de servicio) puede pedir permiso. Si esto se
-- pudiera llamar desde el navegador, cualquiera gastaria el cupo de una boda.
revoke all on function permitir_subida(text, text) from public;
revoke all on function permitir_subida(text, text) from anon;
revoke all on function permitir_subida(text, text) from authenticated;
grant execute on function permitir_subida(text, text) to service_role;


-- ============================================================================
-- CONSULTAS UTILES
-- ----------------------------------------------------------------------------
--   Cuanto se esta subiendo ahora mismo, por evento:
--
--     select evento, count(*) as ultima_hora
--       from media_permisos
--      where creado > now() - interval '1 hour'
--      group by evento
--      order by ultima_hora desc;
--
--   Si alguna vez hay que subir el tope de un evento concreto, se cambia el
--   `case` de la funcion. No hace falta tocar la Edge Function.
--
-- PARA REVERTIR (vuelve a no haber tope):
--
--   drop function if exists permitir_subida(text, text);
--   drop table if exists media_permisos;
--
--   ...y quitar la llamada en supabase/functions/media-subir/index.ts.
-- ============================================================================
