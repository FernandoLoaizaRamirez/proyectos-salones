-- ============================================================================
-- 0011 — CUPOS por invitación
-- ============================================================================
-- La tabla `guests` (migración 0002) guarda a los invitados de un evento, pero
-- le faltaba el dato con el que se trabaja de verdad al armar una boda: cuántas
-- personas cubre CADA invitación ("Familia Loaiza — hasta 4"). Sin él, la
-- confirmación no puede topar cuánta gente puede apuntar el invitado.
--
-- Hasta ahora ese dato vivía en el navegador del anfitrión (localStorage de la
-- app `rsvp`), o sea: se perdía al cambiar de dispositivo y era el mismo para
-- todos sus eventos. Al mudar el tablero al panel del salón, los invitados pasan
-- a la base —donde la RLS por salón (0008) los protege— y `cupos` con ellos.
--
-- ADITIVA y reversible: solo agrega una columna con valor por defecto. No toca
-- políticas, ni datos, ni el candado por evento. Se puede aplicar en cualquier
-- momento, incluso con un evento en curso.
-- ============================================================================

alter table guests add column if not exists cupos int not null default 1;

comment on column guests.cupos is
  'Cuántas personas cubre esta invitación (la familia entera, la pareja, etc.).';

-- Nadie debería poder invitar a -3 personas.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'guests_cupos_positivos'
  ) then
    alter table guests add constraint guests_cupos_positivos check (cupos >= 1);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- ROLLBACK (si hiciera falta deshacerla):
--   alter table guests drop constraint if exists guests_cupos_positivos;
--   alter table guests drop column if exists cupos;
-- ----------------------------------------------------------------------------
