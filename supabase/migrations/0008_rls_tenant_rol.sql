-- ============================================================================
-- 0008 · RLS POR TENANT/ROL (Fase 1, ADITIVO, deny-by-default)
-- ----------------------------------------------------------------------------
-- Abre las tablas del PLANO DE CONTROL (creadas en 0002 y 0005) al STAFF
-- autenticado, ACOTADO A SU PROPIO SALÓN. Hasta ahora nacían con RLS activada y
-- SIN políticas = cerradas a todos salvo el service-role. Aquí se agregan las
-- políticas para que cada salón (tenant) vea/gestione SOLO lo suyo, leyendo el
-- tenant y el rol desde el token (`app_metadata`, grabado por el script de alta
-- del paso 1.1b `vincular-staff`).
--
-- SEGURIDAD Y COMPATIBILIDAD:
--   • Es ADITIVA: solo agrega funciones y políticas; no cambia esquema ni datos.
--   • deny-by-default: sin claim de tenant en el token (p. ej. la llave pública
--     anónima que usan los invitados) NO se ve NADA de estas tablas. Las apps en
--     vivo (muro, playlist, rsvp, dinámicas, álbum) usan la llave anónima con el
--     candado x-evento sobre `items` y NO tocan estas tablas → no se afectan.
--   • Las políticas son `to authenticated`: el invitado (rol `anon`, incluso con
--     el pase firmado que es `role=anon`) queda fuera. Staff = rol `authenticated`.
--   • NO toca `items` ni el candado del invitado (viven en su propia migración).
--   • Facturación (`tenant_entitlements`, `subscriptions`): aquí SOLO se da
--     LECTURA al staff; escribir sigue siendo exclusivo del service-role (webhook).
--   • Reversible: al final hay, comentado, el bloque de ROLLBACK (drop) que deja
--     las tablas otra vez cerradas.
--
--   Convención de claims (paso 1.1b): app_metadata.tenant_id (uuid) + rol
--   ('owner'|'admin'|'staff'). La RLS los lee con auth.jwt() vía las funciones
--   app_tenant_id() / app_rol() de abajo.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Helpers: leen la identidad de quien hace la petición desde SU token.
-- STABLE (el JWT no cambia dentro de una consulta). Devuelven NULL si no hay
-- claim → toda comparación da NULL → fila NO visible (deny-by-default).
-- `nullif(...,'')` evita que un tenant_id vacío rompa el cast a uuid.
-- --------------------------------------------------------------------------
create or replace function public.app_tenant_id()
returns uuid language sql stable as $$
  select (nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''))::uuid
$$;

create or replace function public.app_rol()
returns text language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'rol'
$$;

-- ==========================================================================
-- tenants — el staff ve SU salón; owner/admin lo pueden actualizar (branding…).
-- ==========================================================================
drop policy if exists tenants_sel_staff on tenants;
create policy tenants_sel_staff on tenants for select to authenticated
  using (id = public.app_tenant_id());

drop policy if exists tenants_upd_admin on tenants;
create policy tenants_upd_admin on tenants for update to authenticated
  using (id = public.app_tenant_id() and public.app_rol() in ('owner', 'admin'))
  with check (id = public.app_tenant_id());

-- ==========================================================================
-- tenant_members — el staff ve los miembros de SU salón; owner/admin gestionan.
-- El tenant se lee del TOKEN, no de esta tabla → sin recursión de RLS.
-- ==========================================================================
drop policy if exists tm_sel_staff on tenant_members;
create policy tm_sel_staff on tenant_members for select to authenticated
  using (tenant_id = public.app_tenant_id());

drop policy if exists tm_ins_admin on tenant_members;
create policy tm_ins_admin on tenant_members for insert to authenticated
  with check (tenant_id = public.app_tenant_id() and public.app_rol() in ('owner', 'admin'));

drop policy if exists tm_upd_admin on tenant_members;
create policy tm_upd_admin on tenant_members for update to authenticated
  using (tenant_id = public.app_tenant_id() and public.app_rol() in ('owner', 'admin'))
  with check (tenant_id = public.app_tenant_id() and public.app_rol() in ('owner', 'admin'));

drop policy if exists tm_del_admin on tenant_members;
create policy tm_del_admin on tenant_members for delete to authenticated
  using (tenant_id = public.app_tenant_id() and public.app_rol() in ('owner', 'admin'));

-- ==========================================================================
-- events — cualquier staff de un salón ve y gestiona los eventos de SU salón.
-- (Habilita el "alta de eventos autenticada" del paso siguiente.)
-- ==========================================================================
drop policy if exists events_sel_staff on events;
create policy events_sel_staff on events for select to authenticated
  using (tenant_id = public.app_tenant_id());

drop policy if exists events_ins_staff on events;
create policy events_ins_staff on events for insert to authenticated
  with check (tenant_id = public.app_tenant_id());

