-- ============================================================================
-- 0006 · CANDADO POR PASE FIRMADO (convivencia header + pase) — Fase 1
-- ----------------------------------------------------------------------------
-- Sustituye la llave del evento en crudo (`x-evento`, Fase 5) por un PASE
-- FIRMADO y de corta duracion (30 min). Todo ocurre DENTRO de Postgres:
--
--   emitir_pase(p_codigo)   -> valida el evento y devuelve  <evento>.<exp>.<firma>
--   evento_del_pase(p_pase) -> verifica firma + caducidad y devuelve el evento
--
-- POR QUE ASI (decision de diseno, 2026-07-20):
--   El primer intento firmaba un JWT con el "JWT secret" del proyecto para que
--   PostgREST lo verificara. NO FUNCIONA en este proyecto: ya migro a llaves de
--   firma ASIMETRICAS (ES256) y rechaza los HS256 ("PGRST301: No suitable key or
--   wrong key type"); ademas Supabase marca el secreto legacy como "a desactivar".
--   Construir el candado sobre esa llave seria construir sobre arena.
--   Esta version NO depende de las llaves de Supabase ni de Edge Functions:
--   firma y verificacion usan el MISMO secreto, en el MISMO sitio (sin riesgo de
--   incompatibilidad entre lenguajes) y el secreto se genera aqui y nunca sale.
--
-- SEGURIDAD:
--   * El secreto vive en `app_secretos`, con RLS activada y SIN politicas =
--     nadie lo puede leer con la llave publica; solo lo tocan las funciones
--     `security definer` de abajo, que jamas lo devuelven.
--   * El pase caduca (30 min) y es por evento: el pase de un evento no abre otro.
--   * Sin el secreto no se puede fabricar un pase valido (HMAC-SHA256).
--
-- COMPATIBLE: las politicas aceptan el header viejo O el pase nuevo, para no
-- romper las apps en vivo mientras se despliegan. El corte final (dejar solo el
-- pase) esta al final, comentado.
-- ============================================================================

create extension if not exists pgcrypto;   -- hmac() y gen_random_bytes()

-- --------------------------------------------------------------------------
-- 1) Cajon de secretos del backend (cerrado a cal y canto)
-- --------------------------------------------------------------------------
create table if not exists app_secretos (
  clave   text primary key,
  valor   text not null,
  creado  timestamptz not null default now()
);

alter table app_secretos enable row level security;  -- sin politicas = cerrada

-- El secreto del pase se GENERA AQUI (32 bytes aleatorios) y nunca sale de la
-- base: ni el operador ni el cliente necesitan copiarlo a ningun lado.
insert into app_secretos (clave, valor)
values ('pase_evento', encode(gen_random_bytes(32), 'hex'))
on conflict (clave) do nothing;

-- --------------------------------------------------------------------------
-- 2) EMITIR el pase (lo llaman las apps por RPC con la llave publica)
--    POST /rest/v1/rpc/emitir_pase   body: {"p_codigo":"<codigo del evento>"}
--    Devuelve el pase, o NULL si el evento no existe / no esta activo.
-- --------------------------------------------------------------------------
create or replace function emitir_pase(p_codigo text)
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
  -- Mismo formato de codigo que `eventoActual()` en @salones/sync.
  if p_codigo is null or p_codigo !~ '^[a-zA-Z0-9-]{1,60}$' then
    return null;
  end if;

  -- El evento debe existir y estar ACTIVO. "demo" es la vitrina publica: siempre
  -- vale (asi las demos nunca se quedan sin pase).
  if p_codigo <> 'demo'
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
end $$;

revoke all     on function emitir_pase(text) from public;
grant  execute on function emitir_pase(text) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 3) VERIFICAR el pase -> devuelve el evento si es valido, si no NULL.
--    La usan las politicas RLS de abajo. Es STABLE: se evalua una vez por
--    consulta (el encabezado es el mismo para toda la peticion).
-- --------------------------------------------------------------------------
create or replace function evento_del_pase(p_pase text)
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

  v_partes := string_to_array(p_pase, '.');
  if array_length(v_partes, 1) is distinct from 3 then return null; end if;

  v_evento := v_partes[1];
  begin
    v_exp := v_partes[2]::bigint;
  exception when others then
    return null;                                   -- caducidad ilegible
  end;

  if v_exp < extract(epoch from now())::bigint then
    return null;                                   -- pase caducado
  end if;

  select valor into v_secreto from public.app_secretos where clave = 'pase_evento';
  if v_secreto is null then return null; end if;

  v_cuerpo := v_evento || '.' || v_partes[2];
  if encode(hmac(v_cuerpo, v_secreto, 'sha256'), 'hex') is distinct from v_partes[3] then
    return null;                                   -- firma invalida / forjada
  end if;

  return v_evento;
end $$;

revoke all     on function evento_del_pase(text) from public;
grant  execute on function evento_del_pase(text) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4) RLS de `items`: vale el encabezado VIEJO (x-evento) O el PASE nuevo.
--    Aditivo y compatible: las apps sin actualizar siguen entrando por el header.
-- --------------------------------------------------------------------------
alter table items enable row level security;

drop policy if exists "lectura por evento" on items;
create policy "lectura por evento" on items for select
  using (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
  );

drop policy if exists "escritura por evento" on items;
create policy "escritura por evento" on items for insert
  with check (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
  );

drop policy if exists "actualizacion por evento" on items;
create policy "actualizacion por evento" on items for update
  using (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
  )
  with check (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
  );

drop policy if exists "borrado por evento" on items;
create policy "borrado por evento" on items for delete
  using (
    evento = current_setting('request.headers', true)::json->>'x-evento'
    or
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
  );


-- ============================================================================
-- BLOQUE FINAL — EL PASO DE CORTE  ·  ¡NO CORRER TODAVIA!
-- ----------------------------------------------------------------------------
-- Correr SOLO cuando TODAS las apps en vivo (muro, playlist, rsvp, dinamicas,
-- album) esten desplegadas mandando el pase, y tras verificar que funciona.
-- Deja el candado SOLO con el pase firmado y apaga el header viejo `x-evento`.
-- Para revertir: volver a correr el bloque de CONVIVENCIA de arriba.
--
--   drop policy if exists "lectura por evento" on items;
--   create policy "lectura por evento" on items for select
--     using (evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase'));
--
--   drop policy if exists "escritura por evento" on items;
--   create policy "escritura por evento" on items for insert
--     with check (evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase'));
--
--   drop policy if exists "actualizacion por evento" on items;
--   create policy "actualizacion por evento" on items for update
--     using      (evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase'))
--     with check (evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase'));
--
--   drop policy if exists "borrado por evento" on items;
--   create policy "borrado por evento" on items for delete
--     using (evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase'));
-- ============================================================================
