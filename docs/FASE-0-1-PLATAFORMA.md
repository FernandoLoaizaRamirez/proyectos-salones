# Fase 0 + Fase 1 — La columna vertebral de la plataforma

> **Qué es esto:** el registro de cómo la suite pasa de "apps sueltas + backend
> colectivo" a una **plataforma SaaS multi-cliente**. Es la puesta en práctica de
> la hoja de ruta de [`EVALUACION-VISION-PLATAFORMA.md`](EVALUACION-VISION-PLATAFORMA.md).
> Complementa a [`SERVICIO-GESTIONADO.md`](SERVICIO-GESTIONADO.md) (el backend que
> ya existía) y a [`REVISION-TECNICA.md`](REVISION-TECNICA.md) (estado y deuda).
>
> **Estado al 20 jul 2026 (medido contra `main`):** la **Fase 0 está completa** y
> de la **Fase 1 hay 5 de 6 pasos hechos y fusionados**. El único que falta es el
> paso 4 (el token firmado), que está construido pero sigue en el PR #4. El repo
> tiene hoy **14 carpetas en `apps/`**.

## Por qué

Hoy el candado de seguridad es un **código en el enlace que el propio cliente
controla** (`?e=...` → encabezado `x-evento`): sirve para demos, no para vender
contratos ni para garantizar que un cliente no vea los datos de otro. Y no existe
el "salón" como dueño de sus datos, ni cuentas, ni planes/funciones vendibles.
Estas dos fases construyen ese esqueleto **evolucionando lo que ya hay, sin
reescribir y sin romper las 5 apps en producción** (muro, playlist, rsvp,
dinámicas, álbum).

## Decisiones de negocio (acordadas con Fernando)

- **Cobros (Stripe):** la plomería se deja lista pero **apagada** detrás de una
  bandera. No se cobra aún; el día que se quiera vender, se enciende.
- **Dominios por cliente:** **subdominios de la marca** (`salon.suite-salones.app`).
  El campo `slug` ya queda reservado; la construcción real es la Fase 3.
- **Supabase:** se sigue en **plan gratis**. Todo el diseño funciona en Free (los
  datos de identidad viajan en `app_metadata` del token, sin funciones de pago).

## Regla de oro (no romper producción)

Se reutiliza la **secuencia de despliegue compatible** que ya se probó en la
Fase 5 del servicio gestionado:

> (1) publicar primero el código que ya manda/acepta lo nuevo (compatible con lo
> viejo) → (2) esperar a que **las 5 apps** estén desplegadas en Vercel → (3)
> recién entonces cambiar las políticas del servidor → (4) verificar → (5) apagar
> lo viejo.

Y no se toca la forma de la interfaz `ProveedorSync` de
[`@salones/sync`](../packages/sync/src/index.ts): es la costura que mantiene todo
compatible. Toda la evolución (token firmado, realtime a futuro) se hace *por
dentro* del proveedor de servidor.

---

## FASE 0 — Plano de control · **HECHO** (aditivo)

Todo lo de la Fase 0 es aditivo: crea tablas nuevas y agrega columnas con valor
por defecto. **No renombra `items`** (eso rompería el endpoint que usan las apps;
se hace en la Fase 1 con la secuencia segura).

### Lo que se agregó

1. **Esquema bajo control de versiones** — carpeta [`supabase/migrations/`](../supabase/migrations/):
   - `0001_estado_actual.sql` — foto de lo que ya existía (idempotente).
   - `0002_plano_de_control.sql` — tablas nuevas + semilla.
   - `0003_items_multitenant.sql` — columnas nuevas en `items`.

