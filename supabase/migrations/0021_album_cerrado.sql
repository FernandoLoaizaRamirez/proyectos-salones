-- ============================================================================
-- 0021 · CERRAR EL ALBUM  (2026-08-14)
-- ----------------------------------------------------------------------------
-- QUE RESUELVE:
--   Cuando la boda termina, el album sigue abierto para siempre. Quien organiza
--   no tiene forma de decir "ya esta, esto es lo que hay": cualquiera con el QR
--   —o con una foto del QR hecha en la fiesta— puede seguir subiendo semanas
--   despues. Y cada foto que entra despues del evento sigue gastando el cupo del
--   plan gratis (0019), que es de todas las bodas a la vez.
--
--   Cerrar el album NO esconde nada: se sigue viendo y descargando. Solo deja de
--   admitir contenido nuevo. Y se puede volver a abrir.
--
-- POR QUE UNA COLUMNA Y NO UNA "FUNCION" MAS (decision de diseno):
--   Lo facil habria sido reusar `features` + `event_overrides` con una clave
--   tipo 'album-cerrado', porque asi `evento_tiene_funcion` (0017) ya lo
--   respondia sin escribir nada nuevo. NO se hizo: `features` es el catalogo de
--   lo que se VENDE, y esto es un ESTADO. Meterlo ahi tiene una trampa concreta
--   —si algun dia alguien lo agrega a un plan, cerraria de golpe el album de
--   TODOS los eventos de ese plan— y ese fallo seria dificil de entender.
--
-- POR QUE EL ANFITRION SI PUEDE SEGUIR SUBIENDO CON EL ALBUM CERRADO:
--   Es lo util: se cierra a los invitados y despues se agregan las fotos del
--   fotografo, o la del pastel que faltaba. Cerrar es para que no entre lo de
--   fuera, no para atarse las manos. Quien cierra puede abrir.
--
-- EN QUE SE DIFERENCIA DE `evento-cierre` (que ya existia): aquella es la
--   operacion TERMINAL —entregar todo el material y BORRAR la boda—, pide sesion
--   de staff y pone `events.estado = 'cerrado'`. Esto es un interruptor
--   reversible que maneja quien organiza desde su propio enlace.
--
-- Requiere la 0009 (llave de anfitrion) aplicada.
-- ============================================================================

alter table events add column if not exists album_cerrado boolean not null default false;

comment on column events.album_cerrado is
  'Interruptor reversible del anfitrion: con true, los invitados ya no pueden subir al album (verlo y descargarlo sigue igual). No confundir con estado=cerrado, que es la entrega y borrado definitivos.';


-- ----------------------------------------------------------------------------
-- ¿Esta cerrado el album de este evento?
--
-- Publica: la contesta el navegador para no dibujar una zona de subida que el
-- servidor va a rechazar. Ante la duda —evento que no existe— responde FALSE,
-- o sea "abierto": un fallo aqui no puede dejar a una boda sin poder subir
-- fotos en plena fiesta. El que de verdad decide es `media-subir`.
-- ----------------------------------------------------------------------------
create or replace function album_esta_cerrado(p_codigo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select album_cerrado from events where codigo = p_codigo), false);
$$;


-- ----------------------------------------------------------------------------
-- Cerrar (o volver a abrir) el album.
--
-- La credencial es el PASE DE ANFITRION, el mismo que permite borrar desde la
-- 0009. No hace falta nada mas: quien tiene ese pase es quien organiza.
--
-- Devuelve `true` si se hizo. `false` significa "ese pase no vale", y a
-- proposito no se distingue de "el evento no existe": no se le confirma a nadie
-- que un codigo es bueno.
-- ----------------------------------------------------------------------------
create or replace function cerrar_album(p_pase text, p_cerrado boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
begin
  if p_pase is null or p_pase = '' or p_cerrado is null then
    return false;
  end if;

  -- La misma verificacion que usan las Edge Functions: firma y caducidad.
  v_codigo := evento_del_pase_anfitrion(p_pase);
  if v_codigo is null or v_codigo = '' then
    return false;
  end if;

  update events set album_cerrado = p_cerrado where codigo = v_codigo;
  return found;
end $$;


-- ----------------------------------------------------------------------------
-- Permisos. Las dos son publicas porque las llama el navegador, y las dos estan
-- protegidas por lo que hace falta presentar: nada para leer (es un si/no que
-- se nota igual al intentar subir) y el pase de anfitrion para escribir.
-- ----------------------------------------------------------------------------
grant execute on function album_esta_cerrado(text) to anon, authenticated, service_role;
grant execute on function cerrar_album(text, boolean) to anon, authenticated, service_role;


-- ============================================================================
-- CONSULTAS UTILES
-- ----------------------------------------------------------------------------
--   Que albumes estan cerrados:
--
--     select codigo, nombre, album_cerrado from events order by album_cerrado desc;
--
--   Cerrarlo a mano (sin pasar por la pantalla del anfitrion):
--
--     update events set album_cerrado = true where codigo = '<codigo-evento>';
--
-- PARA REVERTIR:
--
--   drop function if exists cerrar_album(text, boolean);
--   drop function if exists album_esta_cerrado(text);
--   alter table events drop column if exists album_cerrado;
--
--   ...y quitar la comprobacion de `supabase/functions/media-subir/index.ts`.
-- ============================================================================
