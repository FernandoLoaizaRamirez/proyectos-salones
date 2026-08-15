-- ============================================================================
-- Comprobaciones de la 0019 (cupos del plan gratis + TECHO GLOBAL).
--
-- Lo que de verdad hay que probar aqui es lo que la 0018 no tenia: que el
-- almacen entero tenga un techo. Con varias bodas dentro, ninguna se pasa de lo
-- suyo y aun asi Supabase revienta — ese es el caso 5, y es el motivo de existir
-- de esta migracion.
--
-- Se corre despues de: 02-banco-plano-de-control.sql, 0017, 0018 y 0019.
-- Cada linea dice OK o FALLA.
-- ============================================================================
\set QUIET on
\pset tuples_only on
\pset format unaligned

-- Tabla del diagnostico (0012), que la 0019 usa para el aviso temprano.
create table if not exists app_errores (
  id bigserial primary key,
  creado timestamptz not null default now(),
  app text not null, evento text, tipo text not null,
  mensaje text, ruta text, navegador text, repeticiones int not null default 1
);

delete from storage.objects;
delete from evento_cupo;
delete from app_errores;
delete from event_overrides;

-- "boda-video" compra el paquete.
insert into event_overrides (event_id, feature_clave, habilitado)
  values ('e0000000-0000-4000-8000-000000000002','video',true);

select case when cupo_bytes_del_evento('boda-fotos') = 262144000
       then 'OK   1. sin video -> 250 MB (no 3 GB: el proyecto entero es 1 GB)'
       else 'FALLA 1. dio ' || cupo_bytes_del_evento('boda-fotos') end;

select case when cupo_bytes_del_evento('boda-video') = 419430400
       then 'OK   2. con video -> 400 MB'
       else 'FALLA 2. dio ' || cupo_bytes_del_evento('boda-video') end;

select case when cupo_bytes_del_evento('demo') = 157286400
       then 'OK   3. la vitrina publica -> 150 MB'
       else 'FALLA 3. dio ' || cupo_bytes_del_evento('demo') end;

select case when tope_bytes_global() = 943718400
       then 'OK   4. techo global -> 900 MB (margen sobre el 1 GB de Supabase)'
       else 'FALLA 4. dio ' || tope_bytes_global() end;

-- ---------------------------------------------------------------------------
-- EL CASO QUE JUSTIFICA ESTA MIGRACION: tres bodas educadas llenan el almacen.
-- Ninguna se pasa de sus 250 MB, y entre las tres se comen el techo.
-- ---------------------------------------------------------------------------
insert into storage.objects (bucket_id, name, metadata) values
  ('media','boda-fotos/a.jpg',  '{"size": 240000000}'),   -- 240 MB
  ('media','boda-video/b.jpg',  '{"size": 240000000}'),   -- 240 MB
  ('media','demo/c.jpg',        '{"size": 140000000}');   -- 140 MB
                                                          -- total: 620 MB

select case when cabe_en_el_evento('boda-fotos', 5000000) = true
       then 'OK   5. con 620 MB usados todavia cabe una foto mas'
       else 'FALLA 5' end;

-- Una cuarta boda pide 350 MB: le sobra cupo propio (250 MB no, pero pongamosle
-- uno a medida) y aun asi NO cabe, porque el almacen no da mas de si.
insert into evento_cupo (event_id, bytes, nota)
  values ('e0000000-0000-4000-8000-000000000001', 900000000, 'cupo generoso a proposito');
select case when cupo_bytes_del_evento('boda-fotos') = 900000000
        and cabe_en_el_evento('boda-fotos', 350000000) = false
       then 'OK   6. EL TECHO GLOBAL MANDA: le sobra cupo propio y aun asi no cabe'
       else 'FALLA 6. cupo=' || cupo_bytes_del_evento('boda-fotos') ||
            ' cabe=' || cabe_en_el_evento('boda-fotos', 350000000)::text end;
delete from evento_cupo;

-- Su cupo son 250 MB = 262.144.000 bytes, y lleva 240.000.000. Le caben 22 M
-- justos: 20 M pasan, 30 M no. Se prueban los dos lados del borde, porque un
-- cupo que frena de mas es tan malo como uno que no frena.
select case when cabe_en_el_evento('boda-fotos', 20000000) = true
        and cabe_en_el_evento('boda-fotos', 30000000) = false
       then 'OK   7. y su propio cupo (250 MB) frena justo donde toca'
       else 'FALLA 7. 20M=' || cabe_en_el_evento('boda-fotos', 20000000)::text ||
            ' 30M=' || cabe_en_el_evento('boda-fotos', 30000000)::text end;

-- ---------------------------------------------------------------------------
-- El aviso temprano.
-- ---------------------------------------------------------------------------
select case when (select count(*) from app_errores where tipo='almacen-casi-lleno') = 0
       then 'OK   8. al 65% todavia no avisa (seria ruido)'
       else 'FALLA 8' end;

-- Se sube al 85% del techo: 802 MB de 900.
insert into storage.objects (bucket_id, name, metadata) values ('media','boda-fotos/d.jpg','{"size": 182000000}');
select avisar_si_almacen_lleno();
select case when (select count(*) from app_errores where tipo='almacen-casi-lleno') = 1
       then 'OK   9. pasado el 80% deja aviso en el diagnostico'
       else 'FALLA 9. hay ' || (select count(*) from app_errores) || ' avisos' end;

select avisar_si_almacen_lleno();
select avisar_si_almacen_lleno();
select case when (select count(*) from app_errores where tipo='almacen-casi-lleno') = 1
       then 'OK  10. no repite el aviso cada subida (uno por hora basta)'
       else 'FALLA 10. hay ' || (select count(*) from app_errores) || ' avisos' end;

select case when (select mensaje from app_errores limit 1) like '%85%'
       then 'OK  11. el aviso dice el porcentaje real'
       else 'FALLA 11. decia: ' || (select mensaje from app_errores limit 1) end;

-- ---------------------------------------------------------------------------
-- Lo de la 0018 que NO se puede haber roto por el camino.
-- ---------------------------------------------------------------------------
select case when cupo_bytes_del_evento('no-existe') = 0
        and cabe_en_el_evento('no-existe', 1) = false
       then 'OK  12. evento inexistente sigue fallando CERRADO'
       else 'FALLA 12' end;

select case when (espacio_del_evento('boda-fotos')->>'usado')::bigint = 422000000
        and (espacio_del_evento('boda-fotos')->>'cupo')::bigint = 262144000
        and (espacio_del_evento('boda-fotos')->>'usadoTotal')::bigint = 802000000
       then 'OK  13. el contador sigue dando usado y cupo, y ahora el total'
       else 'FALLA 13. dio ' || espacio_del_evento('boda-fotos')::text end;

delete from storage.objects;
select case when uso_bytes_total() = 0 and cabe_en_el_evento('boda-fotos', 1000) = true
       then 'OK  14. al vaciar el almacen se vuelve a poder subir'
       else 'FALLA 14' end;
