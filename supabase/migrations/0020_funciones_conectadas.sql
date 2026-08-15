-- ============================================================================
-- 0020 — LAS FUNCIONES DE LA EXPERIENCIA CONECTADA (14 ago 2026)
--
-- El portal del invitado ya monta cuatro experiencias más: la invitación
-- digital, "Mi mesa" (el acomodo leído por el invitado), el photobooth y el
-- brindis en video. Las funciones vendibles son DATOS (filas en `features`),
-- no código: sin estas filas, `evento-config` no puede encenderlas para
-- ningún evento y el portal las esconde.
--
-- Dos cosas, y solo estas dos:
--   1. Dar de alta las cuatro claves nuevas en `features` (las mismas de
--      FEATURES_CONOCIDAS en @salones/core).
--   2. Encender la vitrina pública: el evento "demo" las muestra todas.
--
-- Lo que esta migración NO hace, a propósito: meterlas a ningún plan
-- (`plan_features`). Regalárselas a todos los eventos del plan "gestionado"
-- sería una decisión comercial, no una migración; mientras no se decida, cada
-- evento real las enciende una por una con `event_overrides`, igual que aquí.
-- ============================================================================

insert into features (clave, nombre, descripcion) values
  ('invitacion', 'Invitación digital', 'La invitación acuarela por evento, con RSVP y enlace personal por invitado.'),
  ('mesas',      'Mi mesa',            'El invitado encuentra su mesa y con quién la comparte (lee el acomodo del organizador).'),
  ('photobooth', 'Photobooth',         'Fotos con los marcos del evento, desde el teléfono del invitado.'),
  ('brindis',    'Brindis en video',   'Mensajes en video para los festejados, con video recuerdo.')
on conflict (clave) do nothing;

-- La vitrina demo (evento 'demo', sembrado en la 0002 con id fijo) enseña la
-- suite completa. Se enciende POR EVENTO porque el override del evento gana
-- sobre el plan (resolveEntitlements, y el mismo orden en evento-config).
-- `do update` y no `do nothing`: si algún día alguien la apagó a mano, volver
-- a correr esta migración la vuelve a encender, que es lo que promete.
insert into event_overrides (event_id, feature_clave, habilitado) values
  ('e0000000-0000-4000-8000-000000000001', 'invitacion', true),
  ('e0000000-0000-4000-8000-000000000001', 'mesas',      true),
  ('e0000000-0000-4000-8000-000000000001', 'photobooth', true),
  ('e0000000-0000-4000-8000-000000000001', 'brindis',    true)
on conflict (event_id, feature_clave) do update set habilitado = excluded.habilitado;
