-- ============================================================================
-- 0017 · PAQUETE DE VIDEO  (2026-08-14)
-- ----------------------------------------------------------------------------
-- QUE HACE:
--   Convierte "subir video" en una funcion VENDIBLE (`video`), apagada por
--   defecto, y crea el plan que la incluye. Antes de esto, cualquier evento
--   podia subir video sin que nadie lo hubiera contratado.
--
-- POR QUE SE VENDE APARTE (es una razon de costo, no de capricho):
--   Una foto se comprime a ~250 KB antes de subir (`comprimirImagen`). Un video
--   sube TAL CUAL hasta los 25 MB que admite el bucket (ver 0001). O sea, un
--   solo video pesa como CIEN fotos. Y todos los eventos comparten el mismo
--   cajon: una boda con video puede gastar el almacenamiento de quince bodas de
--   solo fotos. Hasta hoy eso se regalaba.
--
-- LA DECISION IMPORTANTE — APAGADA POR DEFECTO:
--   Si no consta que un evento tiene el paquete, NO lo tiene. En una funcion que
--   cuesta dinero, la duda se resuelve en contra de regalarla. Consecuencia que
--   hay que saber: al aplicar esta migracion, los eventos que hoy existen dejan
--   de poder subir video hasta que se les ponga el plan nuevo o un override.
--   Lo YA SUBIDO no se toca ni se borra: se sigue viendo con normalidad.
--
-- POR QUE UNA FUNCION SQL Y NO CODIGO EN CADA SITIO:
--   Esto lo tienen que responder DOS mundos: el navegador (para esconder el
--   boton) y la Edge Function `media-subir` (para negar la subida de verdad).
--   Si cada uno lo calculara por su cuenta habria dos motores comerciales que
--   pueden discrepar, y el que manda seria el equivocado. Con una funcion en la
--   base hay UNA respuesta, y el candado y la interfaz no se pueden desalinear.
--
--   Respeta la MISMA precedencia que `resolveEntitlements` de @salones/core:
--     1) las funciones del PLAN del salon,
--     2) los overrides del SALON  (pueden encender o apagar),
--     3) los overrides del EVENTO (mandan sobre todo).
--
-- Requiere la 0002 (plano de control) aplicada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) La funcion vendible y el plan que la trae.
-- ----------------------------------------------------------------------------
insert into features (clave, nombre, descripcion) values
  ('video', 'Paquete de video', 'Los invitados pueden subir video, no solo fotos. Se cobra aparte porque un video ocupa como cien fotos.')
on conflict (clave) do nothing;

insert into plans (id, nombre, descripcion, orden) values
  ('gestionado-video', 'Gestionado con video', 'Todo lo del plan Gestionado y ademas los invitados pueden subir video.', 2)
on conflict (id) do nothing;

-- El plan nuevo = todo lo que trae 'gestionado' + 'video'. Se copia de
-- `plan_features` en vez de repetir la lista a mano: asi, si manana se le agrega
-- un modulo a 'gestionado', no se queda este plan cojo por un despiste.
insert into plan_features (plan_id, feature_clave)
  select 'gestionado-video', feature_clave from plan_features where plan_id = 'gestionado'
on conflict do nothing;

insert into plan_features (plan_id, feature_clave) values
  ('gestionado-video', 'video')
on conflict do nothing;

-- OJO: 'gestionado', 'renta' y 'compra' se quedan SIN 'video' a proposito. Esa
-- es justo la diferencia por la que se cobra.


-- ----------------------------------------------------------------------------
-- 2) ¿Tiene este evento esta funcion?
--
-- La respuesta unica, para el navegador y para `media-subir`. Devuelve `false`
-- ante cualquier duda: evento desconocido, sin plan, o parametros vacios.
-- ----------------------------------------------------------------------------
create or replace function evento_tiene_funcion(p_codigo text, p_clave text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_id  uuid;
  v_tenant_id uuid;
  v_plan_id   text;
  v_activa    boolean;
  v_override  boolean;
begin
  if p_codigo is null or p_codigo = '' or p_clave is null or p_clave = '' then
    return false;
  end if;

  select e.id, e.tenant_id, t.plan_id
    into v_event_id, v_tenant_id, v_plan_id
    from events e
    join tenants t on t.id = e.tenant_id
   where e.codigo = p_codigo
   limit 1;

  -- Evento que no existe: no consta que tenga nada.
  if v_event_id is null then
    return false;
  end if;

  -- 1) Base: lo que trae el plan del salon.
  v_activa := v_plan_id is not null and exists (
    select 1 from plan_features
     where plan_id = v_plan_id and feature_clave = p_clave
  );

  -- 2) Override del salon. `habilitado` es NOT NULL, asi que si v_override sale
  --    nulo es que NO habia fila, no que la hubiera puesta a nulo.
  select habilitado into v_override
    from tenant_entitlements
   where tenant_id = v_tenant_id and feature_clave = p_clave;
  if v_override is not null then
    v_activa := v_override;
  end if;

  -- 3) Override del evento: tiene la ultima palabra.
  select habilitado into v_override
    from event_overrides
   where event_id = v_event_id and feature_clave = p_clave;
  if v_override is not null then
    v_activa := v_override;
  end if;

  return v_activa;
end $$;

-- Se puede preguntar desde el navegador: hace falta para esconder el boton, y lo
-- unico que revela —a quien YA tiene el codigo del evento— es si ese evento
-- contrato una funcion. Es del mismo nivel que lo que `evento-config` ya publica.
-- El candado de verdad no es este permiso: es que `media-subir` no firma la
-- subida de un video sin preguntar aqui primero.
grant execute on function evento_tiene_funcion(text, text) to anon;
grant execute on function evento_tiene_funcion(text, text) to authenticated;
grant execute on function evento_tiene_funcion(text, text) to service_role;


-- ============================================================================
-- COMO SE VENDE EL PAQUETE A UN SALON (las dos formas)
-- ----------------------------------------------------------------------------
--   a) Al salon entero, cambiandole el plan:
--
--        update tenants set plan_id = 'gestionado-video' where slug = '<salon>';
--
--   b) A UN evento suelto (una boda que lo pidio, sin cambiarle el plan al
--      salon). Hace falta el id del evento:
--
--        insert into event_overrides (event_id, feature_clave, habilitado)
--          select id, 'video', true from events where codigo = '<codigo-evento>'
--        on conflict (event_id, feature_clave) do update set habilitado = true;
--
--   Para QUITARSELO a un evento del plan con video, el mismo insert con `false`.
--
--   Comprobar como quedo:
--
--        select evento_tiene_funcion('<codigo-evento>', 'video');
--
-- PARA REVERTIR (vuelve a haber video para todos):
--
--   drop function if exists evento_tiene_funcion(text, text);
--   delete from plan_features where plan_id = 'gestionado-video';
--   delete from plans        where id = 'gestionado-video';
--   delete from features     where clave = 'video';
--
--   ...y quitar la comprobacion de `supabase/functions/media-subir/index.ts` y
--   la llamada a `eventoTieneFuncion` en los dos albumes.
-- ============================================================================
