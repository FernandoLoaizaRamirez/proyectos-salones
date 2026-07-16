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
- ⏳ **Pendiente**: Fase 3 (Álbum y Brindis, medios con almacenamiento) y
  Fase 4 (eventos con su propio QR, moderación, cerrar el acceso público).

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

-- Fase 1: la tabla es pública (cualquiera con el QR del evento puede escribir y
-- leer). Es suficiente para un muro o una playlist de fiesta. En la Fase 4 se
-- restringe el acceso por evento y con moderación.
alter table items enable row level security;
create policy "lectura publica"       on items for select using (true);
create policy "escritura publica"     on items for insert with check (true);
create policy "actualizacion publica" on items for update using (true) with check (true);
create policy "borrado publico"       on items for delete using (true);
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
| **3 · Las de medios** | Álbum (fotos) y Brindis (video). Aquí sí hay costo mensual que crece con el uso. | 💲 Almacenamiento |
| **4 · Para vender en serio** | Tu cuenta para varios eventos, eventos con su propio código/QR, moderación (esconder un mensaje antes de proyectar), borrar/exportar al terminar, y cerrar el acceso público de la tabla. | Bajo |

## Notas técnicas

- El proveedor de servidor usa la **API REST de Supabase** (PostgREST) con
  **sondeo cada 3 s**. Es simple y sin dependencias nuevas; más adelante se puede
  subir a "tiempo real" por websocket si hace falta.
- En la Fase 1/2 hay **un solo evento** (`EVENTO_ID = "demo"`). La creación de
  eventos con su propio código/QR es parte de la Fase 4.
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
