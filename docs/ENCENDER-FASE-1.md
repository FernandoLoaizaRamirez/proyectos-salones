# Encender la Fase 1 en Supabase — checklist único

> **Qué es esto:** la guía ordenada para **poner en vivo**, en tu proyecto de
> Supabase, todo lo que ya está construido en el código de la Fase 1 (identidad
> del staff, aislamiento por salón, alta de eventos autenticada, panel con
> salón/rol). El código ya está en `main`; falta **encenderlo** aquí. Hazlo en
> **este orden** — hay una dependencia importante entre pasos.
>
> Todo es **aditivo y reversible**: no toca `items`, ni `@salones/sync`, ni las 5
> apps en vivo (muro, playlist, rsvp, dinámicas, álbum). Los invitados no notan
> ningún cambio.

## Lo que ya está vivo (Fase 0)

Las migraciones `0001`, `0002`, `0003` ya están aplicadas en producción (tablas del
plano de control + columnas de `items`). Este checklist es lo que sigue.

## Lo que vas a encender

| Paso | Qué | Archivo |
|---|---|---|
| 1 | Tabla `subscriptions` (cobros, apagados) | `supabase/migrations/0005_pagos.sql` |
| 2 | Tabla `tenant_branding` (branding por salón) | `supabase/migrations/0007_branding.sql` |
| 3 | Ligar tu usuario a tu salón (identidad en el token) | `apps/catalogo/scripts/vincular-staff.mjs` |
| 4 | RLS por salón/rol (el candado de aislamiento) | `supabase/migrations/0008_rls_tenant_rol.sql` |
| 5 | Verificación de punta a punta | — |
| 6 | (Aparte, delicado) Token firmado del invitado | PR #4 + `docs/MIGRACION-TOKEN-FIRMADO.md` |

> **⚠️ El orden importa:** la migración **0008** crea una política sobre la tabla
> `subscriptions`, que **nace en la 0005**. Si aplicas la 0008 sin la 0005, dará
> error ("relation subscriptions does not exist"). Por eso: **0005 → 0007 →
> vincular → 0008**.

## Antes de empezar necesitas

- Acceso al **SQL Editor** de tu proyecto Supabase (para los pasos 1, 2, 4).
- Tu **llave service-role** (Project Settings → API → `service_role`, secreta) para
  el paso 3. Es secreta: no la compartas ni la subas al repo.
- El repo clonado en tu compu para correr el script del paso 3.

Todas las migraciones son **idempotentes**: si una ya estaba aplicada, correrla de
nuevo no hace daño.

---

## Paso 1 — Aplicar `0005` (tabla de suscripciones)

- **Por qué primero:** la 0008 (paso 4) apoya una política en esta tabla.
- **Cómo:** SQL Editor → pega el contenido de
  [`supabase/migrations/0005_pagos.sql`](../supabase/migrations/0005_pagos.sql) → **Run**.
- **Verifica:** en Table Editor aparece la tabla `subscriptions` (vacía, con RLS
  activada). No cobra nada: los cobros siguen apagados (`PAGOS_ACTIVOS=false`).

## Paso 2 — Aplicar `0007` (branding por salón)

- **Cómo:** SQL Editor → pega
  [`supabase/migrations/0007_branding.sql`](../supabase/migrations/0007_branding.sql) → **Run**.
- **Verifica:** aparece la tabla `tenant_branding`. (Su lectura es pública a
  propósito — el logo y los colores del salón no son secretos.)

## Paso 3 — Ligar tu usuario a tu salón (identidad en el token)

- **Qué hace:** escribe la fila en `tenant_members` y graba `tenant_id` + `rol` en
  tu `app_metadata`, para que viajen dentro de tu token de sesión.
- **Cómo:** en la carpeta del repo, corre (con **tus** valores):

  ```bash
  SUPABASE_URL=https://<tu-proyecto>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<tu-llave-service-role> \
  node apps/catalogo/scripts/vincular-staff.mjs --user=29e84a6d-e9f1-4ff4-8cd5-73632f7716dc
  ```

  (Por defecto te liga al **salón demo** con rol **owner**. El UID es el de tu
  usuario del staff; cámbialo si usas otro.)
- **Verifica:** el script imprime al final tu `tenant_id`, `rol` y el nombre del
  salón. Si lo ves, quedó grabado. **Cierra sesión y vuelve a entrar** para que tu
  token se refresque con la identidad nueva.

## Paso 4 — Aplicar `0008` (RLS por salón/rol)

- **Qué hace:** abre las tablas del plano de control al staff autenticado, cada uno
  **solo a lo de su salón**. Es el candado de aislamiento.
- **Cómo:** SQL Editor → pega
  [`supabase/migrations/0008_rls_tenant_rol.sql`](../supabase/migrations/0008_rls_tenant_rol.sql) → **Run**.
- **Verifica** (detalle en [`docs/RLS-TENANT-ROL.md`](RLS-TENANT-ROL.md)):
  1. **El público sigue cerrado:** con las variables `NEXT_PUBLIC_SUPABASE_URL` /
     `NEXT_PUBLIC_SUPABASE_ANON_KEY` apuntando a tu Supabase, corre `pnpm test`. Las
     suites de `tests/aislamiento/` deben quedar **verdes** (nada se filtró al
     público).
  2. **Tú SÍ ves lo tuyo:** ver el paso 5.

## Paso 5 — Verificación de punta a punta

Con sesión iniciada (tras el paso 3):

1. **Panel** (`/panel`): junto a tu correo aparecen los chips de **tu salón** (con
   su nombre real) y **tu rol** (Dueño). Si el nombre no aparece, revisa que
   aplicaste la 0008 y que refrescaste la sesión.
2. **Alta de evento** (`/evento`): crea un evento; se guarda en `events` de tu
   salón y salen sus enlaces `?e=`. Ábrelos: el invitado entra igual que siempre.
3. **Aislamiento** (opcional, si tienes un 2º usuario en otro salón): desde esa
   cuenta no se ve el evento del salón anterior.

Si algo no cuadra, cada migración trae su **rollback** comentado al final del
propio archivo `.sql` (deja las tablas como estaban). La 0008 además lo documenta
en [`docs/RLS-TENANT-ROL.md`](RLS-TENANT-ROL.md).

---

## Paso 6 — (Aparte, y lo más delicado) Token firmado del invitado

Esto es un **track separado** y el más cuidadoso (cambia el candado del invitado de
`x-evento` a un pase firmado). **No** forma parte de los pasos 1–5 y tiene su propio
runbook por etapas. Cuando quieras hacerlo:

1. Fusiona el **PR #4** (`feat/token-firmado`).
2. Sigue `docs/MIGRACION-TOKEN-FIRMADO.md` (desplegar la Edge Function `token` +
   su secret → aplicar la migración `0006` de convivencia → verificar → hacer el
   "corte" en un rato tranquilo). Es reversible.

Déjalo para el final, cuando los pasos 1–5 estén verificados.

---

## Resumen de seguridad

- Todo lo de los pasos 1–5 es **aditivo**: crea tablas/políticas nuevas; no cambia
  datos existentes ni la forma en que trabajan las apps en vivo.
- El invitado usa la llave pública (rol `anon`) sobre `items` con el candado
  `x-evento`; **nada de esto lo toca**.
- Cada migración es **idempotente** (re-aplicar es seguro) y **reversible** (rollback
  al final de su `.sql`).
