-- ============================================================================
-- 0033 — LOS DATOS LEGALES SON DE CADA SALÓN, NO DEL CÓDIGO (29 ago)
--
-- EL PROBLEMA QUE CIERRA: hasta hoy el aviso de privacidad publicado nombraba
-- como responsable del tratamiento al salón de DEMOSTRACIÓN ("Hacienda Santa
-- Renata") y daba el correo y el DOMICILIO PARTICULAR de Fernando para ejercer
-- los derechos ARCO — porque los datos vivían quemados en una constante de
-- `apps/catalogo/src/lib/legal.ts`. Con un cliente real, sus invitados leerían
-- que sus datos los responde otro salón, y Fernando cargaría con una
-- responsabilidad legal que por diseño es DEL SALÓN.
--
-- EL REPARTO QUE SOSTIENE TODO (LFPDPPP, y es el mismo de @salones/legal):
--   · el SALÓN es el RESPONSABLE  → por eso razón social, domicilio y correo
--     ARCO viven aquí, una fila por salón, y las escribe el salón.
--   · el proveedor es el ENCARGADO → por eso su nombre y su sitio NO son
--     columnas de esta tabla: salen del código, iguales para todos. Así un
--     salón no puede ponerse como proveedor ni borrarse la cláusula de encargo.
--
-- POR QUÉ NO HAY LECTURA PÚBLICA, a diferencia de `tenant_branding` (0007):
--   un logo es público, pero un domicilio fiscal y un correo ARCO abiertos con
--   la llave publishable serían la libreta de direcciones de todos los clientes
--   —y delatarían qué salones están sin cumplir—. El invitado los recibe ya
--   resueltos por `evento-config`, que usa service-role. Mismo patrón que
--   `event_branding` en la 0025.
--
-- RE-CORRERLA ES EL BOTÓN DE RESET de las dos semillas (como la 0029).
-- ============================================================================

create table if not exists tenant_legal (
  tenant_id           uuid primary key references tenants(id) on delete cascade,
  razon_social        text,        -- el nombre LEGAL (puede diferir del comercial)
  domicilio           text,        -- lo exige el art. 16 fr. I LFPDPPP
  contacto            text,        -- el correo donde el salón atiende los ARCO
  telefono            text,        -- opcional
  dias_conservacion   int,         -- cuántos días se guarda el material tras el evento
  publicado           boolean not null default false,
  acepto_borrador_en  timestamptz, -- cuándo el responsable asumió publicar un borrador
  acepto_borrador_por uuid,        -- y con qué usuario
  actualizado         timestamptz not null default now(),
  actualizado_por     uuid
);

-- ----------------------------------------------------------------------------
-- EL CANDADO, Y VA EN LA BASE A PROPÓSITO.
--
-- La lección más cara de este repo (la 0016, el candado de sobrescritura) es
-- que una regla que no está en Postgres NO ESTÁ: PostgREST es público y una
-- sesión de staff puede escribir esta fila a mano. Un `if` de React no impide
-- publicar un aviso que la ley no admite; este CHECK sí.
--
-- Prohíbe declarar PUBLICADO un aviso sin responsable identificable: sin razón
-- social, sin domicilio, sin un correo con forma de correo, o sin la constancia
-- de que alguien asumió publicar un borrador. Y bloquea la cadena literal
-- 'PENDIENTE', que ya se coló una vez hasta producción.
--
-- `not valid` es el patrón de `tenant_branding_esquema_valido` (0025): la
-- restricción es inmediata y no re-verifica la tabla (que nace vacía).
-- ----------------------------------------------------------------------------
-- ⚠️ `btrim(x)` a secas quita SOLO el carácter espacio: con un TABULADOR el
-- candado se burlaba y la fila quedaba publicada con la razón social en blanco.
-- Por eso se le pasa el juego completo de blancos. Y se compara en MAYÚSCULAS,
-- porque 'pendiente' en minúscula también es la marca interna.
alter table tenant_legal drop constraint if exists tl_publicado_completo;
alter table tenant_legal add constraint tl_publicado_completo check (
  not publicado or (
    upper(coalesce(btrim(razon_social, E' \t\r\n'), '')) not in ('', 'PENDIENTE')
    and upper(coalesce(btrim(domicilio, E' \t\r\n'), '')) not in ('', 'PENDIENTE')
    and btrim(coalesce(contacto, ''), E' \t\r\n') ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
    and acepto_borrador_en is not null
  )
) not valid;

alter table tenant_legal drop constraint if exists tl_conservacion_razonable;
alter table tenant_legal add constraint tl_conservacion_razonable
  check (dias_conservacion is null or dias_conservacion between 1 and 3650) not valid;

-- ----------------------------------------------------------------------------
-- RLS: el salón sale del TOKEN (convención de la 0008, evita recursión).
-- ----------------------------------------------------------------------------
alter table tenant_legal enable row level security;

drop policy if exists tl_sel_staff on tenant_legal;
create policy tl_sel_staff on tenant_legal for select to authenticated
  using (tenant_id = public.app_tenant_id());

-- UNA sola política `for all` con el MISMO predicado en `using` y `with check`:
-- es el patrón de `eb_wr_admin` (0025) y `ov_wr_admin` (0008), y la 0025 dejó
-- escrito por qué — cuatro copias del predicado divergen en silencio y la RLS
-- falla como 401 en producción, que es indiagnosticable.
drop policy if exists tl_wr_admin on tenant_legal;
create policy tl_wr_admin on tenant_legal for all to authenticated
  using (
    tenant_id = public.app_tenant_id()
    and public.app_rol() in ('owner', 'admin')
  )
  with check (
    tenant_id = public.app_tenant_id()
    and public.app_rol() in ('owner', 'admin')
  );

-- ⚠️ NO BASTA CON "no conceder": HAY QUE REVOCAR.
--
-- Este proyecto tiene activos los privilegios por defecto de Supabase
-- (`alter default privileges ... grant all on tables to anon, authenticated`),
-- así que una tabla nueva nace CON permisos aunque ninguna migración se los dé.
-- Se comprobó midiendo: con la llave publishable, `event_branding`, `clients`,
-- `actividad` y `tenants` contestan 200 con lista vacía — o sea que tienen el
-- privilegio y quien las frena es la RLS, no el grant. Si fuera al revés
-- dirían "permission denied".
--
-- Consecuencia para esta tabla: como `tl_wr_admin` es `for all` (que incluye
-- DELETE), un owner o admin podría BORRAR su propia fila legal y con ella la
-- constancia de `acepto_borrador_en` — justo la evidencia que protege al
-- proveedor. Por eso se revoca primero y se concede después, que es el patrón
-- que este repo ya aprendió para las FUNCIONES en la 0023 y nunca había
-- trasladado a las TABLAS.
revoke all on tenant_legal from anon, authenticated;
grant select, insert, update on tenant_legal to authenticated;

-- ----------------------------------------------------------------------------
-- SEMILLAS — las dos del escaparate. NI UN SOLO DATO REAL DE NADIE.
-- ----------------------------------------------------------------------------

-- 1) El salón DEMO (0002): datos de ficción, coherentes con el salón inventado.
--    El correo es el mismo ficticio que ya usa packages/legal/src/legal.test.ts.
--    Va PUBLICADO para que la vitrina enseñe un aviso completo, que es lo que
--    se vende.
insert into tenant_legal
  (tenant_id, razon_social, domicilio, contacto, telefono,
   dias_conservacion, publicado, acepto_borrador_en)
