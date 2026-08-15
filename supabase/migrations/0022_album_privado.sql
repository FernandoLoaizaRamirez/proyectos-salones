-- ============================================================================
-- 0022 · ALBUM PRIVADO: cada invitado ve SOLO lo suyo  (2026-08-15)
-- ----------------------------------------------------------------------------
-- QUE RESUELVE:
--   Hoy el album es de todos para todos: quien tiene el QR ve —y se descarga—
--   las fotos de los 200 invitados. Para muchas bodas eso es justo la gracia,
--   pero no siempre: hay eventos donde los novios quieren revisar antes de que
--   se vea entero, y hay salones que no quieren que un invitado se lleve fotos
--   de las familias de los demas.
--
--   Con el album PRIVADO, cada quien sigue subiendo igual pero solo ve lo suyo.
--   El anfitrion lo ve todo, como siempre.
--
-- POR QUE ESTO ES UNA POLITICA Y NO UN FILTRO EN LA PANTALLA:
--   Filtrar en el navegador no seria privacidad: el telefono del invitado
--   RECIBIRIA igualmente las fotos de todos y solo dejaria de pintarlas. Con
--   abrir las herramientas del navegador —o mirar el trafico— estarian ahi.
--   Prometer "privado" y mandar los datos igual es peor que no prometerlo.
--   Aqui el servidor NO LAS MANDA.
--
-- COMO SABE EL SERVIDOR CUALES SON LAS TUYAS:
--   Por la HUELLA de autor que ya llevan las fotos desde el 14 ago (la del
--   `media-borrar`). El navegador la presenta en el encabezado `x-autor-huella`
--   y la politica compara. Sin encabezado no se ve ninguna, que es el lado
--   seguro del error.
--
--   ¿Y si alguien roba la huella de otro? Para eso tendria que haber LEIDO su
--   fila, o sea, haber visto el album cuando estaba publico — y entonces ya se
--   habia descargado esas fotos de todas formas. En un album privado desde el
--   principio no hay de donde sacarlas. Y la huella NO sirve para borrar: eso
--   exige la llave entera, de la que la huella no se puede deshacer.
--
-- ⚠️ ESTA MIGRACION TOCA LA POLITICA DE LECTURA DE `items`, que es por donde
--   leen TODAS las apps (muro, playlist, rsvp, mesas, pases, dinamicas…). Por
--   eso la condicion nueva se limita a `coleccion = 'fotos'` y a los albumes
--   marcados como privados: para todo lo demas la politica queda EXACTAMENTE
--   como estaba. Comprobado en el banco antes de tocar produccion.
--
-- Requiere la 0006 (pase firmado), la 0009 (llave de anfitrion) y la 0014
-- (cortes) aplicadas.
-- ============================================================================

alter table events add column if not exists album_privado boolean not null default false;

comment on column events.album_privado is
  'Con true, cada invitado solo ve las fotos que subio el (el anfitrion las ve todas). Lo hace valer la politica de lectura de items, no la pantalla. No confundir con album_cerrado, que es dejar de admitir fotos nuevas.';


-- ----------------------------------------------------------------------------
-- ¿Es privado el album de este evento?
--
-- Ante la duda —evento que no existe— responde FALSE, o sea "publico", que es
-- como se ha comportado siempre. Cambiar el comportamiento historico por un
-- fallo de lectura seria peor que el propio fallo.
-- ----------------------------------------------------------------------------
create or replace function album_es_privado(p_codigo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select album_privado from events where codigo = p_codigo), false);
$$;

grant execute on function album_es_privado(text) to anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- Cambiarlo. La credencial es el PASE DE ANFITRION, igual que en la 0021.
-- ----------------------------------------------------------------------------
create or replace function cambiar_privacidad_album(p_pase text, p_privado boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
begin
  if p_pase is null or p_pase = '' or p_privado is null then
    return false;
  end if;
  v_codigo := evento_del_pase_anfitrion(p_pase);
  if v_codigo is null or v_codigo = '' then
    return false;
  end if;
  update events set album_privado = p_privado where codigo = v_codigo;
  return found;
end $$;

grant execute on function cambiar_privacidad_album(text, boolean) to anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- LA POLITICA DE LECTURA.
--
-- Se reescribe entera —no se puede "añadir" a una politica— pero los dos
-- caminos que ya existian se conservan tal cual:
--
--   · ANFITRION (x-evento-anfitrion): ve TODO. Sin cambios.
--   · INVITADO  (x-evento-pase): ve su evento. Sin cambios… salvo que se trate
--     de la coleccion `fotos` de un album marcado como privado, y entonces solo
--     ve las filas cuya huella de autor coincide con la que presenta.
--
-- El orden de la condicion importa por lo barato: `coleccion <> 'fotos'` corta
-- de inmediato para el muro, la playlist, el rsvp y todo lo demas, que ni
-- llegan a preguntar si el album es privado.
-- ----------------------------------------------------------------------------
drop policy if exists "lectura por evento" on items;
create policy "lectura por evento" on items for select
  using (
    -- Quien organiza lo ve todo, como hasta ahora.
    evento = evento_del_pase_anfitrion(
      current_setting('request.headers', true)::json->>'x-evento-anfitrion'
    )
    or (
      evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
      and (
        coleccion <> 'fotos'
        or not album_es_privado(evento)
        or dato->>'autorHuella' =
             current_setting('request.headers', true)::json->>'x-autor-huella'
      )
    )
  );


-- ============================================================================
-- CONSULTAS UTILES
-- ----------------------------------------------------------------------------
--   Que albumes son privados:
--
--     select codigo, nombre, album_privado, album_cerrado from events;
--
--   Ponerlo a mano:
--
--     update events set album_privado = true where codigo = '<codigo-evento>';
--
--   COMPROBAR QUE NO SE ROMPIO NADA (lo importante de esta migracion): que un
--   pase de invitado siga leyendo el muro y la playlist con normalidad.
--
-- PARA REVERTIR (vuelve el album de todos para todos):
--
--   drop policy if exists "lectura por evento" on items;
--   create policy "lectura por evento" on items for select
--     using (
--       evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
--       or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
--     );
--   drop function if exists cambiar_privacidad_album(text, boolean);
--   drop function if exists album_es_privado(text);
--   alter table events drop column if exists album_privado;
-- ============================================================================
