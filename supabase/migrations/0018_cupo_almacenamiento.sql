-- ============================================================================
-- 0018 · CUPO DE ALMACENAMIENTO POR EVENTO  (2026-08-14)
-- ----------------------------------------------------------------------------
-- EL AGUJERO QUE TAPA:
--   Desde la 0017 el video se COBRA, pero no se MIDE. Un salon con el paquete
--   puede subir sin techo: se cobra una vez y el costo sigue creciendo cada mes,
--   porque el almacenamiento se paga mientras el archivo exista.
--
--   Y el almacen es UNO SOLO para todas las bodas. Llenarlo no arruina solo al
--   que se paso: deja sin subir una foto a la boda que se este celebrando esa
--   noche. La 0015 ya freno el numero de subidas por hora; esto frena el ESPACIO
--   acumulado, que es la otra mitad del problema y la que cuesta dinero.
--
-- POR QUE SE MIDEN LOS BYTES REALES Y NO LOS DECLARADOS (decision de diseno):
--   `media-subir` solo firma el permiso; el archivo va directo del telefono al
--   almacen, asi que la funcion nunca lo ve. Lo facil seria fiarse del tamano
--   que declare el navegador, pero eso lo elige quien manda la peticion: bastaria
--   declarar "1 byte" para saltarse el cupo entero.
--
--   `storage.objects` guarda el tamano de verdad en `metadata->>'size'`. Se suma
--   de ahi. Es la unica cuenta que no se puede maquillar, y ademas BAJA sola
--   cuando se borra una foto o se cierra un evento — cosa que un contador
--   aparte no haria sin ir persiguiendo cada borrado.
--
-- POR QUE NO HAY DISPARADOR SOBRE storage.objects:
--   Seria mas rapido llevar un contador al vuelo, pero un fallo dentro de ese
--   disparador tumbaria TODAS las subidas del proyecto, no solo la cuenta. Sumar
--   al vuelo no puede romper nada. Si algun dia pesa, se cachea; para eso se deja
--   el indice de abajo.
--
-- POR QUE ESTOS NUMEROS:
--   · 3 GB sin video   — una foto comprimida pesa ~250 KB, asi que son ~12.000
--     fotos. Una boda de 300 invitados subiendo 15 cada uno son 4.500. Sobra.
--   · 15 GB con video  — el paquete de pago. A 25 MB por video (el tope del
--     bucket) son ~600 videos ademas de las fotos.
--   · 500 MB en "demo" — la vitrina publica es el unico sitio por donde puede
--     entrar un desconocido, igual que en la 0015.
--   Van holgados a proposito: la 0015 ya dejo escrito por que — bloquear la
--   subida en una boda real es MUCHO peor que dejar pasar un abuso.
--
-- Requiere la 0002 (plano de control) y la 0017 (funcion `video`) aplicadas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Cupo a medida para un evento suelto (una boda que pago mas espacio).
--    Sin fila aqui, manda el cupo de su plan.
-- ----------------------------------------------------------------------------
create table if not exists evento_cupo (
  event_id  uuid primary key references events(id) on delete cascade,
  bytes     bigint not null check (bytes >= 0),
  nota      text,
  creado    timestamptz not null default now()
);

-- Cerrada a cal y canto: solo la tocan las funciones de abajo y el service-role.
alter table evento_cupo enable row level security;

-- Para que sumar el peso de UN evento no recorra el almacen entero. Hoy sobra
-- (hay 15 archivos), pero con varias bodas dentro deja de sobrar.
create index if not exists objects_media_por_evento
  on storage.objects (bucket_id, (split_part(name, '/', 1)));


-- ----------------------------------------------------------------------------
-- 2) ¿Cuanto pesa lo subido a este evento? (bytes reales del almacen)
--
-- Las carpetas son `<codigo-evento>/<archivo>`: la decide `media-subir`, nunca
-- el cliente (ver 0010), asi que el primer tramo del nombre ES el evento.
-- ----------------------------------------------------------------------------
create or replace function uso_bytes_del_evento(p_codigo text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)::bigint
    from storage.objects
   where bucket_id = 'media'
     and split_part(name, '/', 1) = p_codigo;
$$;


