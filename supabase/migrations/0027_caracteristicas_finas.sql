-- ============================================================================
-- 0027 · CARACTERÍSTICAS FINAS DENTRO DE CADA MÓDULO (rediseño, Fase 5, ADITIVA)
-- ----------------------------------------------------------------------------
-- Un módulo es una experiencia entera ("el álbum"); una CARACTERÍSTICA es algo
-- que se enciende o apaga dentro de ella ("el álbum, pero sin descargas"). Eso
-- es lo que permite vender Básico / Plus / Premium sin tener dos álbumes
-- distintos en el código.
--
-- NO HACE FALTA ESQUEMA NUEVO: `features.clave` es texto, así que una
-- característica es una fila más y el motor de siempre —plan → salón → evento—
-- la resuelve igual. Se nombran `modulo.caracteristica`.
--
-- LA REGLA QUE LO HACE USABLE — HERENCIA:
--   · Si hay fila para la clave fina, esa manda.
--   · Si NO la hay, hereda de su módulo.
-- Sin herencia habría que sembrar estas cuatro claves en todos los planes y en
-- todos los eventos que ya existen; olvidar uno apagaría en silencio algo que
-- hoy funciona. Con ella, "no consta" significa "lo que traiga el álbum".
--
-- ⚠️ SOLO SE DAN DE ALTA CARACTERÍSTICAS QUE EXISTEN DE VERDAD. Un interruptor
-- sobre algo que la app no sabe hacer no apaga nada ni enciende nada: es una
-- promesa rota esperando a la primera demostración. Las cuatro de abajo tienen
-- su control real en pantalla, y el mismo día de esta migración se conectaron.
--
-- ⚠️ NO SE METEN EN NINGÚN PLAN a propósito. Gracias a la herencia, un evento
-- con el álbum contratado ya tiene sus descargas: meterlas en `plan_features`
-- no cambiaría nada hoy y ataría una decisión COMERCIAL (qué trae cada plan) a
-- una migración. Se venden apagándolas por evento cuando toque.
--
-- El gemelo en TypeScript es `packages/core/src/caracteristicas.ts`
-- (`tieneCaracteristica`), con la MISMA regla de herencia. Los dos motores se
-- mantienen a mano, como ya pasa con `evento_tiene_funcion`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Las cuatro características vendibles de hoy.
-- ----------------------------------------------------------------------------
insert into features (clave, nombre, descripcion) values
  ('album.descargas', 'Álbum: descargar todo',
   'El invitado puede bajarse todas las fotos del evento de una vez.'),
  ('muro.fotos', 'Muro: adjuntar foto',
   'Además del mensaje, el invitado puede dejar una foto en el muro.'),
  ('playlist.votos', 'Playlist: votar canciones',
   'Los invitados votan las canciones pedidas; sin esto solo se piden.'),
  ('dinamicas.ranking', 'Dinámicas: ranking',
   'Se enseña la tabla de posiciones de los juegos.')
on conflict (clave) do nothing;

-- ----------------------------------------------------------------------------
-- 2) La respuesta ÚNICA para el navegador y para el servidor.
--
-- Envuelve a `evento_tiene_funcion` (0017) en vez de reimplementar la
-- precedencia: si algún día cambia el orden plan → salón → evento, cambia en un
-- solo sitio. Lo único que añade es la HERENCIA.
-- ----------------------------------------------------------------------------
create or replace function evento_tiene_caracteristica(p_codigo text, p_clave text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_id  uuid;
  v_tenant_id uuid;
  v_plan_id   text;
  v_consta    boolean;
begin
  if p_codigo is null or p_clave is null or p_codigo = '' or p_clave = '' then
    return false;
  end if;

  select e.id, e.tenant_id, t.plan_id
    into v_event_id, v_tenant_id, v_plan_id
    from events e
    join tenants t on t.id = e.tenant_id
   where e.codigo = p_codigo
   limit 1;

  -- Evento desconocido: que no, como en la 0017. Ante la duda no se regala.
  if v_event_id is null then
    return false;
  end if;

  -- ¿CONSTA la clave fina en alguna de las tres capas? (da igual si en true o
  -- en false: lo que importa es si alguien opinó sobre ella).
  select
    exists (select 1 from plan_features
             where plan_id = v_plan_id and feature_clave = p_clave)
    or exists (select 1 from tenant_entitlements
                where tenant_id = v_tenant_id and feature_clave = p_clave)
    or exists (select 1 from event_overrides
                where event_id = v_event_id and feature_clave = p_clave)
    into v_consta;

  if v_consta then
    return evento_tiene_funcion(p_codigo, p_clave);
  end if;

  -- No consta: hereda de su módulo ("album.descargas" → "album"). Una clave sin
  -- punto se pregunta a sí misma, así que esto también sirve para módulos.
  return evento_tiene_funcion(p_codigo, split_part(p_clave, '.', 1));
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) Permisos: el NAVEGADOR tiene que poder preguntar.
--
-- Sin esto no hay forma de esconder un botón que el evento no tiene contratado
-- (la lección de la 0017, que necesitó su grant explícito). La función es
-- `security definer` y solo contesta sí/no sobre una clave: no filtra nada del
-- plano de control.
-- ----------------------------------------------------------------------------
grant execute on function evento_tiene_caracteristica(text, text) to anon;
grant execute on function evento_tiene_caracteristica(text, text) to authenticated;
grant execute on function evento_tiene_caracteristica(text, text) to service_role;
