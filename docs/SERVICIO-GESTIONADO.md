# Servicio gestionado (el "lugar central")

El **servicio gestionado** es un lugar en internet —tuyo— donde se juntan las
cosas que los invitados mandan desde sus teléfonos (mensajes del muro, canciones
de la playlist, confirmaciones de RSVP, fotos, videos…), para que tú o la
pantalla de la fiesta las veas **todas juntas y en vivo**.

Es lo que convierte las apps "colectivas" de una demo en un solo teléfono a algo
que funciona de verdad entre muchos teléfonos.

## El interruptor: local vs. servidor

Toda la suite habla con el lugar central a través de una pieza compartida:
[`@salones/sync`](../packages/sync/src/index.ts). Tiene un **interruptor
automático**:

| Sin datos de servidor | Con datos de servidor |
|---|---|
| Modo **LOCAL** | Modo **SERVIDOR** |
| Se sincroniza entre pestañas del mismo dispositivo. | Se sincroniza entre los teléfonos de **todos** los invitados. |
| Es el modo de la demo y de los planes **Renta / Compra**. | Es el modo del **Servicio gestionado**. |

**Las apps no cambian su código** para pasar de un modo al otro: solo se agregan
(o no) dos variables de entorno. Sin ellas, todo sigue funcionando en local.

## Estado actual

- ✅ **Cimientos** (`@salones/sync`): proveedor local (listo) + proveedor de
  servidor por Supabase (listo, se enciende con las variables).
- ✅ **Fase 1 — Muro de mensajes** conectado a los cimientos y **verificado**:
  un invitado firma en una pantalla y el mensaje aparece solo en el muro del
  anfitrión, en vivo. (Probado en modo local, entre pestañas.)
- ✅ **Fase 2 — Playlist, RSVP y Dinámicas** conectados y verificados en local:
  el invitado pide una canción / confirma su asistencia / juega la trivia y la
  pantalla del anfitrión (la del DJ, el tablero o el ranking) se actualiza sola.
- ✅ **Servidor real ENCENDIDO** (16 jul 2026): cuenta nueva de Supabase
  (organización "Suite para Salones", proyecto `suite-salones`, plan Free,
  región Canadá), tabla `items` creada y llaves puestas en los `.env.local`
  locales y en las variables de entorno de los 4 proyectos de Vercel (muro,
  playlist, rsvp, dinámicas). URL del proyecto:
  `https://cpbfisylcquuahrmyaca.supabase.co` (la llave pública se ve en
  Vercel → Settings → Environment Variables o en el panel de Supabase).
- ✅ **Fase 3 — medios**: el **Álbum** sube cada foto (comprimida a JPEG) al
  almacenamiento central (bucket `media`) y el álbum común se actualiza solo en
  todos los dispositivos. Verificado de punta a punta. El **Brindis** junta los
  videos por su propio camino (bucket `brindis` en otro proyecto de Supabase +
  fusión con Shotstack), construido aparte; a futuro puede unificarse aquí.
- ✅ **Fase 4 — eventos separados y candados**: cada evento vive en su propia
  burbuja con un código en el enlace (`?e=boda-garcia-x7k2`); los QR y enlaces
  de compartir lo propagan solos. **Generador de eventos** para el operador en
  el catálogo: `/evento` (crea el código + los enlaces listos para mandar).
  Candados: la tabla rechaza registros >600 KB y el bucket solo acepta
  imágenes/videos de hasta 25 MB. El evento `demo` sigue siendo el de las
  vitrinas públicas.
- ✅ **Fase 5 — candado del servidor**: la llave del evento viaja como
  encabezado (`x-evento`) en cada petición y las políticas del servidor la
  EXIGEN: sin la llave de un evento no se puede leer, escribir ni borrar nada,
  ni siquiera con la llave pública del proyecto. El cajón de fotos ya no se
  puede listar (cada foto solo se alcanza por su URL, que vive dentro de su
  evento). Verificado con pruebas de intruso: leer toda la tabla → vacío;
  escribir sin llave → 401; listar el cajón → vacío; cruzar burbujas → vacío.
- ⏳ **Backlog (cuando el negocio lo pida)**: cuentas o llave de anfitrión
  (para que borrar/moderar exija una llave distinta a la de los invitados),
  moderación con aprobación previa, borrar/exportar todo al cerrar un evento,
  y migrar el brindis a este proyecto.

## Cómo encender el servidor real (una sola vez)

> Esto lo haces tú porque implica crear una cuenta. Son ~5 minutos.

1. Entra a **supabase.com** y crea una cuenta gratis. Crea un **proyecto nuevo**
   (elige la región más cercana; para México, `East US` va bien).
2. En el menú lateral, abre **SQL Editor**, pega el bloque de abajo
   ("La tabla") y dale **Run**. Eso crea la tabla donde se guarda todo.
