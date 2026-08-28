-- ============================================================================
-- 0029 — LA CUENTA DE MUESTRA: el panel del salón, tocable sin miedo (27 ago)
--
-- La demo del invitado ya se vende sola (la vitrina por visitante), pero la
-- MITAD DEL VENDEDOR —crear eventos, encender experiencias una por una,
-- vestir una boda con su marca— vivía tras el login del staff y ningún salón
-- prospecto podía tocarla. Decisión de Fernando: cuenta de muestra.
--
-- EL DISEÑO ES UNA CAJA DE ARENA, no un permiso especial:
--
--   · Nace un SEGUNDO salón ("Salón de Muestra") con su propia boda semilla.
--   · La cuenta de muestra es DUEÑA de ese salón — puede tocarlo TODO ahí:
--     marca, experiencias, invitados, eventos nuevos. Eso ES la venta.
--   · El aislamiento por salón de la 0008 (app_tenant_id() en cada política)
--     la encierra: no puede ver ni rayar la demo real de Hacienda Santa
--     Renata, ni a ningún salón futuro. No hay reglas nuevas que mantener.
--
-- LAS CREDENCIALES SON PÚBLICAS A PROPÓSITO (se enseñan en el catálogo):
--     correo      muestra@suite-salones.app
--     contraseña  salon-de-muestra
--
-- RE-CORRERLA ES EL BOTÓN DE RESET: los upserts devuelven la marca, la boda
-- semilla, la contraseña y los claims a su estado original. Lo que los
-- visitantes hayan creado de más (otros eventos, invitados) se queda hasta
-- una limpieza a mano — vandalismo acotado a la caja de arena.
--
-- ⚠️ Escribe en el esquema `auth` (usuario + identidad) con el patrón
-- estándar de siembra de GoTrue. Si Supabase cambia ese esquema algún día,
-- esta es la migración que hay que revisar.
-- ============================================================================

-- 1) El salón de muestra, con el plan gestionado (para que las experiencias
--    del plan se vean encendidas, igual que las vería un cliente real).
insert into tenants (id, slug, nombre, ciudad, plan_id, estado) values
  ('aa000000-0000-4000-8000-000000000001',
   'salon-de-muestra', 'Salón de Muestra', 'Culiacán', 'gestionado', 'activo')
on conflict (id) do update set
  nombre = excluded.nombre, plan_id = excluded.plan_id, estado = excluded.estado;

-- 2) Su marca arranca CASI EN BLANCO a propósito: que el visitante la vista
--    él mismo desde el editor — ese momento es el que vende. Solo el nombre.
insert into tenant_branding (tenant_id, nombre)
values ('aa000000-0000-4000-8000-000000000001', 'Salón de Muestra')
on conflict (tenant_id) do update set
  nombre = excluded.nombre,
  logo_url = null, primario = null, primario_texto = null, acento = null,
  radio = null, sitio_url = null, fuentes = null, fondo = null, tinta = null,
  esquema = null, actualizado = now();

-- 3) La boda semilla, con fecha futura para que la cuenta regresiva viva.
--    La clave de anfitrión la genera el default de la 0009.
insert into events (id, tenant_id, codigo, nombre, tipo, fecha, estado) values
  ('ae000000-0000-4000-8000-000000000001',
   'aa000000-0000-4000-8000-000000000001',
   'boda-de-muestra', 'Boda Carmen & Luis', 'boda', '2027-11-20', 'activo')
on conflict (codigo) do update set
  nombre = excluded.nombre, tipo = excluded.tipo,
  fecha = excluded.fecha, estado = excluded.estado;

-- 4) El usuario de la cuenta de muestra (GoTrue). Los claims van en
--    raw_app_meta_data: es lo que auth.jwt()->'app_metadata' entrega a la RLS
--    (app_tenant_id / app_rol, convención de la 0008). Re-correr restablece
--    la contraseña y los claims.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data,
   confirmation_token, recovery_token, email_change_token_new, email_change,
   created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000',
   'a0000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated',
   'muestra@suite-salones.app',
   crypt('salon-de-muestra', gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"],"tenant_id":"aa000000-0000-4000-8000-000000000001","rol":"owner"}'::jsonb,
   '{}'::jsonb,
   '', '', '', '',
   now(), now())
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password,
  raw_app_meta_data  = excluded.raw_app_meta_data,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  updated_at         = now();

-- 5) Su identidad de correo (sin esta fila, GoTrue no deja iniciar sesión).
insert into auth.identities
  (id, user_id, identity_data, provider, provider_id, last_sign_in_at,
   created_at, updated_at)
values
  (gen_random_uuid(),
   'a0000000-0000-4000-8000-000000000001',
   '{"sub":"a0000000-0000-4000-8000-000000000001","email":"muestra@suite-salones.app","email_verified":true}'::jsonb,
   'email',
   'a0000000-0000-4000-8000-000000000001',
   now(), now(), now())
on conflict (provider_id, provider) do nothing;

-- 6) La membresía: dueña de SU salón (y de ningún otro).
insert into tenant_members (tenant_id, user_id, rol) values
  ('aa000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001',
   'owner')
on conflict (tenant_id, user_id) do update set rol = excluded.rol;
