-- ============================================================================
-- 0022 · UNA VITRINA POR VISITANTE
--
-- QUE PROBLEMA RESUELVE
--   Hasta hoy TODAS las demostraciones publicas compartian un solo evento:
--   "demo". Consecuencias que se veian en la venta:
--     · Las demos abren VACIAS. Los datos de ejemplo (mesas, canciones, pases)
--       no se podian sembrar en el servidor, porque `items.id` es llave
--       primaria GLOBAL: sembrar los mismos ids en dos eventos choca, y una
--       boda real podia acabar naciendo con los invitados de Ana & Rodrigo.
--     · Lo que un visitante subia lo veian todos los demas. Un salon abria la
--       demo del album y encontraba las fotos de prueba de otra persona.
--     · Si alguien borraba algo, se lo borraba a todo el mundo.
--
--   A partir de aqui, cada visitante que abre una demo sin `?e=` estrena su
--   PROPIA vitrina: un evento con el prefijo reservado `demo-` (por ejemplo
--   `demo-k3f9x2`) que su navegador recuerda. Su acomodo, sus canciones y sus
--   fotos son suyos; y si comparte el QR, quien lo escanee cae en SU vitrina,
--   que es justo lo que el salon quiere enseñar.
--
-- QUE CAMBIA AQUI
--   Las cinco funciones que trataban a "demo" como caso especial ahora tratan
--   igual a cualquier `demo-...`. Se centraliza en UNA funcion, `es_vitrina`,
--   para que no vuelva a haber cinco copias de la misma regla.
--
-- POR QUE ES SEGURO
--   · El prefijo `demo-` queda RESERVADO para vitrinas. Los eventos reales que
--     crea el panel no lo usan, y ademas existen en `events`: ese camino no se
--     toca aqui.
--   · Una vitrina no da acceso a ningun evento real: cada pase sigue firmado
--     para SU evento y la RLS sigue filtrando por evento.
--   · Los cupos de una vitrina BAJAN respecto al "demo" compartido: antes eran
--     150 MB para todo el mundo junto; ahora son 25 MB por visitante, porque
--     detras de cada vitrina hay una sola persona probando. Asi el plan gratis
--     de Supabase no se puede vaciar a base de visitas.
--
-- DESPUES DE CORRERLA
--   No hace falta tocar nada mas: las apps piden su vitrina solas y se dan
--   cuenta de que el servidor ya la admite. ANTES de correrla siguen usando el
--   "demo" compartido de siempre, asi que se puede aplicar sin prisa y nada se
--   rompe mientras tanto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) La regla, en un solo sitio
-- ----------------------------------------------------------------------------
create or replace function es_vitrina(p_codigo text)
returns boolean
language sql
immutable
set search_path = public
as $fn$
  -- "demo" es la vitrina historica (sigue viva: enlaces ya repartidos y QR
  -- impresos). "demo-xxxx" es la vitrina propia de cada visitante.
  select p_codigo = 'demo' or p_codigo like 'demo-%';
$fn$;

comment on function es_vitrina(text) is
  'TRUE si el codigo es una vitrina publica: "demo" o el prefijo reservado "demo-". Ver migracion 0022.';

