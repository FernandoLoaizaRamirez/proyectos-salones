-- ============================================================================
-- 0016 · CANDADO DE SOBRESCRITURA  (2026-08-09)
-- ----------------------------------------------------------------------------
-- EL AGUJERO QUE TAPA — y es el ultimo de los seis graves de la auditoria:
--
--   El corte de la 0009 dejo BORRAR en manos del anfitrion, pero SOBRESCRIBIR
--   siguio abierto a cualquiera con el enlace de la boda. La propia 0009 lo
--   dejo dicho por escrito como un limite conocido. Al ir a cerrarlo se
--   comprobo, contra el Supabase de verdad y con un pase de invitado normal,
--   que el limite era mucho peor de lo que decia el papel:
--
--     borrar la foto de otro ........................ 0 filas   (cortado ya)
--     moverla a OTRA boda ........................... HTTP 401  (cortado ya)
--     cambiar el salon dueno (tenant_id) ............ HTTP 409  (cortado ya)
--     VACIAR su contenido ........................... HTTP 200  ← abierto
--     CAMBIARLE EL IDENTIFICADOR .................... HTTP 200  ← abierto
--     MOVERLA A OTRA COLECCION ...................... HTTP 200  ← abierto
--     falsear su fecha de subida .................... HTTP 200  ← abierto
--
--   Las dos ultimas lineas son las que cambian la gravedad del asunto:
--
--   (a) TODO se consulta filtrando por evento Y coleccion
--       (packages/sync/src/index.ts:577). Mover una fila a una coleccion
--       inventada la hace desaparecer de TODAS las pantallas. Es un borrado con
--       otro nombre: el candado de la 0009 no se rompe, SE RODEA POR AL LADO.
--
--   (b) No hace falta ir de una en una. PostgREST acepta un PATCH filtrado por
--       coleccion, sin nombrar ni un identificador. Medido en produccion:
--
--         PATCH /rest/v1/items?evento=eq.demo&coleccion=eq.<col>
--         body {"dato":{}}                       →  200, 4 filas en blanco
--
--       En una boda de verdad, eso es UNA peticion que vacia el album entero y
--       el muro entero. Quien la manda solo necesita el enlace que se comparte
--       por WhatsApp.
--
-- LO QUE HACE ESTA MIGRACION:
--
--   Un solo disparador sobre `items`, con tres reglas, y una tabla con la lista
--   de excepciones. Al ANFITRION no le afecta (el modera, y para eso tiene su
--   llave); a la llave de servicio y al Editor SQL tampoco.
--
--     Regla 0 · AL DAR DE ALTA, LA FECHA LA PONE LA BASE. El servidor sirve
--               ordenado por `creado` y la suscripcion se queda con las 500 mas
--               recientes: quien elija su propia fecha puede clavar su mensaje
--               arriba del muro proyectado, y con unas cuantas filas fechadas en
--               el futuro EMPUJAR FUERA todo lo que subio la gente. Un apagon
--               del muro sin borrar nada.
--
--     Regla 1 · LA IDENTIDAD NO SE TOCA. Un invitado no puede cambiar `id`,
--               `evento`, `coleccion`, `module`, `creado` ni `tenant_id` de una
--               fila que ya existe. Cierra (a), el secuestro de identificadores
--               y las fechas falsas.
--
--     Regla 2 · SOLO SE REESCRIBE DONDE HAGA FALTA. Las colecciones apuntadas
--               en `items_reescribibles` siguen abiertas; el resto pasan a ser
--               de SOLO ANADIR. Cierra (b) para el contenido que importa.
--
-- POR QUE UN DISPARADOR Y NO UNA POLITICA RLS (decision de diseno):
--   Una politica ve la fila vieja O la nueva, nunca las dos a la vez, asi que
--   "esta columna no puede cambiar" no es expresable. Y cuando una politica
--   rechaza por su clausula `using`, PostgREST responde 200 con CERO filas: el
--   ataque parece haber funcionado y el defensor no se entera. Es el mismo
--   enganio del 204 del borrado que hubo que arreglar el 6 ago. El disparador,
--   en cambio, levanta un error con nombre y sale un 403 honesto.
--
-- QUE SIGUE ABIERTO, DICHO CLARO (no es descuido, es el alcance):
--
--   · Las SEIS colecciones de la lista blanca (canciones, respuestas, mesas,
--     acomodo, pases, accesos) siguen reescribibles por cualquier invitado.
--     No es que se acepte: es que las pantallas de organizador que las usan
--     —el acomodo de mesas, la tablet de la puerta, el tablero de RSVP y el
--     panel del DJ— trabajan HOY con pase de invitado, porque nadie les da la
--     llave de anfitrion. Cerrarlas por SQL frenaria al salon sin frenar al
--     atacante. El arreglo de verdad es de codigo: darles esa llave. Ese es el
--     siguiente escalon, y solo entonces se pueden quitar de la lista.
--
--   · DAR DE ALTA sigue siendo libre. Un invitado no puede vaciar el muro, pero
--     si puede ahogarlo a base de mensajes nuevos. Lo unico que hay contra eso
--     es el tope de la 0015, y ese solo cuenta fotos y videos, no filas.
--
--   · El evento `demo` no queda protegido, a proposito: cualquiera obtiene
--     pase de ANFITRION de la demo (es la vitrina publica). En una boda real,
--     con su codigo y su llave, si protege.
--
-- ⚠️ ORDEN: requiere la 0006 (pase firmado), la 0009 (llave de anfitrion) y la
--    0014 (los tres cortes) aplicadas. NO hace falta desplegar nada en Vercel
--    antes: se reviso llamada por llamada que ninguna app en el aire reescribe
--    en las colecciones que se cierran.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) LA LISTA BLANCA.  Va primero y no la usa nadie todavia.
--
--    Vive en una tabla y no dentro de la regla por dos motivos: se puede leer
--    para saber que esta abierto sin descifrar SQL, y el dia de una urgencia se
--    reabre una coleccion con UN insert, sin tocar politicas ni desplegar nada.
--
--    Lo que NO este aqui NACE CERRADO. Es a proposito: un modulo nuevo que
--    necesite reescribir fallara con un 403 bien visible en su primera prueba,
--    en vez de abrir un agujero por olvido.
-- ----------------------------------------------------------------------------
create table if not exists items_reescribibles (
  coleccion text primary key,
  porque    text not null,
  apuntada  timestamptz not null default now()
);