2. **Tablas nuevas del plano de control** (migración `0002`):

   | Tabla | Para qué |
   |---|---|
   | `tenants` | El salón/cliente dueño. Tiene `slug` (subdominio futuro), `plan_id`, `estado`. |
   | `tenant_members` | Usuarios del staff + su rol (`owner`/`admin`/`staff`). Se enlaza a Auth en la Fase 1. |
   | `events` | Eventos reales; `codigo` = el `?e=` del enlace. Alta autenticada en la Fase 1. |
   | `guests` | Invitados tipados (se usa a fondo en fases siguientes). |
   | `features` | Catálogo de funciones vendibles. |
   | `plans` | Paquetes de funciones (`gestionado`/`renta`/`compra`). |
   | `plan_features` | Qué funciones trae cada plan. |
   | `tenant_entitlements` | Encender/apagar una función para un cliente. |
   | `event_overrides` | Encender/apagar una función para un evento puntual. |

   Nacen con RLS activada y **sin políticas** = cerradas (solo el backend las
   toca), hasta que la Fase 1 agregue las políticas por tenant/rol.

3. **`items` gana columnas** (migración `0003`): `tenant_id` (default = tenant
   demo), `module` (derivado de `coleccion` por un trigger), `created_by`. El
   candado `x-evento` **no se toca**; las apps piden `select=id,dato`, así que ni
   se enteran de las columnas nuevas.

4. **`@salones/core` protagonista** — [`packages/core/src/`](../packages/core/src/):
   - `tenencia.ts`: `Tenant`, `User`, `Role`, `TenantMember`.
   - `entitlements.ts`: `Feature`, `Plan`, y la función **pura**
     `resolveEntitlements(plan, overridesTenant, overridesEvento)` — corre igual
     en el cliente y en el servidor. El servidor la usa para *hacer valer* los
     límites; el cliente, para mostrar/ocultar.