-- ----------------------------------------------------------------------------
-- 2) Pase de invitado (0006): una vitrina siempre tiene pase
-- ----------------------------------------------------------------------------
create or replace function emitir_pase(p_codigo text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_secreto text;
  v_exp     bigint;
  v_cuerpo  text;
begin
  -- Mismo formato de codigo que `eventoActual()` en @salones/sync.
  if p_codigo is null or p_codigo !~ '^[a-zA-Z0-9-]{1,60}$' then
    return null;
  end if;

  -- El evento debe existir y estar ACTIVO. Las vitrinas publicas ("demo" y
  -- "demo-...") valen siempre: no viven en `events` y no tienen dueño.
  if not es_vitrina(p_codigo)
     and not exists (
       select 1 from public.events e
       where e.codigo = p_codigo and e.estado = 'activo'
     ) then
    return null;
  end if;

  select valor into v_secreto from public.app_secretos where clave = 'pase_evento';
  if v_secreto is null then return null; end if;

  v_exp    := extract(epoch from now())::bigint + 1800;  -- 30 minutos
  v_cuerpo := p_codigo || '.' || v_exp;
  return v_cuerpo || '.' || encode(hmac(v_cuerpo, v_secreto, 'sha256'), 'hex');
end $fn$;

revoke all     on function emitir_pase(text) from public;
grant  execute on function emitir_pase(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) Pase de anfitrion (0009): en su propia vitrina, el visitante manda
--
--    Es lo que hace que la demo se pueda probar de verdad: quitar un mensaje
--    del muro, borrar una foto, reiniciar el acomodo. Y no hay riesgo: lo unico
--    que puede tocar es SU vitrina, que es de mentira y solo suya.
-- ----------------------------------------------------------------------------
create or replace function emitir_pase_anfitrion(p_codigo text, p_clave text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_secreto text;
  v_exp     bigint;
  v_cuerpo  text;
begin
  if p_codigo is null or p_codigo !~ '^[a-zA-Z0-9-]{1,60}$' then
    return null;
  end if;

  -- En una vitrina publica cualquiera es anfitrion, para que la demostracion se
  -- pueda moderar sin repartir llaves. Es contenido de mentira.
  if not es_vitrina(p_codigo) then
    if p_clave is null or p_clave = '' then
      return null;
    end if;
    if not exists (
      select 1 from public.events e
       where e.codigo = p_codigo
         and e.estado = 'activo'
         and e.clave_anfitrion = p_clave
    ) then
      return null;
    end if;
  end if;

  select valor into v_secreto from public.app_secretos where clave = 'pase_anfitrion';
  if v_secreto is null then return null; end if;

  v_exp    := extract(epoch from now())::bigint + 1800;  -- 30 minutos
  v_cuerpo := 'a.' || p_codigo || '.' || v_exp;
  return v_cuerpo || '.' || encode(hmac(v_cuerpo, v_secreto, 'sha256'), 'hex');
end $fn$;

revoke all     on function emitir_pase_anfitrion(text, text) from public;
grant  execute on function emitir_pase_anfitrion(text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) Tope de subidas por hora (0015)
--
--    El "demo" compartido tenia 300/hora entre todos. Una vitrina la usa UNA
--    persona: con 60 sobra para probar, y de paso pone un techo por visitante.
-- ----------------------------------------------------------------------------
create or replace function permitir_subida(p_evento text, p_huella text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_por_pase    int;
  v_por_evento  int;
  v_tope_evento int;
begin
  if p_evento is null or p_evento = '' or p_huella is null or p_huella = '' then
    return false;
  end if;

  -- Las vitrinas aguantan menos: son las unicas que cualquiera puede pedir.
  v_tope_evento := case
                     when p_evento = 'demo'    then 300  -- la vitrina compartida de siempre
                     when es_vitrina(p_evento) then 60   -- la vitrina de un visitante
                     else 5000
                   end;

  -- Lo de hace mas de dos horas ya no cuenta para nada: fuera.
  delete from media_permisos where creado < now() - interval '2 hours';

  select count(*) into v_por_pase
    from media_permisos
   where huella = p_huella
     and creado > now() - interval '1 hour';
  if v_por_pase >= 60 then
    return false;
  end if;

  select count(*) into v_por_evento
    from media_permisos
   where evento = p_evento
     and creado > now() - interval '1 hour';
  if v_por_evento >= v_tope_evento then
    return false;
  end if;

  return true;
end $fn$;

revoke all     on function permitir_subida(text, text) from public;
grant  execute on function permitir_subida(text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5) Cupo de almacenamiento (ultima palabra: la 0019)
--
--    25 MB por vitrina de visitante: da para ~100 fotos comprimidas, de sobra
--    para probar, y evita que muchas visitas se coman el plan gratis (1 GB).
-- ----------------------------------------------------------------------------
create or replace function cupo_bytes_del_evento(p_codigo text)
returns bigint
language plpgsql
stable
security definer
set search_path = public, extensions
as $fn$
declare
  v_a_medida bigint;
begin
  -- 1) Un cupo puesto a mano para ese evento manda sobre todo lo demas.
  select c.bytes into v_a_medida
    from evento_cupo c
    join events e on e.id = c.event_id
   where e.codigo = p_codigo;
  if v_a_medida is not null then
    return v_a_medida;
  end if;

  -- 2) Las vitrinas publicas aguantan menos: son las unicas que cualquiera
  --    puede pedir. La de cada visitante, todavia menos que la compartida.
  if p_codigo = 'demo' then
    return (150 * 1024 * 1024)::bigint;            -- 150 MB (vitrina compartida)
  end if;
  if es_vitrina(p_codigo) then
    return (25 * 1024 * 1024)::bigint;             -- 25 MB (vitrina de un visitante)
  end if;

  -- 3) Segun tenga o no el paquete de video (la misma respuesta de la 0017).
  if evento_tiene_funcion(p_codigo, 'video') then
    return (400 * 1024 * 1024)::bigint;            -- 400 MB
  end if;
  return (250 * 1024 * 1024)::bigint;              -- 250 MB
end $fn$;

revoke all     on function cupo_bytes_del_evento(text) from public;
grant  execute on function cupo_bytes_del_evento(text) to anon, authenticated;

-- ============================================================================
-- COMPROBACION (pegar aparte y ver que sale lo que dice el comentario)
--
--   select es_vitrina('demo'), es_vitrina('demo-k3f9x2'), es_vitrina('boda-perez');
--     -> true, true, false
--
--   select emitir_pase('demo-k3f9x2') is not null;   -> true  (antes: false)
--   select emitir_pase('boda-inventada') is null;    -> true  (sigue cerrado)
--   select cupo_bytes_del_evento('demo-k3f9x2');     -> 26214400  (25 MB)
-- ============================================================================