values
  ('d0000000-0000-4000-8000-000000000001',
   'Hacienda Santa Renata S.A. de C.V.',
   'Camino a la Vieja Hacienda km 4.5, Villa de Álvarez, Colima, C.P. 28970',
   'privacidad@santarenata.mx',
   '+52 312 000 0000',
   90, true, now())
on conflict (tenant_id) do update set
  razon_social       = excluded.razon_social,
  domicilio          = excluded.domicilio,
  contacto           = excluded.contacto,
  telefono           = excluded.telefono,
  dias_conservacion  = excluded.dias_conservacion,
  publicado          = excluded.publicado,
  acepto_borrador_en = excluded.acepto_borrador_en,
  actualizado        = now();

-- 2) El SALÓN DE MUESTRA (0029): TODO EN NULL y sin publicar, A PROPÓSITO.
--    Quien entra a la caja de arena ve la pantalla vacía y el candado
--    funcionando, exactamente como los verá un cliente nuevo. Ese momento es
--    parte de la venta.
insert into tenant_legal (tenant_id, publicado)
values ('aa000000-0000-4000-8000-000000000001', false)
on conflict (tenant_id) do update set
  razon_social       = null,
  domicilio          = null,
  contacto           = null,
  telefono           = null,
  dias_conservacion  = null,
  publicado          = false,
  acepto_borrador_en = null,
  acepto_borrador_por = null,
  actualizado        = now();

-- ============================================================================
-- ROLLBACK (comentado, como la 0008):
--   drop policy if exists tl_wr_admin  on tenant_legal;
--   drop policy if exists tl_sel_staff on tenant_legal;
--   drop table if exists tenant_legal;
-- ============================================================================
