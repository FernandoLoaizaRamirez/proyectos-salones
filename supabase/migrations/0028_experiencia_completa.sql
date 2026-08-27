-- ============================================================================
-- 0028 — LA EXPERIENCIA COMPLETA: LAS CINCO FUNCIONES QUE FALTABAN (26 ago 2026)
--
-- Etapa 1 de "la muestra": el portal del invitado pasa de 9 a 14 experiencias.
-- Entran "Mi pase" (el boleto con QR dentro del portal) y las cuatro de
-- información (cronograma, lugar, vestimenta y preguntas frecuentes, que
-- salen de la invitación capturada en el panel). Las funciones vendibles son
-- DATOS (filas en `features`), no código: sin estas filas, `evento-config` no
-- puede encenderlas para ningún evento y el portal las esconde.
--
-- Dos cosas, y solo estas dos (mismo patrón que la 0020):
--   1. Dar de alta las cinco claves nuevas en `features` (las mismas de
--      FEATURES_CONOCIDAS en @salones/core).
--   2. Encender la vitrina pública: el evento "demo" las muestra todas.
--
-- Lo que esta migración NO hace, a propósito: meterlas a ningún plan
-- (`plan_features`). Regalárselas a todos los eventos de un plan es una
-- decisión comercial, no una migración; mientras no se decida, cada evento
-- real las enciende una por una con `event_overrides`, igual que aquí.
-- ============================================================================

insert into features (clave, nombre, descripcion) values
  ('pase',       'Mi pase',              'El boleto con QR de cada invitado, dentro del portal del evento.'),
  ('cronograma', 'Cronograma',           'El plan de la celebración hora por hora (sale del itinerario de la invitación).'),
  ('lugar',      'Lugar y cómo llegar',  'Las sedes del evento con mapa, direcciones y agregar al calendario.'),
  ('vestimenta', 'Código de vestimenta', 'Qué ponerse y la paleta de colores sugerida.'),
  ('faq',        'Preguntas frecuentes', 'Las dudas de siempre del evento, contestadas una sola vez.')
on conflict (clave) do nothing;

-- La vitrina demo (evento 'demo', sembrado en la 0002 con id fijo) enseña la
-- suite completa. Se enciende POR EVENTO porque el override del evento gana
-- sobre el plan (resolveEntitlements, y el mismo orden en evento-config).
-- `do update` y no `do nothing`: si algún día alguien la apagó a mano, volver
-- a correr esta migración la vuelve a encender, que es lo que promete.
insert into event_overrides (event_id, feature_clave, habilitado) values
  ('e0000000-0000-4000-8000-000000000001', 'pase',       true),
  ('e0000000-0000-4000-8000-000000000001', 'cronograma', true),
  ('e0000000-0000-4000-8000-000000000001', 'lugar',      true),
  ('e0000000-0000-4000-8000-000000000001', 'vestimenta', true),
  ('e0000000-0000-4000-8000-000000000001', 'faq',        true)
on conflict (event_id, feature_clave) do update set habilitado = excluded.habilitado;
