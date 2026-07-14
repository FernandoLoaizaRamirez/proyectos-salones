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
- ⏳ **Pendiente**: encender el servidor real (necesita tu cuenta de Supabase,
  ver abajo) y conectar las demás apps (Fases 2–4).

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
| **2 · Las "baratas"** | Reusan los cimientos: Playlist, RSVP, ranking de Dinámicas. | ~Gratis (texto) |
| **3 · Las de medios** | Álbum (fotos) y Brindis (video). Aquí sí hay costo mensual que crece con el uso. | 💲 Almacenamiento |
| **4 · Para vender en serio** | Tu cuenta para varios eventos, eventos con su propio código/QR, moderación (esconder un mensaje antes de proyectar), borrar/exportar al terminar, y cerrar el acceso público de la tabla. | Bajo |

## Notas técnicas

- El proveedor de servidor usa la **API REST de Supabase** (PostgREST) con
  **sondeo cada 3 s**. Es simple y sin dependencias nuevas; más adelante se puede
  subir a "tiempo real" por websocket si hace falta.
- En la Fase 1 hay **un solo evento** (`EVENTO_ID = "demo"`). La creación de
  eventos con su propio código/QR es parte de la Fase 4.
- **Seguridad**: en la Fase 1 la tabla es pública. Está bien para probar y para
  eventos pequeños, pero antes de vender el servicio en serio hay que cerrarla
  por evento (Fase 4).
