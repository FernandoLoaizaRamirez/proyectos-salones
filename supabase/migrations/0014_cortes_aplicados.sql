-- ============================================================================
-- 0014 · LOS TRES CORTES, YA APLICADOS  (2026-08-06)
-- ----------------------------------------------------------------------------
-- EL PROBLEMA QUE ARREGLA — y no es de la base, es del REPOSITORIO:
--
--   Los tres cortes que convierten la base insegura en la base segura se
--   corrieron A MANO en el proyecto en vivo el 24 jul 2026, siguiendo
--   docs/GUION-DEL-CORTE.md. En las migraciones se quedaron COMENTADOS, con su
--   "¡NO CORRER TODAVIA!" delante.
--
--   Consecuencia: los archivos de supabase/migrations/ describen la base VIEJA.
--   Quien recree el proyecto desde este repositorio —un segundo salon con su
--   propio Supabase, una copia de pruebas, una recuperacion tras un desastre—
--   obtiene una base donde:
--     · cualquier invitado puede BORRAR la boda entera,
--     · cualquiera puede SUBIR al album de cualquier evento, y
--     · todas las fotos se VEN por su direccion, para siempre y sin llave.
--
--   Y el propio supabase/README.md prometia lo contrario ("estos archivos la
--   hacen reproducible y auditable").
--
-- ESTA MIGRACION NO CAMBIA NADA EN EL PROYECTO QUE YA ESTA EN VIVO. Es el mismo
-- SQL que ya se corrio, escrito de forma que se pueda volver a correr sin
-- efecto. Comprobado contra el Supabase real el 6 ago 2026, ANTES de escribirla:
--
--   corte 1a · leer con el encabezado viejo `x-evento` .... 0 filas   (cortado)
--   corte 1b · borrar con pase de INVITADO ................ 0 filas   (cortado)
--              borrar con pase de ANFITRION ............... 1 fila    (funciona)
--   corte 2  · subir directo con la llave publica ......... HTTP 400  (cortado)
--   corte 3  · leer una foto por su direccion publica ..... HTTP 400  (cortado)
--              leer esa misma foto con direccion firmada ... HTTP 200  (funciona)
--
-- EN UN PROYECTO NUEVO, EN CAMBIO, ES EL CIERRE: corre despues de la 0013 y deja
-- la base en el mismo estado seguro que la de produccion.
--
-- ⚠️ ORDEN: requiere la 0006 (pase firmado), la 0009 (llave de anfitrion), la
-- 0010 (permisos de media-subir) y la 0013 aplicadas. Y las Edge Functions
-- `media-subir` y `media-ver` DESPLEGADAS: sin ellas, tras este corte no se
-- pueden ni subir ni ver fotos.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- CORTE 1 (de la 0009) · se apaga el encabezado viejo y BORRAR pasa a ser
--                        exclusivo del anfitrion.
--
-- Hasta aqui las politicas aceptaban TRES cosas: el encabezado crudo `x-evento`
-- (que cualquiera puede escribir a mano), el pase de invitado y el de anfitrion.
-- Esa convivencia existia para poder desplegar las apps sin romper las viejas.
-- Ya no hace falta: se queda solo el pase firmado.
--
-- La diferencia que importa esta en la ultima politica: LEER, ESCRIBIR y
-- ACTUALIZAR siguen abiertos a cualquier invitado del evento (es lo que hace
-- que la gente pueda firmar el muro y subir fotos), pero BORRAR exige el pase de
-- ANFITRION. Es lo que impide que un invitado molesto vacie la boda entera.
-- ----------------------------------------------------------------------------

drop policy if exists "lectura por evento" on items;
create policy "lectura por evento" on items for select
  using (
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  );

drop policy if exists "escritura por evento" on items;
create policy "escritura por evento" on items for insert
  with check (
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  );

drop policy if exists "actualizacion por evento" on items;
create policy "actualizacion por evento" on items for update
  using (
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  )
  with check (
    evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
    or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
  );

-- El candado: BORRAR es solo del anfitrion.
drop policy if exists "borrado por evento" on items;
create policy "borrado por evento" on items for delete
  using (evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion'));


-- ----------------------------------------------------------------------------
-- CORTE 2 (de la 0010) · el almacen deja de aceptar subidas directas.
--
-- La 0001 dejaba UNA regla: "cualquiera puede subir al bucket media". Como la
-- llave publica viaja dentro del JavaScript de cada app, cualquiera podia
-- sacarla y meter archivos en la carpeta de CUALQUIER evento, o llenar el
-- almacen hasta reventar la cuota.
--
-- Quitandola, la UNICA forma de escribir es una URL de subida firmada por la
-- Edge Function `media-subir`, que antes verifica el pase y decide ELLA la
-- carpeta. El navegador ya no elige donde escribe.
-- ----------------------------------------------------------------------------

drop policy if exists "subida publica media" on storage.objects;


-- ----------------------------------------------------------------------------
-- CORTE 3 (de la 0013) · el almacen deja de ser publico.
--
-- En un bucket publico el almacen NI SIQUIERA consulta las politicas: quien
-- tuviera la direccion de una foto la veia, sin llave y PARA SIEMPRE. Una
-- direccion filtrada no caducaba nunca.
--
-- En privado, las fotos solo se ven con una direccion FIRMADA que caduca en una
-- hora, y esas direcciones las reparte `media-ver` despues de comprobar el pase
-- del evento y que la ruta pedida sea de ESE evento.
-- ----------------------------------------------------------------------------

update storage.buckets set public = false where id = 'media';


-- ============================================================================
-- COMO SE COMPRUEBA QUE QUEDO BIEN (en un proyecto nuevo)
-- ----------------------------------------------------------------------------
--   1) Las politicas de `items` — deben ser 4, y la de DELETE solo con anfitrion:
--
--        select policyname, cmd, qual
--          from pg_policies
--         where tablename = 'items'
--         order by cmd;
--
--   2) El bucket — `public` debe ser false:
--
--        select id, public, file_size_limit, allowed_mime_types
--          from storage.buckets where id = 'media';
--
--   3) Que NO quede la regla de subida abierta:
--
--        select policyname from pg_policies
--         where schemaname = 'storage' and tablename = 'objects';
--
--   Y de punta a punta, con `pnpm test` y las variables del proyecto puestas:
--   la suite de tests/aislamiento/ comprueba los tres cortes contra la base real,
--   y el CENTINELA (tests/aislamiento/centinela.test.ts) se pone rojo si alguna
--   de las piezas se apaga.
--
-- PARA REVERTIR (deja todo como antes de los cortes; solo en una emergencia):
--
--   -- vuelve a aceptar el encabezado viejo y que cualquiera borre
--   drop policy if exists "borrado por evento" on items;
--   create policy "borrado por evento" on items for delete
--     using (
--       evento = current_setting('request.headers', true)::json->>'x-evento'
--       or evento = evento_del_pase(current_setting('request.headers', true)::json->>'x-evento-pase')
--       or evento = evento_del_pase_anfitrion(current_setting('request.headers', true)::json->>'x-evento-anfitrion')
--     );
--
--   create policy "subida publica media" on storage.objects for insert
--     with check (bucket_id = 'media');
--
--   update storage.buckets set public = true where id = 'media';
-- ============================================================================
