-- ============================================================================
-- 0023 · EL TOPE DE SUBIDAS VUELVE A TOPAR
--
-- QUE PROBLEMA RESUELVE
--   La 0022 reescribio `permitir_subida` para que las vitrinas por visitante
--   tuvieran su propio techo (60/hora). Al reescribirla se perdieron DOS cosas
--   que la 0015 habia puesto a proposito, y las dos se comprobaron rotas contra
--   produccion el 21 ago 2026:
--
--   1) SE PERDIO EL APUNTE. La version de la 0015 contaba Y APUNTABA en la
--      misma llamada (`insert into media_permisos`). La de la 0022 solo cuenta.
--      Como nadie mas escribe en esa tabla --se reviso el repo entero: el unico
--      insert que existia estaba dentro de la propia funcion-- los contadores
--      se quedan SIEMPRE en cero y la funcion contesta SIEMPRE que si.
--
--      Medido: 65 llamadas seguidas con la misma huella, 65 concedidas. Con el
--      tope de 60/hora de la 0022, la numero 61 tenia que haber dicho que no.
--      O sea: desde que se corrio la 0022, el tope de subidas no topa nada.
--
--   2) SE PERDIO EL CANDADO. La 0015 decia, con estas palabras: "Solo la Edge
--      Function (llave de servicio) puede pedir permiso. Si esto se pudiera
--      llamar desde el navegador, cualquiera gastaria el cupo de una boda." La
--      0022 le dio `grant execute ... to anon, authenticated`, y con eso
--      cualquiera con la llave publica puede llamarla. Es lo que puso en ROJO a
--      `tests/aislamiento/media.test.ts`; la prueba tenia razon.
--
-- QUE CAMBIA AQUI
--   Se vuelve a crear la funcion con la logica de la 0022 --las vitrinas y sus
--   topes se respetan tal cual-- y se le devuelve el `insert` y el candado.
--
-- POR QUE ES SEGURO QUITARLE EL PERMISO A `anon`
--   Se reviso quien la llama: solo `supabase/functions/media-subir/index.ts`, y
--   la llama con SERVICE_ROLE. Ningun navegador la necesita. (Y si algun dia la
--   necesitara, la respuesta NO es abrirla: es que la pida la Edge Function.)
--
-- IDEMPOTENTE: se puede correr dos veces sin romper nada.
--
-- COMO SE CORRE (a mano, como todas en este proyecto — NUNCA `db push`):
--   npx supabase db query --linked --project-ref cpbfisylcquuahrmyaca \
--     -f supabase/migrations/0023_tope_subidas_vuelve.sql
-- ============================================================================

create or replace function permitir_subida(p_evento text, p_huella text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_por_pase    int;
  v_por_evento  int;
  v_tope_pase   constant int := 60;
  v_tope_evento int;
begin
  if p_evento is null or p_evento = '' or p_huella is null or p_huella = '' then
    return false;
  end if;

  -- Los topes son los de la 0022, sin tocarlos: la vitrina compartida de
  -- siempre aguanta 300, la vitrina de un visitante 60, y una boda real 5000.
  v_tope_evento := case
                     when p_evento = 'demo'    then 300
                     when es_vitrina(p_evento) then 60
                     else 5000
                   end;

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

  -- EL APUNTE, que es lo que se habia perdido. Cuenta y apunta en la MISMA
  -- llamada y dentro de la misma transaccion: si dos peticiones llegan a la
  -- vez, no pueden colarse las dos por el mismo hueco.
  insert into media_permisos (evento, huella) values (p_evento, p_huella);
  return true;
end $fn$;

-- El candado de la 0015, tal cual. `revoke ... from public` no basta por si
-- solo: `anon` y `authenticated` recibieron el permiso DIRECTAMENTE en la 0022,
-- asi que hay que quitarselo a cada uno por su nombre.
revoke all on function permitir_subida(text, text) from public;
revoke all on function permitir_subida(text, text) from anon;
revoke all on function permitir_subida(text, text) from authenticated;
grant execute on function permitir_subida(text, text) to service_role;

-- ----------------------------------------------------------------------------
-- COMO COMPROBAR QUE QUEDO (desde fuera, con la llave publica):
--
--   curl -s -o /dev/null -w '%{http_code}\n' -X POST \
--     "$URL/rest/v1/rpc/permitir_subida" -H "apikey: $ANON" \
--     -H 'Content-Type: application/json' \
--     -d '{"p_evento":"demo","p_huella":"x"}'
--
--   Antes de esta migracion: 200 (y `true`). Despues: 401/403/404 — PostgREST
--   esconde lo que no puedes ejecutar. Es justo lo que exige
--   `tests/aislamiento/media.test.ts`, que hoy esta en rojo.
--
-- Y que el tope vuelve a topar (esto ya necesita la llave de servicio, porque
-- desde fuera ya no se puede llamar): 61 llamadas con la misma huella, y la
-- ultima tiene que contestar `false`.
-- ----------------------------------------------------------------------------