drop policy if exists events_upd_staff on events;
create policy events_upd_staff on events for update to authenticated
  using (tenant_id = public.app_tenant_id())
  with check (tenant_id = public.app_tenant_id());

drop policy if exists events_del_staff on events;
create policy events_del_staff on events for delete to authenticated
  using (tenant_id = public.app_tenant_id());

-- ==========================================================================
-- guests — pertenecen a un evento; se acotan por el salón dueño de ese evento.
-- El subquery a `events` también respeta la RLS de events (doble candado).
-- ==========================================================================
drop policy if exists guests_sel_staff on guests;
create policy guests_sel_staff on guests for select to authenticated
  using (exists (select 1 from events e
                 where e.id = guests.event_id and e.tenant_id = public.app_tenant_id()));

drop policy if exists guests_ins_staff on guests;
create policy guests_ins_staff on guests for insert to authenticated
  with check (exists (select 1 from events e
                      where e.id = guests.event_id and e.tenant_id = public.app_tenant_id()));

drop policy if exists guests_upd_staff on guests;
create policy guests_upd_staff on guests for update to authenticated
  using (exists (select 1 from events e
                 where e.id = guests.event_id and e.tenant_id = public.app_tenant_id()))
  with check (exists (select 1 from events e
                      where e.id = guests.event_id and e.tenant_id = public.app_tenant_id()));

drop policy if exists guests_del_staff on guests;
create policy guests_del_staff on guests for delete to authenticated
  using (exists (select 1 from events e
                 where e.id = guests.event_id and e.tenant_id = public.app_tenant_id()));

-- ==========================================================================
-- tenant_entitlements — el staff LEE qué tiene habilitado su salón.
-- Escribir es SOLO del service-role (el webhook de Stripe) → sin política write.
-- ==========================================================================
drop policy if exists ent_sel_staff on tenant_entitlements;
create policy ent_sel_staff on tenant_entitlements for select to authenticated
  using (tenant_id = public.app_tenant_id());

-- ==========================================================================
-- event_overrides — lectura acotada por el salón del evento; owner/admin gestionan.
-- ==========================================================================
drop policy if exists ov_sel_staff on event_overrides;
create policy ov_sel_staff on event_overrides for select to authenticated
  using (exists (select 1 from events e
                 where e.id = event_overrides.event_id and e.tenant_id = public.app_tenant_id()));

drop policy if exists ov_wr_admin on event_overrides;
create policy ov_wr_admin on event_overrides for all to authenticated
  using (public.app_rol() in ('owner', 'admin')
         and exists (select 1 from events e
                     where e.id = event_overrides.event_id and e.tenant_id = public.app_tenant_id()))
  with check (public.app_rol() in ('owner', 'admin')
              and exists (select 1 from events e
                          where e.id = event_overrides.event_id and e.tenant_id = public.app_tenant_id()));

-- ==========================================================================
-- subscriptions (0005) — el staff LEE la suscripción de su salón.
-- Escribir es SOLO del service-role (el webhook) → sin política write.
-- ==========================================================================
drop policy if exists sub_sel_staff on subscriptions;
create policy sub_sel_staff on subscriptions for select to authenticated
  using (tenant_id = public.app_tenant_id());

-- --------------------------------------------------------------------------
-- NOTA: plans / features / plan_features (catálogo comercial GLOBAL) quedan
-- CERRADAS a propósito (sin políticas). El staff obtiene el catálogo desde los
-- datos de la app; abrirlas se decide aparte si hiciera falta.
--
-- ROLLBACK (revertir esta migración) — deja las tablas otra vez cerradas
-- (solo service-role). Copiar/pegar en el SQL editor:
--
--   drop policy if exists tenants_sel_staff  on tenants;
--   drop policy if exists tenants_upd_admin  on tenants;
--   drop policy if exists tm_sel_staff       on tenant_members;
--   drop policy if exists tm_ins_admin       on tenant_members;
--   drop policy if exists tm_upd_admin       on tenant_members;
--   drop policy if exists tm_del_admin       on tenant_members;
--   drop policy if exists events_sel_staff   on events;
--   drop policy if exists events_ins_staff   on events;
--   drop policy if exists events_upd_staff   on events;
--   drop policy if exists events_del_staff   on events;
--   drop policy if exists guests_sel_staff   on guests;
--   drop policy if exists guests_ins_staff   on guests;
--   drop policy if exists guests_upd_staff   on guests;
--   drop policy if exists guests_del_staff   on guests;
--   drop policy if exists ent_sel_staff      on tenant_entitlements;
--   drop policy if exists ov_sel_staff       on event_overrides;
--   drop policy if exists ov_wr_admin        on event_overrides;
--   drop policy if exists sub_sel_staff      on subscriptions;
--   drop function if exists public.app_tenant_id();
--   drop function if exists public.app_rol();
-- ============================================================================
