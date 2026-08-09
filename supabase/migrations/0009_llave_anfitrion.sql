-- ============================================================================
-- 0009 · LLAVE DE ANFITRION — quien organiza es el unico que puede BORRAR
-- ----------------------------------------------------------------------------
-- EL PROBLEMA QUE ARREGLA:
--   Hasta hoy la unica llave de un evento es su codigo (el `?e=` del QR), y ese
--   codigo lo tienen TODOS los invitados: es lo que escanean para entrar. Las
--   politicas de `items` dejan BORRAR a quien presente esa llave. Es decir:
--   cualquier invitado puede borrar las fotos, los mensajes del muro, las
--   canciones o las confirmaciones de TODO el evento. Un dedo mal puesto, o un
--   invitado molesto, y la boda se queda sin recuerdos.
--
-- LA SOLUCION:
--   Una SEGUNDA llave, la del ANFITRION, que solo recibe quien organiza. Viaja
--   en su propio enlace (`?e=<codigo>&a=<clave>`) y se canjea por un PASE DE
--   ANFITRION firmado — igual que el pase del invitado de la 0006, pero con
--   OTRO secreto, para que un pase de invitado jamas pueda pasar por uno de
--   anfitrion aunque hubiera un error de lectura.
--
--       emitir_pase_anfitrion(codigo, clave) -> a.<evento>.<exp>.<firma>
--       evento_del_pase_anfitrion(pase)      -> el evento, o NULL
--
-- REPARTO DE PERMISOS (una vez hecho el corte de abajo):
--   LEER        -> pase de invitado O de anfitrion
--   ESCRIBIR    -> pase de invitado O de anfitrion   (firmar, pedir cancion, confirmar)
--   ACTUALIZAR  -> pase de invitado O de anfitrion   (votar y confirmar SON actualizaciones)
--   BORRAR      -> SOLO pase de anfitrion            <<<< el candado nuevo
--
--   Se deja ACTUALIZAR abierto a proposito: los votos de la playlist y las
--   confirmaciones de RSVP se guardan como actualizaciones. Cerrarlo romperia
--   el producto. El limite honesto de esta migracion es: un invitado no puede
--   DESTRUIR contenido, pero todavia podria sobrescribir el suyo o el de otro.
--   Cerrar eso pide dueño por item (created_by) y es el siguiente incremento.
--
-- COMPATIBLE Y ADITIVA: aqui abajo las politicas siguen aceptando lo de antes
-- (nada se rompe al aplicarla). El candado real se activa en el BLOQUE DE CORTE
-- del final, que esta comentado y se corre cuando las apps ya esten desplegadas.
--
-- ⚠️  ESTE BLOQUE DE CORTE SUSTITUYE AL DE LA MIGRACION 0006.
--     Corre el de AQUI, no el de alla: este deja el candado del pase Y ademas
--     restringe el borrado al anfitrion. Ver docs/LLAVE-ANFITRION.md.
--
-- Requiere la 0006 aplicada (usa `app_secretos`).
-- ============================================================================

create extension if not exists pgcrypto;   -- hmac() y gen_random_bytes()

-- --------------------------------------------------------------------------
-- 1) La llave del anfitrion vive en el evento
--    Los eventos NUEVOS la reciben solos (default), asi el alta de eventos de
--    /evento no necesita cambiar ni una linea. A los que ya existen se la
--    generamos aqui.
-- --------------------------------------------------------------------------
alter table events
  add column if not exists clave_anfitrion text
  default encode(gen_random_bytes(12), 'hex');   -- 24 caracteres, imposible de adivinar

update events
   set clave_anfitrion = encode(gen_random_bytes(12), 'hex')
 where clave_anfitrion is null;

alter table events alter column clave_anfitrion set not null;

comment on column events.clave_anfitrion is
  'Llave privada del organizador. Va en su enlace como &a=<clave>. NO se comparte con los invitados.';

-- --------------------------------------------------------------------------
-- 2) Secreto propio para firmar los pases de anfitrion
--    Distinto del de invitado (`pase_evento`, migracion 0006) a proposito: son
--    dos universos de firmas que no se tocan. Se genera aqui y nunca sale de la
--    base (`app_secretos` tiene RLS activada y SIN politicas = cerrada).
-- --------------------------------------------------------------------------
insert into app_secretos (clave, valor)
values ('pase_anfitrion', encode(gen_random_bytes(32), 'hex'))
on conflict (clave) do nothing;

-- --------------------------------------------------------------------------
-- 3) EMITIR el pase de anfitrion
--    POST /rest/v1/rpc/emitir_pase_anfitrion
--    body: {"p_codigo":"<codigo>","p_clave":"<llave del anfitrion>"}
--    Devuelve el pase, o NULL si el evento no existe, no esta activo, o la
--    llave no es la suya. Nunca dice CUAL de las tres cosas fallo.
-- --------------------------------------------------------------------------
create or replace function emitir_pase_anfitrion(p_codigo text, p_clave text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secreto text;
  v_exp     bigint;
  v_cuerpo  text;
begin
  if p_codigo is null or p_codigo !~ '^[a-zA-Z0-9-]{1,60}$' then
    return null;
  end if;

  -- "demo" es la vitrina publica: cualquiera es anfitrion de la demo, para que
  -- las demostraciones se puedan moderar sin repartir llaves. Es contenido de
  -- mentira y se re-siembra solo. Misma excepcion que en `emitir_pase`.
  if p_codigo <> 'demo' then
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

  v_exp    := extract(epoch from now())::bigint + 1800;   -- 30 minutos, como el de invitado
  v_cuerpo := 'a.' || p_codigo || '.' || v_exp;
  return v_cuerpo || '.' || encode(hmac(v_cuerpo, v_secreto, 'sha256'), 'hex');
end $$;

revoke all     on function emitir_pase_anfitrion(text, text) from public;
grant  execute on function emitir_pase_anfitrion(text, text) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4) VERIFICAR el pase de anfitrion -> devuelve el evento, o NULL.
--    La usan las politicas de abajo. STABLE: se evalua una vez por consulta.
-- --------------------------------------------------------------------------
create or replace function evento_del_pase_anfitrion(p_pase text)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_partes  text[];
  v_evento  text;
  v_exp     bigint;
  v_secreto text;
  v_cuerpo  text;
