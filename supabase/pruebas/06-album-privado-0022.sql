-- ============================================================================
-- Comprobaciones de la 0022 (album privado: cada quien ve solo lo suyo).
--
-- LO QUE MAS IMPORTA AQUI NO ES LA FUNCION NUEVA, es que la politica de lectura
-- de `items` —por donde leen TODAS las apps— siga haciendo lo de siempre para
-- todo lo demas. Un fallo ahi no rompe el album: deja al muro, la playlist, el
-- rsvp, las mesas y los pases sin datos, en plena boda. Por eso la mitad de los
-- casos de abajo son "esto tiene que seguir igual".
--
-- Se corre despues de: 02-banco-plano-de-control.sql, los dobles de abajo y 0022.
-- ============================================================================
\set QUIET on
\pset tuples_only on
\pset format unaligned

-- Tabla `items` y dobles de los pases (en la base real los crean 0001/0006/0009).
create table if not exists items (
  evento text not null, coleccion text not null, id text primary key,
  dato jsonb not null default '{}', creado timestamptz not null default now()
);
alter table items enable row level security;

create or replace function evento_del_pase(p text) returns text
  language sql immutable as $$ select case when p like 'i.%' then split_part(p,'.',2) end $$;
create or replace function evento_del_pase_anfitrion(p text) returns text
  language sql immutable as $$ select case when p like 'a.%' then split_part(p,'.',2) end $$;

-- Simula los encabezados que manda el navegador.
create or replace function comoSi(p_pase text, p_anf text, p_huella text) returns void
language plpgsql as $$
begin
  perform set_config('request.headers',
    json_build_object('x-evento-pase', p_pase, 'x-evento-anfitrion', p_anf,
                      'x-autor-huella', p_huella)::text, false);
  -- ⚠️ false (de SESION) y no true (de transaccion): psql abre una transaccion
  -- por sentencia, asi que con `true` el encabezado se perderia antes de la
  -- consulta siguiente y la politica no veria nada.
end $$;

-- Un rol sin privilegios especiales: la RLS no se aplica al dueno de la tabla.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='invitado_de_prueba') then
    create role invitado_de_prueba;
  end if;
end $$;
grant select on items to invitado_de_prueba;
grant execute on function album_es_privado(text) to invitado_de_prueba;
grant execute on function evento_del_pase(text), evento_del_pase_anfitrion(text) to invitado_de_prueba;
grant select on events to invitado_de_prueba;

delete from items;
insert into items (evento, coleccion, id, dato) values
  ('boda-fotos','fotos','F1','{"nombre":"ana1.jpg","autorHuella":"huella-de-ana"}'),
  ('boda-fotos','fotos','F2','{"nombre":"ana2.jpg","autorHuella":"huella-de-ana"}'),
  ('boda-fotos','fotos','F3','{"nombre":"beto1.jpg","autorHuella":"huella-de-beto"}'),
  ('boda-fotos','fotos','F4','{"nombre":"vieja.jpg"}'),
  ('boda-fotos','mensajes','M1','{"texto":"felicidades"}'),
  ('boda-fotos','canciones','C1','{"titulo":"una cancion"}'),
  ('boda-video','fotos','V1','{"nombre":"otra-boda.jpg","autorHuella":"huella-de-ana"}');

update events set album_privado = false;

set role invitado_de_prueba;

-- ---------------------------------------------------------------------------
-- ALBUM PUBLICO: absolutamente todo como antes de esta migracion.
-- ---------------------------------------------------------------------------
select comoSi('i.boda-fotos.x', null, 'huella-de-ana');
select case when (select count(*) from items where coleccion='fotos') = 4
       then 'OK  1. publico: el invitado ve las 4 fotos, como siempre'
       else 'FALLA 1. vio ' || (select count(*) from items where coleccion='fotos') end;

select case when (select count(*) from items where coleccion='mensajes') = 1
        and (select count(*) from items where coleccion='canciones') = 1
       then 'OK  2. publico: el muro y la playlist, intactos'
       else 'FALLA 2' end;

-- Sin encabezado de huella tampoco cambia nada mientras sea publico.
select comoSi('i.boda-fotos.x', null, null);
select case when (select count(*) from items where coleccion='fotos') = 4
       then 'OK  3. publico y SIN huella: sigue viendo las 4'
       else 'FALLA 3' end;

reset role;
update events set album_privado = true where codigo = 'boda-fotos';
set role invitado_de_prueba;

-- ---------------------------------------------------------------------------
-- ALBUM PRIVADO: cada quien lo suyo. ESTE es el caso nuevo.
-- ---------------------------------------------------------------------------
select comoSi('i.boda-fotos.x', null, 'huella-de-ana');
select case when (select count(*) from items where coleccion='fotos') = 2
       then 'OK  4. privado: ANA ve solo sus 2 fotos'
       else 'FALLA 4. vio ' || (select count(*) from items where coleccion='fotos') end;

select case when not exists (select 1 from items where id='F3')
       then 'OK  5. privado: la foto de BETO no le llega siquiera'
       else 'FALLA 5. le llego la de Beto' end;

select comoSi('i.boda-fotos.x', null, 'huella-de-beto');
select case when (select count(*) from items where coleccion='fotos') = 1
        and exists (select 1 from items where id='F3')
       then 'OK  6. privado: BETO ve solo la suya'
       else 'FALLA 6' end;

select comoSi('i.boda-fotos.x', null, null);
select case when (select count(*) from items where coleccion='fotos') = 0
       then 'OK  7. privado y sin huella: no ve NINGUNA (lado seguro)'
       else 'FALLA 7' end;

select comoSi('i.boda-fotos.x', null, 'huella-inventada');
select case when (select count(*) from items where coleccion='fotos') = 0
       then 'OK  8. privado: una huella inventada no abre nada'
       else 'FALLA 8' end;

-- ---------------------------------------------------------------------------
-- LO QUE NO PUEDE HABERSE ROTO con el album privado.
-- ---------------------------------------------------------------------------
select comoSi('i.boda-fotos.x', null, null);
select case when (select count(*) from items where coleccion='mensajes') = 1
        and (select count(*) from items where coleccion='canciones') = 1
       then 'OK  9. privado: el muro y la playlist SIGUEN viendose'
       else 'FALLA 9. se rompio la lectura de otras colecciones' end;

select comoSi(null, 'a.boda-fotos.x', null);
select case when (select count(*) from items where coleccion='fotos') = 4
       then 'OK 10. el ANFITRION las ve todas, con album privado y sin huella'
       else 'FALLA 10. vio ' || (select count(*) from items where coleccion='fotos') end;

select comoSi('i.boda-video.x', null, 'huella-de-ana');
select case when (select count(*) from items where evento='boda-fotos') = 0
        and (select count(*) from items where evento='boda-video') = 1
       then 'OK 11. el aislamiento entre bodas sigue intacto'
       else 'FALLA 11' end;

select comoSi(null, null, 'huella-de-ana');
select case when (select count(*) from items) = 0
       then 'OK 12. sin ningun pase no se ve nada, huella o no'
       else 'FALLA 12' end;

reset role;
update events set album_privado = false;
