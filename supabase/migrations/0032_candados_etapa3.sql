-- ============================================================================
-- 0032 — LOS DOS CANDADOS QUE LA REVISIÓN LE ENCONTRÓ A LA ETAPA 3 (28 ago)
--
-- 1) EL CLIENTE DEBE VIVIR EN EL MISMO SALÓN QUE SU EVENTO. La FK a secas de
--    la 0030 dejaba ligar un evento al cliente de OTRO salón: las
--    comprobaciones de FK corren como el dueño de la tabla y SE SALTAN la
--    RLS, así que un staff con un UUID ajeno (los de las semillas son
--    públicos en el repo) podía cruzarlos — y el borrado de la ficha ajena
--    mutaba en silencio el evento de este salón. FK COMPUESTA: (client_id,
--    tenant_id) contra clients(id, tenant_id).
--
--    ⚠️ `on delete set null (client_id)` — la lista de columnas es de PG 15+
--    (aquí corre 17) y es OBLIGATORIA: sin ella, borrar la ficha intentaría
--    anular también events.tenant_id (NOT NULL desde la 0002) y el borrado
--    tronaría, rompiendo la promesa "borrar la ficha no toca su boda".
--
-- 2) LA ACTIVIDAD SIGUE A SU EVENTO. `actividad.evento` era texto suelto:
--    borrar la fila de events dejaba contadores huérfanos para siempre, y si
--    otro salón registraba después EL MISMO código (se libera al borrar), la
--    RLS —que ata por código— le entregaba el historial del muerto. FK con
--    cascada: borrar el evento borra sus contadores; renombrar el código
--    (permitido por la 0008) se los lleva consigo.
-- ============================================================================

-- 1) La FK compuesta cliente↔salón. Las semillas de la 0030 ya son
--    consistentes (cada cliente vive en el tenant de su evento): valida solo.
alter table clients
  drop constraint if exists clients_id_tenant_unique;
alter table clients
  add constraint clients_id_tenant_unique unique (id, tenant_id);

alter table events
  drop constraint if exists events_client_id_fkey;
alter table events
  add constraint events_client_id_fkey
  foreign key (client_id, tenant_id)
  references clients (id, tenant_id)
  on delete set null (client_id);

-- 2) La actividad atada a su evento. Primero los huérfanos (por si ya hubo
--    algún borrado), luego la cadena.
delete from actividad a
 where not exists (select 1 from events e where e.codigo = a.evento);

alter table actividad
  drop constraint if exists actividad_evento_fk;
alter table actividad
  add constraint actividad_evento_fk
  foreign key (evento) references events (codigo)
  on update cascade
  on delete cascade;
