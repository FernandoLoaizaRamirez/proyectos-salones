# Fase 0 + Fase 1 — La columna vertebral de la plataforma

> **Qué es esto:** el registro de cómo la suite pasa de "13 apps + backend
> colectivo" a una **plataforma SaaS multi-cliente**. Es la puesta en práctica de
> la hoja de ruta de [`EVALUACION-VISION-PLATAFORMA.md`](EVALUACION-VISION-PLATAFORMA.md).
> Complementa a [`SERVICIO-GESTIONADO.md`](SERVICIO-GESTIONADO.md) (el backend que
> ya existía) y a [`REVISION-TECNICA.md`](REVISION-TECNICA.md) (estado y deuda).

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

## FASE 1 — Identidad + tenencia + cobros · **planeado** (seguridad al final)

1. **Supabase Auth para el staff** — login por correo en `apps/catalogo`;
   `tenant_id` + `rol` viajan en el token vía `app_metadata` (funciona en Free).
2. **RLS por tenant + rol** (deny-by-default) en las tablas de negocio.
3. **Alta de eventos autenticada** — el generador `/evento` exige login e inserta
   en `events`; el contrato de enlaces `?e=...` queda **idéntico**.
4. **🔒 Migración de seguridad `x-evento` → token firmado** (el paso final y más
   cuidado): una Edge Function cambia `?e=codigo` por un **JWT de corta duración**
   por evento; el proveedor de servidor de `@salones/sync` lo usa por dentro (sin
   cambiar su interfaz), conviviendo con el candado viejo hasta apagarlo con la
   secuencia compatible. El invitado por enlace **no nota ningún cambio**.
5. **Cobros con Stripe** — plomería lista pero apagada detrás de bandera
   (`PAGOS_ACTIVOS=false`); el webhook escribirá los entitlements cuando se encienda.
6. **Suite de tests de aislamiento en CI** — que un cliente/evento no pueda leer
   datos de otro; token vencido y `x-evento` forjado rechazados. **Antes** de meter
   cualquier cliente real.
