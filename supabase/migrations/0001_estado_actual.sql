-- ============================================================================
-- 0001 · ESTADO ACTUAL (foto de lo que YA existe en producción)
-- ----------------------------------------------------------------------------
-- Esta migración NO cambia nada nuevo: reproduce, tal cual, lo que hoy está en
-- vivo en el proyecto Supabase (tabla `items`, candado por encabezado `x-evento`
-- de la Fase 5, y el bucket `media`). Sirve para dos cosas:
--   1) Dejar el esquema real bajo control de versiones (hasta ahora solo vivía
--      dentro de la documentación).
--   2) Poder recrear el backend desde cero en un proyecto nuevo.
--
-- Es IDEMPOTENTE: se puede correr varias veces sin error (usa "if not exists" y
-- "drop ... if exists"). En el proyecto que YA está en vivo no hace falta
-- correrla; en uno nuevo, reconstruye el punto de partida.
-- ============================================================================

-- La tabla única donde vive el contenido colectivo de todas las apps/eventos.
create table if not exists items (
  evento     text not null,                 -- "demo", "boda-garcia-x7k2", …
  coleccion  text not null,                 -- "mensajes","canciones","respuestas","ranking","fotos"
  id         text primary key,              -- id del item (aleatorio, único global)
  dato       jsonb not null default '{}',   -- el contenido libre del item
  creado     timestamptz not null default now()
);

create index if not exists items_evento_coleccion_creado
  on items (evento, coleccion, creado desc);

-- Candado de tamaño: ningún registro puede pasar de ~600 KB.
alter table items drop constraint if exists dato_tamano_max;
alter table items add constraint dato_tamano_max check (pg_column_size(dato) < 600000);

-- --------------------------------------------------------------------------
-- Fase 5: la llave del evento se EXIGE en cada petición (encabezado x-evento,
-- que @salones/sync manda solo). Sin la llave de un evento no se puede leer,
-- escribir ni borrar nada, ni siquiera con la llave pública del proyecto.
-- --------------------------------------------------------------------------
alter table items enable row level security;

drop policy if exists "lectura por evento" on items;
create policy "lectura por evento" on items for select
  using (evento = current_setting('request.headers', true)::json->>'x-evento');

drop policy if exists "escritura por evento" on items;
create policy "escritura por evento" on items for insert
  with check (evento = current_setting('request.headers', true)::json->>'x-evento');

drop policy if exists "actualizacion por evento" on items;
create policy "actualizacion por evento" on items for update
  using (evento = current_setting('request.headers', true)::json->>'x-evento')
  with check (evento = current_setting('request.headers', true)::json->>'x-evento');

drop policy if exists "borrado por evento" on items;
create policy "borrado por evento" on items for delete
  using (evento = current_setting('request.headers', true)::json->>'x-evento');

-- --------------------------------------------------------------------------
-- Almacén de fotos/videos: bucket "media" público (se VE por URL, NO se lista).
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

update storage.buckets
  set file_size_limit = 26214400,             -- 25 MB
      allowed_mime_types = array['image/*','video/*']
  where id = 'media';

drop policy if exists "subida publica media" on storage.objects;
create policy "subida publica media" on storage.objects for insert
  with check (bucket_id = 'media');