3. En **Project Settings → API**, copia estos **dos** valores (son públicos, se
   pueden poner en el código sin problema):
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public** key (un texto largo que empieza con `eyJ…`)
4. Pásame esos dos valores y yo termino de conectarlo (van en un archivo
   `.env.local` de la app y en las variables de Vercel). No cambia una sola línea
   más de código: al tenerlos, el Muro pasa solo a modo servidor.

### La tabla (pégala en el SQL Editor de Supabase)

```sql
create table if not exists items (
  evento     text not null,
  coleccion  text not null,
  id         text primary key,
  dato       jsonb not null default '{}',
  creado     timestamptz not null default now()
);

create index if not exists items_evento_coleccion_creado
  on items (evento, coleccion, creado desc);

-- Fase 5: la llave del evento se EXIGE en cada petición (encabezado x-evento,
-- que @salones/sync manda solo). Sin la llave de un evento no se puede leer,
-- escribir ni borrar nada, ni siquiera con la llave pública del proyecto.
alter table items enable row level security;
create policy "lectura por evento"       on items for select using (evento = current_setting('request.headers', true)::json->>'x-evento');
create policy "escritura por evento"     on items for insert with check (evento = current_setting('request.headers', true)::json->>'x-evento');
create policy "actualizacion por evento" on items for update using (evento = current_setting('request.headers', true)::json->>'x-evento') with check (evento = current_setting('request.headers', true)::json->>'x-evento');
create policy "borrado por evento"       on items for delete using (evento = current_setting('request.headers', true)::json->>'x-evento');

-- Candado de tamaño: ningún registro puede pasar de ~600 KB.
alter table items add constraint dato_tamano_max check (pg_column_size(dato) < 600000);

-- Fase 3/5: cajón de fotos/videos ("media") para el álbum. Es un bucket
-- público: cada foto se VE por su URL directa (que vive dentro de su evento),
-- pero NO se puede listar el cajón. Subir sí está permitido, con límites:
-- 25 MB máximo y solo imágenes/videos. Quitar una foto del álbum borra su
-- registro; el archivo queda huérfano (limpieza en el backlog).
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
update storage.buckets set file_size_limit = 26214400, allowed_mime_types = array['image/*','video/*'] where id = 'media';
create policy "subida publica media"  on storage.objects for insert with check (bucket_id = 'media');
```

### Las variables de entorno

En la app (por ejemplo `apps/muro/.env.local`, que no se sube a git) y en el
proyecto de Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## El plan por fases

| Fase | Qué incluye | Costo de servidor |
|---|---|---|
| **1 · Cimientos + Muro** | La pieza `@salones/sync` y el muro de punta a punta. **Hecho** (falta encender el servidor). | ~Gratis (texto) |
| **2 · Las "baratas"** ✅ | Reusan los cimientos: **Playlist**, **RSVP** y **Dinámicas** (ranking de la trivia). Hecho y verificado en local. | ~Gratis (texto) |
| **3 · Las de medios** ✅ | **Álbum** (fotos al bucket `media`, hecho y verificado) y **Brindis** (videos por su propio camino con Shotstack). El costo crece con el uso. | 💲 Almacenamiento |
| **4 · Para vender en serio** ✅ | Eventos con su propio código en el enlace/QR, generador del operador (`/evento` en el catálogo) y candados de tamaño/tipo. Hecho y verificado. | Bajo |
| **5 · Candado del servidor** ✅ | La llave del evento se exige del lado del servidor (encabezado `x-evento`): sin ella no se lee ni se escribe nada. Cajón de fotos sin listado público. Hecho y verificado con pruebas de intruso. | Bajo |
| **Backlog** | Cuentas/llave de anfitrión, moderación con aprobación previa, borrar/exportar al cerrar un evento, migrar el brindis. | — |

## Notas técnicas

- El proveedor de servidor usa la **API REST de Supabase** (PostgREST) con
  **sondeo cada 3 s**. Es simple y sin dependencias nuevas; más adelante se puede
  subir a "tiempo real" por websocket si hace falta.
- El evento se lee del enlace (`?e=codigo`) con `eventoActual()` de
  `@salones/sync`; sin `?e=` se usa el evento `demo` (las vitrinas). Los códigos
  se crean en el **generador del operador**: `suite-salones.vercel.app/evento`.
- **Playlist**: los votos suben con "leer y sumar". En local es exacto; con
  muchos teléfonos votando en el mismo instante podría perderse algún voto
  simultáneo (se afina en la Fase 4 con una suma atómica). Para una fiesta es de
  sobra.
- **RSVP**: la lista de invitados la administra el anfitrión en su dispositivo;
  lo que se comparte y se junta son las **respuestas**. Sincronizar también la
  lista entre varios dispositivos del anfitrión queda para la Fase 4.
- **Seguridad**: en la Fase 1 la tabla es pública. Está bien para probar y para
  eventos pequeños, pero antes de vender el servicio en serio hay que cerrarla
  por evento (Fase 4).
