# Base de datos (Supabase)

Aquí vive el esquema del backend bajo **control de versiones**. Hasta ahora, la
estructura de la base de datos solo existía dentro de la documentación y en el
proyecto Supabase en vivo; estos archivos la hacen reproducible y auditable.

Proyecto principal: **`cpbfisylcquuahrmyaca`** (`https://cpbfisylcquuahrmyaca.supabase.co`).

## Migraciones (`migrations/`)

Se aplican **en orden**. Cada una es idempotente/aditiva (segura de correr):

| Archivo | Qué hace | ¿Toca producción? |
|---|---|---|
| `0001_estado_actual.sql` | Reproduce lo que YA existe: tabla `items`, candado `x-evento` (Fase 5), bucket `media`. | No cambia nada nuevo. |
| `0002_plano_de_control.sql` | Crea las tablas nuevas de la plataforma (tenants, eventos, planes, funciones, entitlements…) + su semilla. | Solo agrega tablas nuevas. |
| `0003_items_multitenant.sql` | Agrega a `items` las columnas `tenant_id`, `module`, `created_by` (aditivo). | Columnas nuevas con default; no rompe las apps. |

## Cómo aplicarlas

**Opción simple (la que usamos): SQL Editor del panel de Supabase.**
1. Entra a [supabase.com](https://supabase.com) → proyecto `suite-salones`.
2. Menú **SQL Editor** → **New query**.
3. Pega el contenido de cada archivo **en orden** (0001, luego 0002, luego 0003) y
   dale **Run**.
4. En el proyecto que ya está en vivo, la `0001` ya está aplicada (no hace daño
   volver a correrla: es idempotente). Lo nuevo de esta etapa es la `0002` y la `0003`.

> Regla de oro: estas migraciones son **aditivas**. Aun así, aplícalas cuando las
> 5 apps conectadas (muro, playlist, rsvp, dinámicas, álbum) estén desplegadas, y
> verifica después que siguen funcionando (ver `docs/FASE-0-1-PLATAFORMA.md`).

**Opción avanzada (a futuro): CLI de Supabase** (`supabase db push`). Requiere
instalar la CLI y enlazar el proyecto; por ahora no es necesario.
