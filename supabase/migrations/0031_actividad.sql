-- ============================================================================
-- 0031 — EL PRIMER REGISTRO DE ACTIVIDAD (Etapa 3, pieza 3 — 27 ago 2026)
--
-- Lo que pedía la sección 17 del Prompt Maestro, en su versión mínima y con
-- la línea de privacidad de la casa (la misma de la 0012): se cuenta CUÁNTAS
-- veces pasó algo, JAMÁS quién lo hizo. Ni nombre, ni id de invitado, ni
-- dirección, ni user-agent. Una fila por evento + tipo + día, con un contador.
--
-- Qué se cuenta (allowlist, doble candado: constraint + función):
--   'portal'      — se abrió la portada del evento
--   'invitacion'  — se abrió la invitación
--   'rsvp'        — alguien envió su confirmación
--   'pase'        — un invitado vio su pase
--
-- CÓMO SE ESCRIBE: solo por la función `apuntar_actividad` (SECURITY DEFINER,
-- ejecutable por la llave pública). Valida el tipo contra la allowlist y que
-- el evento EXISTA y esté activo — las vitrinas demo-xxxxxx no existen en
-- `events`, así que el tráfico de la demo pública no ensucia los números.
-- No hay INSERT/UPDATE directo para nadie: la tabla no da esos grants.
--
-- CÓMO SE LEE: el staff del salón dueño, por la RLS (el mismo join a events
-- por tenant de guests/0008). El invitado no puede leer los números de nadie.
--
-- ABUSO, dicho honesto: quien quiera inflar un contador a mano, puede (la
-- función es pública a propósito, como emitir_pase). El daño posible es un
-- número presumido de más — nunca datos de nadie, y una fila por día lo acota.
-- Si un día importa, el freno se agrega aquí sin tocar a los que llaman.
-- ============================================================================

create table if not exists actividad (
  evento      text not null,
  tipo        text not null check (tipo in ('portal', 'invitacion', 'rsvp', 'pase')),
  dia         date not null default current_date,
  contador    integer not null default 0,
  actualizado timestamptz not null default now(),
  primary key (evento, tipo, dia)
);

alter table actividad enable row level security;

-- Lectura: el staff del salón dueño del evento (mismo doble candado de guests).
drop policy if exists actividad_sel_staff on actividad;
create policy actividad_sel_staff on actividad for select to authenticated
  using (
    exists (
      select 1 from events e
      where e.codigo = actividad.evento
        and e.tenant_id = public.app_tenant_id()
    )
  );

grant select on actividad to authenticated;
-- Sin grants de escritura: escribir es EXCLUSIVO de la función de abajo.

create or replace function public.apuntar_actividad(p_evento text, p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- La allowlist otra vez (el check de la tabla es la red; esto, la puerta).
  if p_tipo is null or p_tipo not in ('portal', 'invitacion', 'rsvp', 'pase') then
    return;
  end if;
  -- Mismo formato de código que toda la suite.
  if p_evento is null or p_evento !~ '^[a-z0-9-]{1,60}$' then
    return;
  end if;
  -- Solo eventos REALES y activos: las vitrinas y los códigos inventados no
  -- existen en `events` y se ignoran en silencio (la función nunca truena:
  -- un contador jamás puede tumbar la pantalla de un invitado).
  if not exists (select 1 from events e where e.codigo = p_evento and e.estado = 'activo') then
    return;
  end if;

  insert into actividad (evento, tipo, dia, contador)
  values (p_evento, p_tipo, current_date, 1)
  on conflict (evento, tipo, dia)
  do update set contador = actividad.contador + 1, actualizado = now();
end;
$$;

grant execute on function public.apuntar_actividad(text, text) to anon, authenticated;
