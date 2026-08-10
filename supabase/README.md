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
| `0005_pagos.sql` | Crea la tabla `subscriptions` (cobros Stripe), con RLS cerrada. | Solo agrega una tabla nueva; cobros apagados. |
| `0007_branding.sql` | Crea la tabla `tenant_branding` (marca por salón) con **lectura pública** + semilla del salón demo. | Solo agrega una tabla nueva; branding = dato público. |
| `0006_pase_firmado.sql` | El **pase firmado** por evento (`emitir_pase`): la llave deja de ser un encabezado que cualquiera escribe. | Aditiva; convive con el candado viejo. |
| `0008_rls_tenant_rol.sql` | Reglas por **salón y rol** en el plano de control (quién ve y toca qué). | Cierra tablas que estaban solo con RLS activada. |
| `0009_llave_anfitrion.sql` | La **llave de anfitrión** (`events.clave_anfitrion`) y su pase: la segunda llave, la de quien organiza. | Aditiva. Su corte va en la `0014`. |
| `0010_candado_fotos.sql` | Permisos para que `media-subir` firme las subidas. | Aditiva. Su corte va en la `0014`. |
| `0011_invitados_cupos.sql` | Cupos por invitado en `guests`. | Columna nueva con default. |
| `0012_diagnostico.sql` | Tabla `app_errores` + la función que la escribe: los fallos dejan rastro. | Solo agrega una tabla nueva, cerrada. |
| `0013_media_privado.sql` | El almacén pasa a **privado**: las fotos se ven con dirección firmada que caduca. | Su corte va en la `0014`. |
| `0014_cortes_aplicados.sql` | **Los tres cortes de seguridad**, ya sin comentar. Lo que convierte la base insegura en la segura. | **Ninguno en el proyecto en vivo** (ya se corrieron a mano el 24 jul 2026); es el cierre en uno nuevo. |

| `0015_tope_subidas.sql` | Tope de subidas por pase y por evento, para que nadie llene el almacen compartido. | Aditiva. **Pendiente de correr.** |
| `0016_candado_sobrescritura.sql` | **El candado de SOBRESCRIBIR**: un invitado ya no puede vaciar, esconder ni renombrar lo que subio otro. | Cambia el comportamiento en cuanto se corre. **Pendiente de correr.** |

> ⚠️ **La `0014` no es opcional.** Sin ella, un proyecto reconstruido desde
> este repositorio nace con los tres agujeros abiertos: cualquier invitado
> puede borrar la boda entera, cualquiera puede subir al álbum de cualquier
> evento, y todas las fotos se ven por su dirección para siempre. Córrela
> **después** de desplegar las Edge Functions `media-subir` y `media-ver`:
> sin ellas, tras el corte no se pueden ni subir ni ver fotos.

> **Ojo con la lectura pública de `0007`:** es la primera tabla del plano de
> control que se puede leer con la llave pública (anon). Es a propósito: el
> branding (nombre, logo, colores) no es secreto. La **escritura** sigue cerrada
> (solo el rol de servicio); las demás tablas del plano de control siguen cerradas.

## Cómo aplicarlas

**Opción simple (la que usamos): SQL Editor del panel de Supabase.**
1. Entra a [supabase.com](https://supabase.com) → proyecto `suite-salones`.
2. Menú **SQL Editor** → **New query**.
3. Pega el contenido de cada archivo **en orden** (0001 → 0002 → 0003 → 0005 →
   0006 → 0007 → 0008 → 0009 → 0010 → 0011 → 0012 → 0013 → 0014 → 0015 → 0016) y dale **Run**.
   ⚠️ Antes de la `0014`, despliega las Edge Functions.
4. En el proyecto que ya está en vivo, la `0001` ya está aplicada (no hace daño
   volver a correrla: es idempotente). Lo nuevo de esta etapa es la `0002` y la `0003`.

> Regla de oro: estas migraciones son **aditivas**. Aun así, aplícalas cuando las
> 5 apps conectadas (muro, playlist, rsvp, dinámicas, álbum) estén desplegadas, y
> verifica después que siguen funcionando (ver `docs/FASE-0-1-PLATAFORMA.md`).

**Opción avanzada (a futuro): CLI de Supabase** (`supabase db push`). Requiere
instalar la CLI y enlazar el proyecto; por ahora no es necesario.
