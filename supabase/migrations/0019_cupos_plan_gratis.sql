-- ============================================================================
-- 0019 · CUPOS DEL PLAN GRATIS Y TECHO GLOBAL  (2026-08-14)
-- ----------------------------------------------------------------------------
-- EL ERROR QUE CORRIGE (mio, del mismo dia):
--   La 0018 puso cupos de 3 GB por boda sin video y 15 GB con video. El proyecto
--   esta en el PLAN GRATIS de Supabase: **1 GB en total**. O sea que los cupos
--   eran hasta quince veces mas grandes que todo el almacen, y por tanto NUNCA
--   llegaban a saltar. El muro de verdad seguia siendo el limite de Supabase,
--   que no avisa, no distingue de quien es la culpa y cae sobre TODAS las bodas
--   a la vez. Justo el desastre que la 0018 venia a evitar.
--
-- LO QUE FALTABA, Y ES LO IMPORTANTE DE ESTA MIGRACION:
--   Un TECHO GLOBAL. Hasta ahora cada evento tenia su cupo pero nadie miraba la
--   suma. Con varias bodas dentro, ninguna se pasa de lo suyo y aun asi el
--   almacen revienta. Ahora, antes de firmar una subida, se mira tambien el
--   total del bucket.
--
-- POR QUE 900 MB Y NO 1 GB:
--   El limite duro de Supabase es 1 GB. Frenar justo ahi seria frenar tarde: el
--   margen es para que quede sitio mientras alguien se da cuenta y hace algo
--   (entregar una boda vieja y borrarla, o subir de plan). Un almacen que se
--   para al 90% se arregla; uno que revienta al 100% se arregla con una boda
--   perdida.
--
-- POR QUE ESTOS CUPOS:
--   Una foto comprimida pesa ~250 KB (medido en produccion: la mayor de la demo
--   son 191 KB). Con eso:
--     · 250 MB sin video  — unas 1.000 fotos. Una boda normal sube entre 300 y
--       800, asi que cabe holgada, y caben TRES bodas dentro del techo global.
--     · 400 MB con video  — el paquete de pago. A 25 MB por video son ~16 videos
--       ademas de las fotos. Es poco, y es la verdad: en el plan gratis el video
--       no da para mas.
--     · 150 MB en "demo"  — la vitrina publica no necesita mas, y es el unico
--       sitio por donde puede entrar un desconocido.
--
-- ⚠️ EL DIA QUE SE SUBA A UN PLAN DE PAGO, LOS CUATRO NUMEROS SE CAMBIAN AQUI.
--   Con el plan Pro (100 GB) tendria sentido algo como: techo global 90 GB,
--   3 GB sin video, 15 GB con video, 500 MB la demo — que es justo lo que decia
--   la 0018 y que entonces si seria realista.
--
-- ⚠️ Y OJO CON LA DESCARGA, que esto NO cubre: el plan gratis da 5 GB de salida
--   al mes. Cada invitado que abre el album se baja las fotos. Una boda de 300
--   fotos vista por 100 invitados se acerca sola a ese tope, y al pasarlo se cae
--   el album de TODOS hasta el mes siguiente. Eso no se puede frenar desde aqui;
--   hay que mirarlo en el panel de Supabase.
--
-- Requiere la 0018 aplicada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Cuanto pesa TODO el almacen (todas las bodas juntas).
-- ----------------------------------------------------------------------------
create or replace function uso_bytes_total()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)::bigint
    from storage.objects
   where bucket_id = 'media';
$$;


-- ----------------------------------------------------------------------------
-- 2) El techo global. En una sola funcion para que haya UN solo numero que
--    cambiar el dia que se suba de plan.
-- ----------------------------------------------------------------------------
create or replace function tope_bytes_global()
returns bigint
language sql
immutable
as $$
  select (900 * 1024 * 1024)::bigint;   -- 900 MB de los 1024 del plan gratis
$$;


-- ----------------------------------------------------------------------------
-- 3) Cupos por evento, ahora a escala de lo que de verdad hay.
--    (Reemplaza los de la 0018: 3 GB / 15 GB / 500 MB.)
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

  -- Un evento que no existe no tiene cupo ninguno (ver la 0018: sin esto se
  -- llevaba el cupo por defecto, o sea que fallaba abierto).
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
    return (150 * 1024 * 1024)::bigint;            -- 150 MB
  end if;

  -- 3) Segun tenga o no el paquete de video (la misma respuesta de la 0017).
  if evento_tiene_funcion(p_codigo, 'video') then
    return (400 * 1024 * 1024)::bigint;            -- 400 MB
  end if;
  return (250 * 1024 * 1024)::bigint;              -- 250 MB
end $$;