5. **Pruebas + CI** — `vitest` con 7 casos de `resolveEntitlements`, y
   [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (instala + corre
   pruebas en cada push/PR). *El `lint` queda fuera del CI por ahora porque las
   apps usan `next lint`, comando que Next.js 16 eliminó (deuda previa a migrar).*

   > **Al día:** aquellos 7 casos fueron la semilla. Hoy `main` corre **58
   > pruebas**: 19 de `resolveEntitlements` (7 + 12 de casos borde), 19 del
   > webhook de Stripe y 20 de aislamiento contra el Supabase real. Estas
   > últimas **se saltan solas** si faltan las variables públicas de Supabase,
   > y en CI se inyectan desde los secrets del repo.

### Cómo aplicar las migraciones (en Supabase)

En el proyecto `cpbfisylcquuahrmyaca` → **SQL Editor** → pegar y **Run**, en orden:
`0001` (ya aplicada en el proyecto vivo; es idempotente), luego **`0002`** y
**`0003`** (lo nuevo de esta fase). Todo es aditivo: las apps siguen funcionando.

### Cómo se verifica

- `pnpm test` → los 7 casos de `resolveEntitlements` en verde.
- Compilar una app conectada (p. ej. `pnpm --filter muro build`) → el `@salones/core`
  evolucionado no rompe nada.
- Tras aplicar las migraciones: las 5 apps siguen leyendo/escribiendo el evento
  `demo`; en el editor de Supabase aparecen las tablas nuevas con su semilla.

---

## FASE 1 — Identidad + tenencia + cobros · **5 de 6 hechos** (seguridad al final)

| # | Paso | Estado |
|---|---|---|
| 1 | Supabase Auth para el staff | ✅ **hecho** |
| 2 | RLS por tenant + rol | ✅ **hecho** (migración `0008`) |
| 3 | Alta de eventos autenticada | ✅ **hecho** |
| 4 | 🔒 `x-evento` → pase firmado | 🚧 **construido, sin fusionar** (PR #4) |
| 5 | Cobros con Stripe, apagados | ✅ **hecho** |
| 6 | Tests de aislamiento en CI | ✅ **hecho** |

1. **Supabase Auth para el staff** · ✅ — login por correo en `apps/catalogo`;
   `tenant_id` + `rol` viajan en el token vía `app_metadata` (funciona en Free).
   El panel muestra el salón y el rol de quien entró.
2. **RLS por tenant + rol** (deny-by-default) en las tablas de negocio · ✅ —
   migración `0008_rls_tenant_rol.sql`. Detalle en
   [`RLS-TENANT-ROL.md`](RLS-TENANT-ROL.md). *Ojo al aplicarla: **la `0005` va
   antes**, porque la `0008` nombra la tabla `subscriptions` que crea aquella; sin
   ella la `0008` falla a mitad.*
3. **Alta de eventos autenticada** · ✅ — el generador `/evento` exige login e
   inserta en `events`; el contrato de enlaces `?e=...` quedó **idéntico**.
4. **🔒 Migración de seguridad `x-evento` → token firmado** · 🚧 **el único que
   falta.** Construido en la rama `feat/token-firmado` (**PR #4**), sin fusionar.

   > **Cambió respecto a lo planeado.** El primer intento era una Edge Function
   > emitiendo un **JWT HS256**, y **no funcionó**: el proyecto migró a llaves
   > asimétricas ES256 y PostgREST rechaza HS256 (`PGRST301: No suitable key or
   > wrong key type`). La solución que sí funciona **emite y verifica el pase
   > dentro de Postgres** (migración `0006`, funciones `emitir_pase` /
   > `evento_del_pase` con pgcrypto); el secreto se genera en la base y nunca
   > sale de ahí. El pase caduca a los 30 min y viaja como `x-evento-pase`.
   > La interfaz de `ProveedorSync` **no cambió**, y el invitado por enlace no
   > nota nada. Runbook: `MIGRACION-TOKEN-FIRMADO.md` (en la rama del PR).
   >
   > ⛔ **Quedan restos del intento fallido.** Según la lista de encendido, que
   > midió el proyecto de Supabase el 20 jul 2026, la Edge Function `token` y el
   > secreto `EVENT_TOKEN_JWT_SECRET` seguían vivos y hay que borrarlos. *(Esto
   > no se puede comprobar desde el repo: esa función no está en ninguna rama,
   > solo desplegada.)*
   >
   > 🚨 **No corras el "BLOQUE FINAL" de la `0006`.** Hace solo la mitad del
   > trabajo: dejaría bien el candado del pase, pero **cualquier invitado
   > seguiría pudiendo borrar la boda entera**. Lo sustituye el bloque final de
   > la `0009` (llave de anfitrión, PR #17).
5. **Cobros con Stripe** · ✅ — plomería lista pero apagada detrás de bandera
   (`PAGOS_ACTIVOS=false`) en `@salones/payments` + migración `0005_pagos.sql`;
   el webhook escribirá los entitlements cuando se encienda. 19 pruebas cubren su
   lógica pura.
6. **Suite de tests de aislamiento en CI** · ✅ — `tests/aislamiento/`: que un
   cliente/evento no pueda leer datos de otro, y que la `0008` no filtrara nada a
   la llave pública. Corren contra el Supabase real y se saltan solas sin
   credenciales.

---

## Lo que vino después de la Fase 1

Para que este documento no se lea como si ahí se hubiera parado todo:

- **Fase 2 — portal del invitado** · ✅ fusionada. `apps/portal`: un solo enlace
  desde el que los 5 módulos (muro, playlist, RSVP, dinámicas, álbum) abren
  **por dentro**. Ver [`PORTAL-EVENTO-CONFIG.md`](PORTAL-EVENTO-CONFIG.md).
- **Fase 2b — panel del anfitrión** · 🚧 a medias. `/eventos` y el tablero de cada
  evento ya están; de las 5 pantallas, **2 viven dentro** (confirmaciones y muro
  proyectado) y **3 siguen siendo puentes** a su app suelta (DJ, juegos, álbum),
  en los PRs **#22 → #23 → #24**, que se fusionan **en ese orden**.
- **Fase 3 — branding en runtime** · ✅ la semilla está fusionada (migración
  `0007_branding.sql` + `@salones/ui`). Lo que falta de la Fase 3 son los
  **subdominios por salón**; hoy solo está reservado el campo `slug`.
- **Seguridad y operación** · 🚧 construido, sin fusionar (**PR #17**): llave de
  anfitrión (`0009`), candado de subida de fotos (`0010`), fotos privadas
  (`0013`), diagnóstico (`0012`), capa legal y cierre de evento.

> **Para encender todo esto en Supabase** hay una sola lista maestra, con el
> estado real medido y el orden de los pasos peligrosos: `docs/ENCENDER-TODO.md`,
> en la rama del **PR #17**.
