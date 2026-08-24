-- ============================================================================
-- 0026 · LA DEMO HEREDA LA IDENTIDAD DEL SITIO (semilla — se corre en la FASE 2)
-- ----------------------------------------------------------------------------
-- ⚠️ NO CORRER JUNTO CON LA 0025. Esta semilla cambia los colores que
-- `evento-config` devuelve para `?e=demo` AL INSTANTE; debe correrse en el
-- mismo despliegue que el portal rediseñado (Fase 2 del plan), o el portal
-- viejo (oscuro) recibiría el tema nuevo a medias.
--
-- QUÉ HACE: el salón demo deja de ser el genérico "Vino & Oro" en OKLCH y pasa
-- a ser EXACTAMENTE la identidad de Hacienda Santa Renata, la del sitio
-- (apps/sitio-salon/src/app/globals.css): así el portal del invitado se siente
-- una continuación del sitio, que es todo el argumento del rediseño.
--
-- Los valores de abajo están ATADOS por prueba: `packages/ui/src/tema/paridad.test.ts`
-- compara este archivo contra `TEMA_DEMO` (la constante que usan las vitrinas
-- demo-xxxxxx, que NO existen en `events` y no leen la base) y contra la paleta
-- del sitio. Si alguien cambia un lado y no el otro, el CI se pone rojo: las
-- dos demos (la fila `demo` y las vitrinas) deben verse IDÉNTICAS.
--
-- Es un UPSERT (no `do nothing`): si la fila demo ya existe (la sembró la
-- 0007), se actualiza; si no existiera, se crea. Cero filas afectadas es
-- imposible — el fallo silencioso del update-sin-fila no puede pasar aquí.
-- ============================================================================

insert into tenant_branding
  (tenant_id, nombre, logo_url, primario, primario_texto, acento, radio,
   sitio_url, fuentes, fondo, tinta, esquema)
values
  ('d0000000-0000-4000-8000-000000000001',
   'Hacienda Santa Renata',
   null,
   '#7a2e3b',              -- vino (el --primary del sitio)
   '#fbf9f5',              -- crema clarísima (texto sobre el vino)
   '#c9a96e',              -- oro (el --ring / acento del sitio)
   '0.4rem',               -- el redondeo sobrio del sitio
   'https://salones-teal.vercel.app',
   'clasica',              -- Cormorant Garamond + Jost + Parisienne
   '#fbf9f5',              -- fondo crema del sitio
   '#241d1a',              -- tinta del sitio
   'claro')
on conflict (tenant_id) do update set
  nombre         = excluded.nombre,
  primario       = excluded.primario,
  primario_texto = excluded.primario_texto,
  acento         = excluded.acento,
  radio          = excluded.radio,
  sitio_url      = excluded.sitio_url,
  fuentes        = excluded.fuentes,
  fondo          = excluded.fondo,
  tinta          = excluded.tinta,
  esquema        = excluded.esquema,
  actualizado    = now();

-- El EVENTO demo gana su personalización: monograma y frase. (La fila de
-- `events` con codigo='demo' existe desde la 0002; las vitrinas demo-xxxxxx no
-- están en `events` a propósito y toman estos mismos valores de la constante
-- `EVENTO_DEMO` de @salones/ui — atada por la misma prueba de paridad.)
insert into event_branding (event_id, monograma, frase, portada_ref)
select id, 'A·R', 'Nos encantará celebrar contigo',
       'https://salones-teal.vercel.app/img/portada.jpg'
from events
where codigo = 'demo'
on conflict (event_id) do update set
  monograma   = excluded.monograma,
  frase       = excluded.frase,
  portada_ref = excluded.portada_ref,
  actualizado = now();

-- LA PORTADA ES LA DEL PROPIO SITIO (una ceremonia en una hacienda de piedra
-- mexicana, la misma que encabeza salones-teal). Dos razones:
--   · COHERENCIA: el invitado que llega desde el sitio reconoce el lugar; la
--     portada del portal y la del salón cuentan la misma historia.
--   · COSTO: se sirve desde Vercel, no desde el almacén de Supabase, así que
--     no gasta del cupo de descarga que comparten todas las bodas.
-- Es una URL http(s) a propósito: `evento-config` solo reenvía esas (una
-- referencia interna del almacén se resuelve firmada, y eso llega con el
-- editor de portada del panel).

-- --------------------------------------------------------------------------
-- Y el EVENTO demo se llama como la boda que cuenta la demo.
--
-- Se llamaba "Demostración pública": honesto, pero delataba el software justo
-- donde más se ve —el título de la pestaña y la tarjeta de WhatsApp— mientras
-- la portada decía "Ana & Rodrigo" (que sale de la invitación capturada). Dos
-- nombres para el mismo evento en la misma pantalla. La vitrina por visitante
-- ya usaba el nombre de la boda; esto alinea el evento real con ella.
-- --------------------------------------------------------------------------
update events set nombre = 'Boda Ana & Rodrigo' where codigo = 'demo';
