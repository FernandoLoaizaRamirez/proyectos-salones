-- ¿El candado de la 0016 hace lo que dice? Se prueba contra un Postgres real.
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function como(p_headers text, p_rol text default 'anon')
returns void language plpgsql as $$
begin
  perform set_config('request.headers', p_headers, false);
  perform set_config('request.jwt.claims', json_build_object('role', p_rol)::text, false);
end $$;

-- Corre una sentencia y dice si paso o si la freno el candado.
create or replace function intento(p_nombre text, p_sql text, p_esperado text)
returns text language plpgsql as $$
declare v_res text;
begin
  begin
    execute p_sql;
    v_res := 'PASA';
  exception
    when insufficient_privilege then v_res := 'FRENA';
    when others then v_res := 'ERROR: ' || sqlerrm;
  end;
  return (case when v_res = p_esperado then '  ok   ' else '  FALLO' end)
      || ' | ' || rpad(p_nombre, 62) || ' | esperado ' || p_esperado || ', dio ' || v_res;
end $$;

-- ---------------------------------------------------------------- semilla
select como(null);                    -- sin cabeceras = Editor SQL
delete from items;
insert into items (evento, coleccion, id, dato) values
  ('boda', 'mensajes',  'M1', '{"texto":"que vivan los novios","nombre":"Ana"}'),
  ('boda', 'fotos',     'F1', '{"url":"https://x/foto.jpg"}'),
  ('boda', 'canciones', 'C1', '{"titulo":"Perfect","votos":3}'),
  ('boda', 'acomodo',   'A1', '{"nombre":"Luis","mesaId":"M-PRIN"}');

\pset tuples_only off
\echo ''
\echo '=== COMO UN INVITADO (el pase que consigue cualquiera con el enlace) ==='
\pset tuples_only on
select como('{"x-evento-pase":"PASE-INVITADO"}');

select intento('vaciar un mensaje ajeno',
  $$update items set dato='{}' where id='M1'$$, 'FRENA');
select intento('vaciar una foto ajena',
  $$update items set dato='{}' where id='F1'$$, 'FRENA');
select intento('UNA peticion: vaciar TODOS los mensajes de la boda',
  $$update items set dato='{}' where evento='boda' and coleccion='mensajes'$$, 'FRENA');
select intento('esconder una foto cambiandole la coleccion',
  $$update items set coleccion='basura' where id='F1'$$, 'FRENA');
select intento('secuestrar el identificador de un mensaje',
  $$update items set id='ROBADO' where id='M1'$$, 'FRENA');
select intento('falsear la fecha de un mensaje',
  $$update items set creado='2000-01-01' where id='M1'$$, 'FRENA');
select intento('mover un mensaje a OTRA boda',
  $$update items set evento='otra-boda' where id='M1'$$, 'FRENA');

\pset tuples_only off
\echo ''
\echo '=== LO QUE UN INVITADO SI TIENE QUE PODER SEGUIR HACIENDO ==='
\pset tuples_only on
select intento('votar una cancion (sube el contador)',
  $$update items set dato='{"titulo":"Perfect","votos":4}' where id='C1'$$, 'PASA');
select intento('moverse de mesa (acomodo)',
  $$update items set dato='{"nombre":"Luis","mesaId":"M-AMIG"}' where id='A1'$$, 'PASA');
select intento('firmar el muro (dar de alta)',
  $$insert into items (evento,coleccion,id,dato) values ('boda','mensajes','M2','{"texto":"felicidades"}')$$, 'PASA');
select intento('subir una foto (dar de alta)',
  $$insert into items (evento,coleccion,id,dato) values ('boda','fotos','F2','{"url":"https://x/2.jpg"}')$$, 'PASA');
select intento('esconder una cancion cambiandole la coleccion (lista blanca NO exime)',
  $$update items set coleccion='basura' where id='C1'$$, 'FRENA');

\pset tuples_only off
\echo ''
\echo '=== LA FECHA DEL ALTA: no la elige quien escribe ==='
\pset tuples_only on
insert into items (evento,coleccion,id,dato,creado,module)
  values ('boda','mensajes','M3','{"texto":"me cuelo arriba"}','2099-01-01','inventado');
select case when creado < now() + interval '1 minute' then '  ok    | la fecha de 2099 se ignoro, quedo ' || creado::date
            else '  FALLO | se guardo la fecha inventada: ' || creado::date end
  from items where id='M3';
select case when module = 'muro' then '  ok    | el module lo derivo la base (muro), no quien escribia'
            else '  FALLO | se guardo el module inventado: ' || module end
  from items where id='M3';

\pset tuples_only off
\echo ''
\echo '=== COMO EL ANFITRION (el que modera, con su llave &a=) ==='
\pset tuples_only on
select como('{"x-evento-pase":"PASE-INVITADO","x-evento-anfitrion":"ANF:boda"}');
select intento('quitar un mensaje subido de tono (vaciarlo)',
  $$update items set dato='{"texto":"[retirado]"}' where id='M1'$$, 'PASA');
select intento('corregir la coleccion de una fila',
  $$update items set coleccion='mensajes' where id='M1'$$, 'PASA');

select como('{"x-evento-pase":"PASE-INVITADO","x-evento-anfitrion":"ANF:OTRA-boda"}');
select intento('llave de OTRA boda: no sirve aqui',
  $$update items set dato='{}' where id='F1'$$, 'FRENA');

\pset tuples_only off
\echo ''
\echo '=== COMO EL SERVIDOR Y COMO EL EDITOR SQL (no les afecta) ==='
\pset tuples_only on
select como('{"x-evento-pase":"PASE-INVITADO"}', 'service_role');
select intento('la llave de servicio pasa (Edge Functions)',
  $$update items set dato='{}' where id='F1'$$, 'PASA');
select como(null);
select intento('el Editor SQL pasa (sin cabeceras)',
  $$update items set coleccion='lo-que-sea' where id='F1'$$, 'PASA');

\pset tuples_only off
\echo ''
\echo '=== ESTADO FINAL: nada se perdio por el camino ==='
select coleccion, count(*) as filas from items group by coleccion order by coleccion;