-- Cerrada al publico: solo la toca el disparador, que corre como dueno. Sin
-- esto, quien quisiera abrirse una coleccion solo tendria que insertarse una
-- linea aqui y el candado entero no valdria nada.
alter table items_reescribibles enable row level security;

insert into items_reescribibles (coleccion, porque) values
  ('canciones',  'El invitado VOTA una cancion ya pedida: reescribir es el producto. Y el panel del DJ marca puesta/descartada sin llave de anfitrion.'),
  ('respuestas', 'El invitado corrige SU confirmacion ("cambiar mi respuesta"), y el tablero de RSVP marca a mano por telefono sin llave.'),
  ('mesas',      'La app de acomodo edita mesas existentes y trabaja con pase de invitado (no recibe la llave de anfitrion).'),
  ('acomodo',    'Mover a un invitado de mesa reescribe su fila. Es el nucleo del acomodo.'),
  ('pases',      'La app de la puerta edita un pase ya emitido (cambiar mesa, personas o tipo).'),
  ('accesos',    'Marcar y DESMARCAR quien entro: desmarcar es un update (entro:false), no un borrado, justo porque la tablet de la puerta no tiene llave.')
on conflict (coleccion) do nothing;


-- ----------------------------------------------------------------------------
-- 2) EL CANDADO.  Tampoco hace nada hasta que se enganche el disparador.
-- ----------------------------------------------------------------------------
create or replace function items_candado_sobrescritura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cabeceras text;
  v_anfitrion text;
  v_evento    text;
  v_rol       text;
