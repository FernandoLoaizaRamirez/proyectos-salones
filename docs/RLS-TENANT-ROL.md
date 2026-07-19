# RLS por salón/rol (migración 0008) — runbook

> **Qué es esto:** el candado que hace VALER la identidad del staff. Después de
> aplicarlo, cada salón (autenticado) ve y gestiona **solo sus propios datos** en
> las tablas del plano de control. Es el paso de seguridad que va **antes** de
> meter cualquier cliente real. Complementa a [`FASE-0-1-PLATAFORMA.md`](FASE-0-1-PLATAFORMA.md)
> y al paso 1.1b (`apps/catalogo/scripts/vincular-staff.mjs`).

## En una frase

Las tablas `tenants`, `tenant_members`, `events`, `guests`, `tenant_entitlements`,
`event_overrides` y `subscriptions` nacieron **cerradas** (RLS activada, sin
políticas = solo el backend con service-role las tocaba). La 0008 les agrega
políticas para que el **staff autenticado** vea/gestione **lo de su salón**,
leyendo `tenant_id` y `rol` desde su token (`app_metadata`).

## Requisito previo

Haber corrido el script de alta del **paso 1.1b** para al menos un usuario, de
modo que su token lleve `app_metadata.tenant_id` (+ `rol`). Sin ese claim, la RLS
no muestra nada (deny-by-default) — que es justo lo correcto.

## Qué hace exactamente

- **Lectura (SELECT):** el staff ve las filas de **su** salón (tenant que lleva en
  el token). `guests` y `event_overrides` se acotan por el salón dueño del evento.
- **Escritura:** `events` (y sus `guests`) las gestiona cualquier staff del salón;
  `tenants`, `tenant_members` y `event_overrides` solo **owner/admin**.
- **Facturación:** `tenant_entitlements` y `subscriptions` son **solo lectura**
  para el staff; escribirlas sigue siendo exclusivo del service-role (el webhook).
- **`plans` / `features` / `plan_features`** quedan **cerradas** a propósito
  (catálogo global; la app las trae de sus propios datos).

## Por qué es seguro (no rompe producción)

- **Aditiva:** solo agrega funciones y políticas; no cambia esquema ni datos.
- **deny-by-default y `to authenticated`:** el invitado usa la llave **anónima**
  (rol `anon`, sin `tenant_id`) — e incluso con el pase firmado sigue siendo
  `role=anon`. Estas políticas son `to authenticated`, así que al invitado **no le
  aplican**: no ve nada de estas tablas.
- **Las apps en vivo no tocan estas tablas:** muro, playlist, rsvp, dinámicas y
  álbum trabajan sobre `items` con el candado `x-evento`. La 0008 **no toca
  `items`** ni el candado del invitado.
- **Reversible:** el rollback (abajo) deja todo como estaba en segundos.

## Cómo aplicar

1. En el proyecto de Supabase → **SQL Editor**.
2. Pegar el contenido de [`supabase/migrations/0008_rls_tenant_rol.sql`](../supabase/migrations/0008_rls_tenant_rol.sql)
   y **Run**. Es idempotente (se puede correr de nuevo sin daño).

## Cómo verificar

**1) El público sigue sin ver nada (regresión automática).** Con las variables
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` apuntando al Supabase
real:

```
pnpm test
```

Las suites de `tests/aislamiento/` (incluida `rls-tenant.test.ts`) deben quedar en
**verde**: con la llave pública, esas 7 tablas siguen devolviendo lista vacía. Si
alguna dejara de estar cerrada, la prueba lo cacha → hacer rollback y revisar.

**2) El staff SÍ ve lo suyo (manual).** Iniciar sesión en el panel como tu usuario
del staff (el que pasó por el paso 1.1b) y confirmar la identidad:

```
# con tu token de sesión (Authorization: Bearer <access_token>)
GET /api/yo   →   { email, tenantId, rol, vinculado: true }
```

Con ese token, una lectura de `events` filtrada por tu salón devuelve tus eventos;
con la **llave pública anónima** (sin sesión) esa misma lectura devuelve vacío.

## Rollback (si algo no cuadra)

Deja las tablas otra vez cerradas (solo service-role). Está copiado al final de
[`0008_rls_tenant_rol.sql`](../supabase/migrations/0008_rls_tenant_rol.sql): son
los `drop policy if exists …` + `drop function if exists public.app_tenant_id()` /
`public.app_rol()`. Pegar en el SQL Editor y **Run**.

## Después de esto

Queda habilitado el **alta de eventos autenticada** en `/evento` (el staff inserta
en `events` acotado a su salón, con el mismo contrato de enlaces `?e=`), que es el
siguiente paso natural de la Fase 1.