begin
  if p_pase is null then return null; end if;

  -- Formato: a.<evento>.<exp>.<firma>  (la 'a' del principio lo distingue del
  -- pase de invitado, que es <evento>.<exp>.<firma>).
  v_partes := string_to_array(p_pase, '.');
  if array_length(v_partes, 1) is distinct from 4 then return null; end if;
  if v_partes[1] is distinct from 'a' then return null; end if;

  v_evento := v_partes[2];
  begin
    v_exp := v_partes[3]::bigint;
  exception when others then
    return null;                                   -- caducidad ilegible
  end;

  if v_exp < extract(epoch from now())::bigint then
    return null;                                   -- pase caducado
  end if;

  select valor into v_secreto from public.app_secretos where clave = 'pase_anfitrion';
  if v_secreto is null then return null; end if;

  v_cuerpo := 'a.' || v_evento || '.' || v_partes[3];
  if encode(hmac(v_cuerpo, v_secreto, 'sha256'), 'hex') is distinct from v_partes[4] then
    return null;                                   -- firma invalida / forjada
  end if;

  return v_evento;
end $$;

revoke all     on function evento_del_pase_anfitrion(text) from public;
grant  execute on function evento_del_pase_anfitrion(text) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 5) CONVIVENCIA: por ahora el anfitrion se SUMA a lo que ya valia.
--    Aplicar esta migracion NO rompe nada y NO cierra nada todavia: las apps en
--    vivo siguen entrando como siempre. Lo unico que cambia es que un pase de
--    anfitrion tambien abre. El cierre esta en el BLOQUE DE CORTE del final.
-- --------------------------------------------------------------------------
alter table items enable row level security;

drop policy if exists "lectura por evento" on items;
create policy "lectura por evento" on items for select
  using (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  );

drop policy if exists "escritura por evento" on items;
create policy "escritura por evento" on items for insert
  with check (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  );

drop policy if exists "actualizacion por evento" on items;
create policy "actualizacion por evento" on items for update
  using (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  )
  with check (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  );

drop policy if exists "borrado por evento" on items;
create policy "borrado por evento" on items for delete
  using (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  );


-- ============================================================================
-- BLOQUE FINAL — EL CORTE  ·  ✅ YA CORRIDO (24 jul 2026)
-- ----------------------------------------------------------------------------
-- ⚠️ NO copies este bloque comentado: quedó aquí como historia. El SQL de este
--    corte, listo para correr y comprobado, vive en `0014_cortes_aplicados.sql`.
--    En un proyecto nuevo, corre la 0014; no hace falta descomentar nada aquí.
-- ESTE bloque sustituye al bloque de corte de la migracion 0006. Corre este.
-- Hace las dos cosas de una sola vez:
--   (a) apaga el encabezado viejo `x-evento` (queda solo el pase firmado), y
--   (b) deja el BORRADO exclusivamente en manos del anfitrion.
--
-- CORRER SOLO CUANDO:
--   1. Todas las apps en vivo (muro, playlist, rsvp, dinamicas, album) esten
--      desplegadas con la @salones/sync que manda `x-evento-pase` y
--      `x-evento-anfitrion`.
--   2. Hayas verificado que funcionan (ver docs/LLAVE-ANFITRION.md).
--   3. NO haya un evento en curso. Nunca durante una boda.
--
-- PARA REVERTIR: volver a correr el bloque 5) de CONVIVENCIA de arriba.
--
--   drop policy if exists "lectura por evento" on items;
--   create policy "lectura por evento" on items for select
--     using (
--       evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
--       or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
--     );
--
--   drop policy if exists "escritura por evento" on items;
--   create policy "escritura por evento" on items for insert
--     with check (
--       evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
--       or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
--     );
--
--   drop policy if exists "actualizacion por evento" on items;
--   create policy "actualizacion por evento" on items for update
--     using (
--       evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
--       or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
--     )
--     with check (
--       evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
--       or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
--     );
--
--   -- El candado nuevo: BORRAR es solo del anfitrion.
--   drop policy if exists "borrado por evento" on items;
--   create policy "borrado por evento" on items for delete
--     using (evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion'));
-- ============================================================================


-- ============================================================================
-- CONSULTA UTIL — los enlaces del anfitrion de cada evento
-- ----------------------------------------------------------------------------
-- Pegar en el SQL Editor cuando necesites el enlace privado de un evento:
--
--   select codigo,
--          nombre,
--          clave_anfitrion,
--          '?e=' || codigo || '&a=' || clave_anfitrion as sufijo_anfitrion
--     from events
--    where estado = 'activo'
--    order by creado desc;
--
-- El `sufijo_anfitrion` se pega despues de la direccion de cualquier app:
--   https://proyectos-salones-muro.vercel.app/?e=boda-x7k2&a=9f3c...
-- Ese enlace es PRIVADO: solo para quien organiza. El de los invitados sigue
-- siendo el de siempre, sin el `&a=`.
-- ============================================================================
