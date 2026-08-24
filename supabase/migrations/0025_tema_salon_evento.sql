-- ============================================================================
-- 0025 · TEMA POR SALÓN Y POR EVENTO (rediseño del ecosistema — Fase 1, ADITIVA)
-- ----------------------------------------------------------------------------
-- Dos cosas, ninguna rompe nada de lo que ya corre:
--
--   1. `tenant_branding` (0007) aprende lo que le faltaba para que el portal
--      deje de necesitar variables de entorno y fuentes fijas:
--        · sitio_url — la web del salón, para volver a ella desde el portal
--          (hoy sale de NEXT_PUBLIC_SITIO_SALON_URL, que solo sirve con UN
--          cliente; ver docs/PENDIENTES-EN-VERCEL.md).
--        · fuentes  — CLAVE de la pareja tipográfica ("clasica", "editorial"…).
--          Es una clave de la lista curada de @salones/ui, NUNCA una URL: una
--          clave desconocida cae a "sistema" y jamás se interpola en un <link>.
--        · fondo / tinta — las DOS perillas de superficie del tema claro; de
--          ellas @salones/ui deriva tarjetas, bordes y el modo oscuro entero.
--        · esquema — con qué modo arranca la experiencia del invitado.
--      Y gana POLÍTICA DE ESCRITURA para owner/admin: el editor del panel por
--      fin podrá guardar (hasta hoy, escritura = solo service-role).
--
--   2. Nace `event_branding`: la personalización de UN evento (color, portada,
--      monograma, frase) que pisa a la del salón. A DIFERENCIA de
--      `tenant_branding`, NO tiene lectura pública: el único lector del lado
--      del invitado es la Edge Function `evento-config` (service-role), y por
--      PostgREST solo la ve el staff de su propio salón. Así nadie puede
--      volcar las frases y portadas de bodas ajenas sin conocer el código.
--
-- Las políticas usan `public.app_tenant_id()` / `public.app_rol()` (0008): el
-- tenant se lee del TOKEN, no de una subconsulta a tenant_members — esa es la
-- convención de TODA la RLS del plano de control, y evita recursión de RLS.
--
-- `portada_ref` guarda una URL http(s) externa (como las fotos del sitio
-- demo) O una REFERENCIA dentro del almacén (patrón del corte 3, 0013: el
-- bucket es privado y una URL a pelo da 400). CONTRATO DE HOY: `evento-config`
-- solo reenvía las URL http(s); una referencia interna se OMITE de la
-- respuesta (sin resolver, sin error) hasta que la Fase 5 estrene el panel y
-- conecte la firma con `resolverMedios` — quien vea "guardé portada y no
-- sale", que empiece por aquí. Jamás guardar una URL YA firmada: caduca.
--
-- LA SEMILLA DEL SALÓN DEMO NO VA AQUÍ: va en la 0026, que se corre junto con
-- la Fase 2 (el portal nuevo), para que el cambio de identidad llegue COMPLETO
-- y no a medias.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) tenant_branding: columnas nuevas (aditivas, nadie las lee todavía).
-- ----------------------------------------------------------------------------
alter table tenant_branding add column if not exists sitio_url text;
alter table tenant_branding add column if not exists fuentes   text;
alter table tenant_branding add column if not exists fondo     text;
alter table tenant_branding add column if not exists tinta     text;
alter table tenant_branding add column if not exists esquema   text;

-- El esquema solo puede ser claro u oscuro (o nulo = claro). Con `not valid`
-- no se re-verifica la tabla existente (todo nulo hoy) y el check es inmediato.
alter table tenant_branding drop constraint if exists tenant_branding_esquema_valido;
alter table tenant_branding add constraint tenant_branding_esquema_valido
  check (esquema is null or esquema in ('claro', 'oscuro')) not valid;

-- ----------------------------------------------------------------------------
-- 2) tenant_branding: el owner/admin de SU salón por fin puede escribir.
--    (La lectura pública de 0007 no se toca: el branding del salón es público.)
-- ----------------------------------------------------------------------------
drop policy if exists tb_ins_admin on tenant_branding;
create policy tb_ins_admin on tenant_branding for insert to authenticated
  with check (
    tenant_id = public.app_tenant_id()
    and public.app_rol() in ('owner', 'admin')
  );

drop policy if exists tb_upd_admin on tenant_branding;
create policy tb_upd_admin on tenant_branding for update to authenticated
  using (
    tenant_id = public.app_tenant_id()
    and public.app_rol() in ('owner', 'admin')
  )
  with check (
    tenant_id = public.app_tenant_id()
    and public.app_rol() in ('owner', 'admin')
  );

-- Sin delete a propósito: borrar la marca de un salón no es una operación del
-- panel (volver al tema base = vaciar los campos con un update).
grant insert, update on tenant_branding to authenticated;

-- ----------------------------------------------------------------------------
-- 3) event_branding: la personalización de un evento (SIN lectura pública).
-- ----------------------------------------------------------------------------
create table if not exists event_branding (
  event_id    uuid primary key references events(id) on delete cascade,
  primario    text,          -- color principal DEL EVENTO (pisa al del salón)
  acento      text,          -- secundario del evento
  portada_ref text,          -- referencia en el almacén (corte 3) o URL externa
  monograma   text,          -- "A·R" — texto corto, lo pinta un componente
  frase       text,          -- "Nos encantará celebrar contigo"
  fuentes     text,          -- clave tipográfica; si falta hereda la del salón
  actualizado timestamptz not null default now()
);

alter table event_branding enable row level security;

-- LECTURA solo para el staff del salón dueño (el invitado la recibe ya resuelta
-- por `evento-config`, que usa service-role y salta la RLS).
drop policy if exists eb_sel_staff on event_branding;
create policy eb_sel_staff on event_branding for select to authenticated
  using (
    exists (
      select 1 from events e
      where e.id = event_branding.event_id
        and e.tenant_id = public.app_tenant_id()
    )
  );

-- ESCRITURA solo owner/admin del salón dueño del evento: UNA política
-- `for all` con el mismo predicado en using y with check — el patrón exacto
-- de `ov_wr_admin` (0008) para `event_overrides`, la tabla gemela de esta.
-- Tres políticas separadas (insert/update/delete) serían el mismo predicado
-- copiado cuatro veces: un ajuste futuro aplicado a tres de las cuatro copias
-- haría divergir insert de delete EN SILENCIO (aquí la RLS falla como 401 en
-- producción, la clase de bug más cara del historial del repo).
-- Nota: `for all` también alcanza al SELECT del admin, y el staff no-admin
-- lee por `eb_sel_staff` — igual que en 0008. El delete es legítimo: borrar
-- la fila = "volver al tema del salón".
-- (Los tres nombres viejos por si algún entorno corrió un borrador previo.)
drop policy if exists eb_ins_admin on event_branding;
drop policy if exists eb_upd_admin on event_branding;
drop policy if exists eb_del_admin on event_branding;
drop policy if exists eb_wr_admin on event_branding;
create policy eb_wr_admin on event_branding for all to authenticated
  using (
    public.app_rol() in ('owner', 'admin')
    and exists (
      select 1 from events e
      where e.id = event_branding.event_id
        and e.tenant_id = public.app_tenant_id()
    )
  )
  with check (
    public.app_rol() in ('owner', 'admin')
    and exists (
      select 1 from events e
      where e.id = event_branding.event_id
        and e.tenant_id = public.app_tenant_id()
    )
  );

-- OJO: sin `grant select a anon` — deny-by-default para la llave pública.
grant select, insert, update, delete on event_branding to authenticated;
