-- ============================================================================
-- Comprobaciones de la 0021 (cerrar el album).
--
-- ⚠️ CADA COMPROBACION VA EN SU PROPIA SENTENCIA, y no es capricho. La primera
-- version metia `cerrar_album(...)` y `album_esta_cerrado(...)` en el MISMO
-- select, y fallaba: `album_esta_cerrado` esta declarada `stable`, asi que
-- dentro de una sentencia ve la foto de la base ANTERIOR al cambio. La
-- migracion estaba bien; la prueba no.
--
-- Antes hace falta un doble de `evento_del_pase_anfitrion` (en la base real la
-- crea la 0009). Un pase de anfitrion de mentira empieza por "a.":
--
--   create or replace function evento_del_pase_anfitrion(p_pase text)
--   returns text language sql immutable as $$
--     select case when p_pase like 'a.%' then split_part(p_pase,'.',2) else null end
--   $$;
--
-- Se corre despues de: 02-banco-plano-de-control.sql, el doble de arriba y 0021.
-- ============================================================================
\set QUIET on
\pset tuples_only on
\pset format unaligned

update events set album_cerrado = false;

select case when album_esta_cerrado('boda-fotos') = false
       then 'OK  1. un album nace ABIERTO' else 'FALLA 1' end;

-- Un evento inventado responde "abierto", no "cerrado": equivocarse hacia el
-- lado cerrado dejaria a una boda sin subir fotos en plena fiesta.
select case when album_esta_cerrado('no-existe') = false
       then 'OK  2. evento desconocido -> abierto (no bloquea de mas)' else 'FALLA 2' end;

-- El pase de INVITADO lo tiene cualquiera con el QR: si sirviera para cerrar,
-- un invitado podria dejar sin subir al resto de la boda.
select case when cerrar_album('boda-fotos.123.firma', true) = false
       then 'OK  3. un pase de invitado NO puede cerrar' else 'FALLA 3' end;
select case when album_esta_cerrado('boda-fotos') = false
       then 'OK  4. ...y el album siguio abierto' else 'FALLA 4' end;

select case when cerrar_album('a.boda-fotos.123', true) = true
       then 'OK  5. con el pase de ANFITRION si cierra' else 'FALLA 5' end;
select case when album_esta_cerrado('boda-fotos') = true
       then 'OK  6. ...y quedo cerrado' else 'FALLA 6' end;

select case when album_esta_cerrado('boda-video') = false
       then 'OK  7. cerrar una boda no toca a las demas' else 'FALLA 7' end;

select case when cerrar_album('a.boda-fotos.123', false) = true
       then 'OK  8. se puede volver a abrir' else 'FALLA 8' end;
select case when album_esta_cerrado('boda-fotos') = false
       then 'OK  9. ...y quedo abierto otra vez' else 'FALLA 9' end;

select case when cerrar_album(null, true) = false and cerrar_album('', true) = false
        and cerrar_album('a.boda-fotos.123', null) = false
       then 'OK 10. pase vacio, nulo o sin decir que hacer: no hace nada' else 'FALLA 10' end;

-- Un pase de anfitrion de OTRA boda no puede cerrar esta.
select case when cerrar_album('a.boda-video.999', true) = true
       then 'OK 11. el pase de otra boda cierra LA SUYA...' else 'FALLA 11' end;
select case when album_esta_cerrado('boda-fotos') = false and album_esta_cerrado('boda-video') = true
       then 'OK 12. ...y solo la suya' else 'FALLA 12' end;

update events set album_cerrado = false;
