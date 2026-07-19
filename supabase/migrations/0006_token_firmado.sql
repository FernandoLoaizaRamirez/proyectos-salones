-- ============================================================================
-- 0006 · CANDADO POR TOKEN FIRMADO (convivencia header + jwt) — Fase 1
-- ----------------------------------------------------------------------------
-- Migra el candado de `items` de "la llave del evento en el encabezado x-evento"
-- (Fase 5) a "un PASE firmado (JWT) que emite la Edge Function `token`". Durante
-- la transicion, las politicas aceptan la llave del evento por CUALQUIERA de dos
-- vias, para no romper nada en vivo:
--
--   (a) el encabezado `x-evento`            -> candado viejo (apps aun no actualizadas)
--   (b) el claim `evento` de un JWT firmado -> pase nuevo (apps ya actualizadas)
--
-- Por que es SEGURO (aditivo/compatible):
--   * Una app vieja sigue entrando por (a): su peticion trae `x-evento`.
--   * Una app nueva entra por (b): manda `Authorization: Bearer <pase>`, y
--     PostgREST verifica la firma con el JWT secret del proyecto y expone el
--     claim en `request.jwt.claims`.
--   * Mientras alguna app mande ambos, cualquiera de las dos condiciones basta.
--
-- Orden de despliegue (ver docs/MIGRACION-TOKEN-FIRMADO.md): primero se publica
-- @salones/sync (que ya manda el pase ADEMAS del header) y la Edge Function;
-- se espera a que las 5 apps esten desplegadas; recien entonces se corre el
-- BLOQUE FINAL de abajo (que apaga la via del header). Esta migracion es solo
-- el paso de CONVIVENCIA y es idempotente (drop policy if exists).
-- ============================================================================

alter table items enable row level security;

-- Lectura: el evento de la fila debe coincidir con el header O con el claim.
drop policy if exists "lectura por evento" on items;
create policy "lectura por evento" on items for select
  using (
    evento = current_setting('request.headers',     true)::json->>'x-evento'
    or
    evento = current_setting('request.jwt.claims',  true)::json->>'evento'
  );

-- Escritura (insert).
drop policy if exists "escritura por evento" on items;
create policy "escritura por evento" on items for insert
  with check (
    evento = current_setting('request.headers',     true)::json->>'x-evento'
    or
    evento = current_setting('request.jwt.claims',  true)::json->>'evento'
  );

-- Actualizacion (update): exige coincidir antes y despues.
drop policy if exists "actualizacion por evento" on items;
create policy "actualizacion por evento" on items for update
  using (
    evento = current_setting('request.headers',     true)::json->>'x-evento'
    or
    evento = current_setting('request.jwt.claims',  true)::json->>'evento'
  )
  with check (
    evento = current_setting('request.headers',     true)::json->>'x-evento'
    or
    evento = current_setting('request.jwt.claims',  true)::json->>'evento'
  );

-- Borrado (delete).
drop policy if exists "borrado por evento" on items;
create policy "borrado por evento" on items for delete
  using (
    evento = current_setting('request.headers',     true)::json->>'x-evento'
    or
    evento = current_setting('request.jwt.claims',  true)::json->>'evento'
  );


-- ============================================================================
-- BLOQUE FINAL — EL PASO DE CORTE  ·  ¡NO CORRER TODAVIA!
-- ----------------------------------------------------------------------------
-- Correr SOLO cuando TODAS las apps en vivo (muro, playlist, rsvp, dinamicas,
-- album) ya esten desplegadas con el @salones/sync que manda el pase, y tras
-- verificar que el pase funciona (ver runbook). Deja el candado SOLO con el
-- pase firmado y apaga la via del header viejo `x-evento`. Para revertir, se
-- vuelve a correr el bloque de CONVIVENCIA de arriba.
--
--   drop policy if exists "lectura por evento" on items;
--   create policy "lectura por evento" on items for select
--     using (evento = current_setting('request.jwt.claims', true)::json->>'evento');
--
--   drop policy if exists "escritura por evento" on items;
--   create policy "escritura por evento" on items for insert
--     with check (evento = current_setting('request.jwt.claims', true)::json->>'evento');
--
--   drop policy if exists "actualizacion por evento" on items;
--   create policy "actualizacion por evento" on items for update
--     using      (evento = current_setting('request.jwt.claims', true)::json->>'evento')
--     with check (evento = current_setting('request.jwt.claims', true)::json->>'evento');
--
--   drop policy if exists "borrado por evento" on items;
--   create policy "borrado por evento" on items for delete
--     using (evento = current_setting('request.jwt.claims', true)::json->>'evento');
-- ============================================================================
