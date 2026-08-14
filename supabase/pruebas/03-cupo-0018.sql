-- Comprobaciones de la 0018 con datos de verdad. Cada fila dice OK o FALLA.
\set QUIET on
\pset tuples_only on
\pset format unaligned

-- El evento "boda-video" compra el paquete con un override de evento.
insert into event_overrides (event_id, feature_clave, habilitado)
  values ('e0000000-0000-4000-8000-000000000002','video',true);

-- Archivos en el almacen: 3 fotos en boda-fotos, 1 video en boda-video.
insert into storage.objects (bucket_id, name, metadata) values
  ('media','boda-fotos/1-a.jpg', '{"size": 250000}'),
  ('media','boda-fotos/2-b.jpg', '{"size": 250000}'),
  ('media','boda-fotos/3-c.jpg', '{"size": 500000}'),
  ('media','boda-video/1-x.mp4', '{"size": 20000000}'),
  -- Trampa a proposito: MISMO nombre de archivo, OTRO bucket. No debe contar.
  ('otro',  'boda-fotos/9-z.jpg', '{"size": 999999999}');

select
  case when uso_bytes_del_evento('boda-fotos') = 1000000
       then 'OK   1. suma solo los archivos de su carpeta y de su bucket'
       else 'FALLA 1. dio ' || uso_bytes_del_evento('boda-fotos') end;

select
  case when uso_bytes_del_evento('sin-archivos') = 0
       then 'OK   2. un evento sin archivos pesa 0, no null'
       else 'FALLA 2' end;

select
  case when cupo_bytes_del_evento('boda-fotos') = 3221225472
       then 'OK   3. sin paquete de video -> 3 GB'
       else 'FALLA 3. dio ' || cupo_bytes_del_evento('boda-fotos') end;

select
  case when cupo_bytes_del_evento('boda-video') = 16106127360
       then 'OK   4. con paquete de video -> 15 GB'
       else 'FALLA 4. dio ' || cupo_bytes_del_evento('boda-video') end;

select
  case when cupo_bytes_del_evento('demo') = 524288000
       then 'OK   5. la vitrina publica aguanta menos (500 MB)'
       else 'FALLA 5. dio ' || cupo_bytes_del_evento('demo') end;

select
  case when cupo_bytes_del_evento('no-existe') = 0 and cabe_en_el_evento('no-existe', 1) = false
       then 'OK   6. evento desconocido: cupo 0 y NO cabe (falla cerrado)'
       else 'FALLA 6' end;

select
  case when cabe_en_el_evento('', 1) = false and cabe_en_el_evento(null, 1) = false
       then 'OK   7. codigo vacio o nulo tampoco cabe'
       else 'FALLA 7' end;

-- El borde exacto: justo lo que falta para llenarlo, y un byte mas.
select
  case when cabe_en_el_evento('boda-fotos', 3221225472 - 1000000) = true
        and cabe_en_el_evento('boda-fotos', 3221225472 - 1000000 + 1) = false
       then 'OK   8. corta EXACTAMENTE en el cupo, ni antes ni despues'
       else 'FALLA 8' end;

select
  case when cabe_en_el_evento('boda-fotos', null) = true and cabe_en_el_evento('boda-fotos', -5) = true
       then 'OK   9. un tamano ausente o absurdo no rompe la cuenta'
       else 'FALLA 9' end;

-- Cupo a medida: manda sobre el del plan, incluso para bajarlo.
insert into evento_cupo (event_id, bytes, nota)
  values ('e0000000-0000-4000-8000-000000000001', 1500000, 'prueba');
select
  case when cupo_bytes_del_evento('boda-fotos') = 1500000
        and cabe_en_el_evento('boda-fotos', 400000) = true
        and cabe_en_el_evento('boda-fotos', 600000) = false
       then 'OK  10. el cupo a medida manda sobre el del plan'
       else 'FALLA 10. dio ' || cupo_bytes_del_evento('boda-fotos') end;

-- Lo importante de medir del almacen: al borrar, la cuenta BAJA sola.
delete from storage.objects where name = 'boda-fotos/3-c.jpg';
select
  case when uso_bytes_del_evento('boda-fotos') = 500000
       then 'OK  11. al borrar una foto, el espacio se libera solo'
       else 'FALLA 11. dio ' || uso_bytes_del_evento('boda-fotos') end;

select
  case when (espacio_del_evento('boda-fotos')->>'usado')::bigint = 500000
        and (espacio_del_evento('boda-fotos')->>'cupo')::bigint = 1500000
       then 'OK  12. el contador para el anfitrion dice usado y cupo'
       else 'FALLA 12. dio ' || espacio_del_evento('boda-fotos')::text end;

-- Un archivo sin metadata no puede envenenar la suma entera.
insert into storage.objects (bucket_id, name, metadata) values ('media','boda-fotos/4-raro.jpg', '{}');
select
  case when uso_bytes_del_evento('boda-fotos') = 500000
       then 'OK  13. un archivo sin tamano no rompe la cuenta'
       else 'FALLA 13. dio ' || coalesce(uso_bytes_del_evento('boda-fotos')::text,'null') end;