begin
  -- --- Quien SI puede hacer lo que quiera -----------------------------------

  -- (i) Sin cabeceras no viene de la API: es el Editor SQL, una migracion o una
  --     conexion directa. Si alguien ya esta ahi dentro, este candado no pinta.
  v_cabeceras := current_setting('request.headers', true);
  if v_cabeceras is null or v_cabeceras = '' then
    return new;
  end if;

  -- (ii) La llave de SERVICIO (las Edge Functions). Hoy ninguna reescribe en
  --      `items` —`evento-cierre` borra filas y toca la tabla `events`—, pero
  --      se deja exento para que manana una funcion nueva no choque contra
  --      esto sin que nadie entienda por que.
  --
  --      ⚠️ AQUI HAY UNA TRAMPA QUE CASI CUELA. Lo natural seria preguntar por
  --      `current_user`, y estaria MAL: dentro de una funcion `security
  --      definer`, `current_user` es el DUENO de la funcion (postgres), no
  --      quien llama. La comprobacion habria dado cierto SIEMPRE y el candado
  --      no habria frenado a nadie — pareciendo puesto. Se pregunta por el rol
  --      que anota PostgREST en la peticion, que si es el de quien llama.
  --
  --      Y si ese dato faltara, `v_rol` queda vacio y el candado SE APLICA:
  --      ante la duda, cerrado.
  v_rol := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');
  if v_rol = 'service_role' then
    return new;
  end if;

  --      Y un segundo cinturon, por si algun dia Supabase deja de anotar ese
  --      rol como hoy: sin pase de INVITADO tampoco se aplica el candado. Es
  --      seguro y no abre nada, porque una peticion sin pase valido NO LLEGA
  --      AQUI: las politicas de la 0009 exigen uno de los dos pases, asi que o
  --      no cuadra ninguna fila (y el disparador ni se dispara) o viene con la
  --      llave de servicio, que se salta las politicas. Las Edge Functions no
  --      mandan `x-evento-pase`, asi que quedan exentas por los dos caminos.
  if coalesce(v_cabeceras::json->>'x-evento-pase', '') = '' then
    return new;
  end if;

  -- (iii) El ANFITRION del evento. Es quien modera: quitar un mensaje subido de
  --       tono o corregir un nombre es su trabajo. Se comprueba contra el
  --       evento de la fila que se toca: con la llave de una boda no se toca otra.
  --       (En un alta no hay fila vieja, asi que se mira la nueva.)
  if tg_op = 'INSERT' then
    v_evento := new.evento;
  else
    v_evento := old.evento;
  end if;

  v_anfitrion := evento_del_pase_anfitrion(v_cabeceras::json->>'x-evento-anfitrion');
  if v_anfitrion is not null and v_anfitrion = v_evento then
    return new;
  end if;

  -- --- De aqui abajo, es un INVITADO ----------------------------------------

  -- REGLA 0 · AL DAR DE ALTA, LA FECHA LA PONE LA BASE.
  --
  -- Parece un detalle y no lo es. El servidor sirve las filas ordenadas por
  -- `creado` (packages/sync/src/index.ts:588, `order=creado.desc`) y la
  -- suscripcion se queda con las 500 MAS RECIENTES. O sea que quien pueda
  -- elegir su propia fecha puede:
  --   · clavar su mensaje en lo alto del muro proyectado, para siempre, y
  --   · con unas cuantas filas fechadas en el futuro, EMPUJAR FUERA DE LA
  --     VENTANA todo lo que subio la gente: un apagon del muro y del album
  --     sin borrar ni una fila.
  -- Dar de alta sigue abierto (es la gracia del muro), pero la fecha no se
  -- negocia. Ninguna app manda `creado` al escribir —se comprobo una por una—,
  -- asi que para el trafico legitimo esto no cambia absolutamente nada.
  --
  -- `module` se deja en nulo a proposito: asi lo rellena a partir de la
  -- coleccion el disparador de la 0003, que corre justo despues que este
  -- (Postgres los dispara por orden alfabetico, y "candado" va antes que
  -- "completar"). Es la unica forma de que no lo elija quien manda la peticion.
  if tg_op = 'INSERT' then
    new.creado := now();
    new.module := null;
    return new;
  end if;

  -- REGLA 1 · La identidad de la fila no se toca.
  --
  -- Cambiar `coleccion` la haria desaparecer de todas las pantallas (todo se
  -- consulta por evento + coleccion), que es un borrado disfrazado. Cambiar
  -- `id` permite secuestrar la fila de otro. Y `creado` ordena el muro.
  if new.id        is distinct from old.id
  or new.evento    is distinct from old.evento
  or new.coleccion is distinct from old.coleccion
  or new.module    is distinct from old.module
  or new.creado    is distinct from old.creado
  or new.tenant_id is distinct from old.tenant_id then
    raise exception
      'items: la identidad de una fila (id, evento, coleccion, module, creado, tenant_id) solo la puede cambiar quien organiza el evento'
      using errcode = '42501';
  end if;

  -- REGLA 2 · Solo se reescribe donde este apuntado.
  if not exists (
    select 1 from items_reescribibles r where r.coleccion = old.coleccion
  ) then
    raise exception
      'items: la coleccion "%" es de SOLO ANADIR; para cambiar algo hace falta el enlace de quien organiza el evento', old.coleccion
      using errcode = '42501';
  end if;

  return new;