-- ----------------------------------------------------------------------------
-- 3) ¿Cuanto espacio le toca? Cupo a medida > paquete de video > solo fotos.
-- ----------------------------------------------------------------------------
create or replace function cupo_bytes_del_evento(p_codigo text)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_a_medida bigint;
begin
  if p_codigo is null or p_codigo = '' then
    return 0;
  end if;

  -- 0) Un evento que no existe no tiene cupo NINGUNO.
  --
  --    Sin esto caia hasta el final y se llevaba los 3 GB de "sin video", o sea
  --    que `cabe_en_el_evento` decia que si a un codigo inventado. Hoy no se
  --    puede llegar ahi (a `media-subir` el evento le llega de un pase firmado,
  --    y `emitir_pase` no firma eventos que no existan), pero el dia que alguien
  --    llame a esto desde otro sitio, el fallo tiene que ser cerrado y no
  --    abierto. Lo cazo el banco de pruebas de la 0018.
  if not exists (select 1 from events where codigo = p_codigo) then
    return 0;
  end if;

  -- 1) Lo pactado con ese evento en concreto, si lo hay.
  select c.bytes into v_a_medida
    from evento_cupo c
    join events e on e.id = c.event_id
   where e.codigo = p_codigo;
  if v_a_medida is not null then
    return v_a_medida;
  end if;

  -- 2) La vitrina publica aguanta menos: es la unica que cualquiera puede pedir.
  if p_codigo = 'demo' then
    return 500 * 1024 * 1024;                      -- 500 MB
  end if;

  -- 3) Segun tenga o no el paquete de video (la misma respuesta de la 0017).
  if evento_tiene_funcion(p_codigo, 'video') then
    return 15 * 1024 * 1024 * 1024::bigint;        -- 15 GB
  end if;
  return 3 * 1024 * 1024 * 1024::bigint;           -- 3 GB
end $$;


-- ----------------------------------------------------------------------------
-- 4) ¿Cabe un archivo mas de este tamano?
--
-- Es lo que pregunta `media-subir` antes de firmar. Aqui SI se usa el tamano
-- declarado por el navegador, pero solo para SUMARLO al de verdad: mentir a la
-- baja no sirve de nada, porque lo ya subido se cuenta del almacen, y el bucket
-- rechaza por su cuenta cualquier archivo de mas de 25 MB (ver 0001).
-- ----------------------------------------------------------------------------
create or replace function cabe_en_el_evento(p_codigo text, p_bytes bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cupo bigint;
begin
  if p_codigo is null or p_codigo = '' then
    return false;
  end if;
  v_cupo := cupo_bytes_del_evento(p_codigo);
  if v_cupo <= 0 then
    return false;
  end if;
  return uso_bytes_del_evento(p_codigo) + greatest(coalesce(p_bytes, 0), 0) <= v_cupo;
end $$;


-- ----------------------------------------------------------------------------
-- 5) El contador para enseñarselo a quien organiza.
--
-- Se puede preguntar desde el navegador: quien tiene el codigo del evento ya ve
-- el album entero, asi que saber cuanto ocupa no le descubre nada. Y el anfitrion
-- necesita verlo ANTES de que la boda se quede sin espacio a media fiesta.
-- ----------------------------------------------------------------------------
create or replace function espacio_del_evento(p_codigo text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'usado', uso_bytes_del_evento(p_codigo),
    'cupo',  cupo_bytes_del_evento(p_codigo)
  );
$$;


-- ----------------------------------------------------------------------------
-- 6) Permisos.
--
-- `cabe_en_el_evento` es PARTE DEL CANDADO: si se pudiera llamar desde el
-- navegador no pasaria nada malo (solo devuelve si/no), pero se cierra igual por
-- costumbre — quien decide es la Edge Function con la llave de servicio.
-- `espacio_del_evento` si es publica: es un contador, no una puerta.
-- ----------------------------------------------------------------------------
revoke all on function cabe_en_el_evento(text, bigint) from public;
revoke all on function cabe_en_el_evento(text, bigint) from anon;
revoke all on function cabe_en_el_evento(text, bigint) from authenticated;
grant execute on function cabe_en_el_evento(text, bigint) to service_role;

grant execute on function espacio_del_evento(text) to anon;
grant execute on function espacio_del_evento(text) to authenticated;
grant execute on function espacio_del_evento(text) to service_role;

grant execute on function uso_bytes_del_evento(text)  to service_role;
grant execute on function cupo_bytes_del_evento(text) to service_role;


-- ============================================================================
-- CONSULTAS UTILES
-- ----------------------------------------------------------------------------
--   Cuanto ocupa cada evento, de mas a menos:
--
--     select split_part(name,'/',1) as evento,
--            count(*) as archivos,
--            pg_size_pretty(sum((metadata->>'size')::bigint)) as pesa
--       from storage.objects
--      where bucket_id = 'media'
--      group by 1
--      order by sum((metadata->>'size')::bigint) desc;
--
--   Como va un evento respecto a su cupo:
--
--     select espacio_del_evento('<codigo-evento>');
--
--   Darle mas espacio a una boda concreta (20 GB):
--
--     insert into evento_cupo (event_id, bytes, nota)
--       select id, 20 * 1024 * 1024 * 1024::bigint, 'ampliado a peticion del salon'
--         from events where codigo = '<codigo-evento>'
--     on conflict (event_id) do update set bytes = excluded.bytes;
--
-- PARA REVERTIR (vuelve a no haber cupo):
--
--   drop function if exists espacio_del_evento(text);
--   drop function if exists cabe_en_el_evento(text, bigint);
--   drop function if exists cupo_bytes_del_evento(text);
--   drop function if exists uso_bytes_del_evento(text);
--   drop table    if exists evento_cupo;
--   drop index    if exists storage.objects_media_por_evento;
--
--   ...y quitar la comprobacion de `supabase/functions/media-subir/index.ts`.
-- ============================================================================