-- ----------------------------------------------------------------------------
-- 4) ¿Cabe un archivo mas? Ahora hay DOS preguntas, y las dos tienen que decir
--    que si: la del evento y la del almacen entero.
-- ----------------------------------------------------------------------------
create or replace function cabe_en_el_evento(p_codigo text, p_bytes bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cupo   bigint;
  v_pesa   bigint;
begin
  if p_codigo is null or p_codigo = '' then
    return false;
  end if;
  v_pesa := greatest(coalesce(p_bytes, 0), 0);

  -- (a) El techo GLOBAL. Va primero porque es el que rompe a todo el mundo: si
  --     el almacen esta lleno, da igual lo bien que vaya este evento.
  if uso_bytes_total() + v_pesa > tope_bytes_global() then
    return false;
  end if;

  -- (b) El cupo de este evento.
  v_cupo := cupo_bytes_del_evento(p_codigo);
  if v_cupo <= 0 then
    return false;
  end if;
  return uso_bytes_del_evento(p_codigo) + v_pesa <= v_cupo;
end $$;


-- ----------------------------------------------------------------------------
-- 5) El contador, ahora con la foto completa: lo del evento Y lo de todos.
--
-- Se le añaden campos en vez de cambiar los que habia, para que la version de
-- las apps que ya esta desplegada siga leyendo `usado` y `cupo` sin enterarse.
-- ----------------------------------------------------------------------------
create or replace function espacio_del_evento(p_codigo text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'usado',      uso_bytes_del_evento(p_codigo),
    'cupo',       cupo_bytes_del_evento(p_codigo),
    'usadoTotal', uso_bytes_total(),
    'topeTotal',  tope_bytes_global()
  );
$$;


-- ----------------------------------------------------------------------------
-- 6) Aviso temprano: cuando el almacen pase del 80%, que quede escrito en el
--    diagnostico (tabla `app_errores` de la 0012).
--
-- Enterarse de que el almacen esta lleno cuando una novia llama enfadada es
-- tarde. Esto lo llama `media-subir` en cada subida; escribe como mucho una fila
-- por hora para no llenar la tabla de avisos repetidos.
-- ----------------------------------------------------------------------------
create or replace function avisar_si_almacen_lleno()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usado bigint;
  v_tope  bigint;
begin
  v_tope  := tope_bytes_global();
  v_usado := uso_bytes_total();
  if v_tope <= 0 or v_usado * 100 < v_tope * 80 then
    return;
  end if;
  -- Uno por hora basta para enterarse; mas solo seria ruido.
  if exists (
    select 1 from app_errores
     where tipo = 'almacen-casi-lleno' and creado > now() - interval '1 hour'
  ) then
    return;
  end if;
  insert into app_errores (app, tipo, mensaje)
    values ('almacen', 'almacen-casi-lleno',
            'El almacen va por ' || round(v_usado * 100.0 / v_tope) ||
            '% de ' || round(v_tope / 1024.0 / 1024.0) || ' MB. ' ||
            'Entrega y borra una boda vieja, o sube de plan.');
exception when others then
  -- Avisar de un problema NUNCA puede provocar otro: si esto falla, la subida
  -- sigue su camino. Misma regla que el diagnostico del cliente.
  return;
end $$;


-- ----------------------------------------------------------------------------
-- 7) Permisos. Igual que en la 0018: el contador es publico, el candado no.
-- ----------------------------------------------------------------------------
revoke all on function cabe_en_el_evento(text, bigint)   from public, anon, authenticated;
revoke all on function avisar_si_almacen_lleno()         from public, anon, authenticated;
grant execute on function cabe_en_el_evento(text, bigint) to service_role;
grant execute on function avisar_si_almacen_lleno()       to service_role;
grant execute on function uso_bytes_total()               to service_role;

grant execute on function espacio_del_evento(text) to anon, authenticated, service_role;
grant execute on function tope_bytes_global()      to anon, authenticated, service_role;


-- ============================================================================
-- CONSULTAS UTILES
-- ----------------------------------------------------------------------------
--   Como va el almacen entero:
--
--     select pg_size_pretty(uso_bytes_total()) as usado,
--            pg_size_pretty(tope_bytes_global()) as tope,
--            round(uso_bytes_total() * 100.0 / tope_bytes_global()) as porciento;
--
--   Quien lo esta ocupando:
--
--     select split_part(name,'/',1) as evento, count(*) as archivos,
--            pg_size_pretty(sum((metadata->>'size')::bigint)) as pesa
--       from storage.objects where bucket_id = 'media'
--      group by 1 order by sum((metadata->>'size')::bigint) desc;
--
--   Avisos de almacen lleno que se hayan registrado:
--
--     select creado, mensaje from app_errores
--      where tipo = 'almacen-casi-lleno' order by creado desc limit 10;
--
-- PARA REVERTIR (vuelve a los cupos irreales de la 0018):
--
--   Volver a correr la 0018 (sus `create or replace` pisan a estos) y luego:
--     drop function if exists avisar_si_almacen_lleno();
--     drop function if exists tope_bytes_global();
--     drop function if exists uso_bytes_total();
--   ...y quitar la llamada en `supabase/functions/media-subir/index.ts`.
-- ============================================================================