end $$;

-- 42501 = "privilegios insuficientes". PostgREST lo traduce a un 403, que es
-- un NO honesto: se distingue de una caida de red y queda en el diagnostico.


-- ----------------------------------------------------------------------------
-- 3) ENGANCHARLO.  Este es el unico paso que cambia el comportamiento, y va el
--    ULTIMO a proposito: si la pegada se cortara antes de llegar aqui, la base
--    se queda funcionando exactamente como hoy, con una tabla y una funcion de
--    mas que no molestan a nadie.
-- ----------------------------------------------------------------------------
drop trigger if exists trg_items_candado_sobrescritura on items;
create trigger trg_items_candado_sobrescritura
  before insert or update on items
  for each row execute function items_candado_sobrescritura();


-- ============================================================================
-- COMO COMPROBAR QUE QUEDO PUESTO
-- ----------------------------------------------------------------------------
-- Automatico, con `pnpm test` y las dos variables del proyecto puestas:
--
--   tests/aislamiento/sobrescritura.test.ts
--       Ataca de verdad, con un pase de invitado normal, y NO deja basura: usa
--       una fila suya con id fijo en una coleccion que no pinta ninguna
--       pantalla. Mientras esta migracion NO este corrida, se SALTA sola y lo
--       dice por pantalla; en cuanto lo este, sus 7 casos empiezan a vigilar.
--       Ese es el aviso de que quedo puesta: pasan de "saltada" a "verde".
--
--   tests/despliegue/candado-sobrescritura.test.ts
--       Lee los ARCHIVOS (corre sin Supabase, no se salta nunca): vigila que
--       nadie borre el disparador ni meta una coleccion mas en la lista blanca.
--
-- ⚠️ PENDIENTE PARA DESPUES DE CORRERLA: anadir este candado como una pieza mas
--    del CENTINELA (tests/aislamiento/centinela.test.ts). No se hizo ya a
--    proposito: el centinela corre con EXIGIR_SEGURIDAD=1 en main, asi que
--    apuntarlo antes de tiempo pondria el CI en rojo por una migracion que
--    todavia no se ha pegado, y un CI rojo que "ya se sabe por que" deja de
--    servir para avisar de nada.
--
-- A mano, si se quiere ver con los ojos (cambiar <PASE> por uno de emitir_pase):
--
--   -- vaciar una coleccion cerrada entera: debe dar 403
--   curl -X PATCH "$URL/rest/v1/items?evento=eq.<boda>&coleccion=eq.mensajes" \
--     -H "apikey: $ANON" -H "x-evento-pase: <PASE>" \
--     -H "Content-Type: application/json" -d '{"dato":{}}'
--
--   -- esconder una fila cambiandole la coleccion: debe dar 403
--   curl -X PATCH "$URL/rest/v1/items?evento=eq.<boda>&id=eq.<id>" \
--     -H "apikey: $ANON" -H "x-evento-pase: <PASE>" \
--     -H "Content-Type: application/json" -d '{"coleccion":"basura"}'
--
--   -- votar una cancion: debe seguir dando 200 (si no, algo se rompio)
--
-- EN UNA URGENCIA, si el candado frena algo legitimo un sabado por la noche:
-- se reabre esa coleccion con UNA linea, sin tocar politicas ni desplegar nada,
-- y el efecto es inmediato en la siguiente peticion:
--
--   insert into items_reescribibles (coleccion, porque)
--   values ('<la que sea>', 'reabierta de urgencia el <fecha>')
--   on conflict (coleccion) do nothing;
--
-- PARA REVERTIR DEL TODO (solo en una emergencia; deja el agujero abierto):
--
--   drop trigger if exists trg_items_candado_sobrescritura on items;
--
-- ⚠️ CUANDO CORRERLA: entre semana, con ninguna boda en curso. No porque sea
--    peligrosa —no toca ni una fila de datos— sino porque el efecto es
--    inmediato para todos los telefonos conectados, y si hubiera que ajustar
--    algo, mejor un martes por la manana que un sabado a las once de la noche.
-- ============================================================================
