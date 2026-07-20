# Revisión técnica — Servicio gestionado (Suite para Salones)

> **Para:** el programador que revisa.
> **Qué se pide:** una segunda opinión sobre las decisiones de arquitectura, la
> seguridad y la deuda técnica de lo construido en esta ronda (el "servicio
> gestionado"). Al final hay una sección de **limitaciones conocidas** y otra de
> **preguntas concretas** — ese es el foco de la revisión.
> **Qué NO se pide todavía:** reescribir nada. Primero queremos saber qué priorizar.

El documento funcional/de negocio vive en [`SERVICIO-GESTIONADO.md`](SERVICIO-GESTIONADO.md).
Este es el complemento técnico.

---

> ## ⚠️ Léase primero: este documento es de una ronda anterior
>
> Se escribió al cerrar el **servicio gestionado** (fases 1 a 5) y describe **ese**
> momento. Después vinieron la plataforma multi-cliente (Fases 0, 1, 2 y 2b) y
> varias rondas de seguridad. **Revisado el 20 jul 2026** contra `main`: se
> corrigieron los datos que ya eran falsos y se marcó qué deuda de la §9 sigue
> viva. Lo que no lleva nota sigue siendo válido.
>
> **Los tres cambios grandes desde entonces:**
>
> 1. **Sí hay pruebas automatizadas.** La §8 decía que no; hoy son **58** con CI
>    en cada push y PR. La §8 ya está corregida.
> 2. **La deuda #2 (AuthZ) y la #3 (secreto de evento) están resueltas en
>    código**, pero **en PRs sin fusionar** (#4 y #17). Siguen abiertas en
>    producción.
> 3. **Ya no son 12 apps ni 4 paquetes**: son **14 apps** y **5 paquetes**.
>
> El registro de lo construido después vive en
> [`FASE-0-1-PLATAFORMA.md`](FASE-0-1-PLATAFORMA.md).

---

## 1. Contexto en una frase

Suite de apps web para eventos (bodas, XV, corporativos) — **12 vendibles cuando
se escribió esto; hoy `apps/` tiene 14 carpetas** (las 12 + el catálogo + el
portal del invitado). Cada app se despliega sola en Vercel y funciona por sí
misma. Esta ronda agregó un **backend compartido opcional** (`@salones/sync` +
Supabase) que permite juntar en vivo el contenido que mandan muchos teléfonos
(mensajes, canciones, RSVP, ranking de trivia, fotos), sin reescribir las apps.

El diseño clave es un **interruptor por variables de entorno**: sin credenciales
de Supabase, las apps corren en "modo local" (como antes); con credenciales,
pasan a "modo servidor". Mismo código. Esto mapea al modelo de negocio de 3
planes (Compra/Renta = local, Gestionado = servidor).

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js **16.2.10** (App Router, Turbopack), React **19.2.7** |
| Lenguaje | TypeScript **6.0.3** (strict, vía config compartida) |
| Estilos | Tailwind CSS **v4** (`@tailwindcss/postcss`), tokens en CSS variables (OKLCH) |
| Monorepo | pnpm workspaces (**pnpm 11.9.0**) + **Turborepo 2.10.2** |
| UI | `class-variance-authority`, `tailwind-merge`, `next-themes`, `lucide-react`, `qrcode.react` |
| Validación | `zod` (solo en `@salones/core`, tipos de dominio) |
| Hosting | **Vercel** (1 proyecto por app, deploy automático desde `main`) |
| Backend | **Supabase** (Postgres + Storage) — plan Free |
| Video (brindis) | Supabase Storage **aparte** + **Shotstack** (render en la nube) |

No hay dependencias nuevas de runtime en `@salones/sync`: habla con Supabase por
**REST (PostgREST) y fetch nativo**, no con el SDK `@supabase/supabase-js`.
(Excepción: la app `brindis`, que sí usa el SDK — ver §7 y §9.)

---

## 3. Estructura del monorepo

```
packages/
  core/     @salones/core   — vocabulario de dominio (Zod: Evento, Invitado, Mesa, AppMode…)
  ui/       @salones/ui      — design system (Button, Card, tokens OKLCH, theme provider)
  config/   @salones/config  — tsconfig y prettier compartidos
  sync/     @salones/sync    — ★ NUEVO: el "lugar central" (foco de esta revisión)
apps/
  sitio-salon, album-fotos, invitaciones, rsvp, pases-qr, mesas, muro,
  playlist, photobooth, mi-mesa, dinamicas, brindis, catalogo   (12 apps)
```

> **Al día (20 jul 2026).** Se sumaron un paquete y una app, y hay directorios
> nuevos en la raíz:
>
> ```
> packages/payments/   @salones/payments — Stripe: planes + webhook puro (APAGADO por bandera)
> apps/portal/         Portal del invitado (Fase 2): los 5 módulos abren por dentro
> supabase/            migrations/*.sql + functions/ (Edge Functions en Deno)
> tests/aislamiento/   pruebas adversariales contra el Supabase real
> .github/workflows/   ci.yml
> ```
>
> Son **5 paquetes y 14 apps**. La convención de "código fuente TS sin build" no
> cambió: `@salones/payments` la sigue igual, con la parte que usa el SDK de
> Stripe como valor aislada en `@salones/payments/servidor` para que el SDK de
> Node no entre en bundles del navegador.

**Convención de paquetes compartidos:** se consumen como **código fuente TS**
(`"exports": { ".": "./src/index.ts" }`, `"type": "module"`), sin build propio.
Cada app los transpila con `transpilePackages: ["@salones/ui","@salones/core","@salones/sync"]`
en `next.config.mjs`. Simple, pero implica que los paquetes **no se typechequean
ni se publican de forma independiente** (ver deuda #14).

---

## 4. Arquitectura de `@salones/sync` (el núcleo)

Un único archivo: [`packages/sync/src/index.ts`](../packages/sync/src/index.ts) (~320 líneas).
Patrón **provider / strategy** detrás de una interfaz común:

```ts
export type ItemSync = { id: string; [clave: string]: unknown };

export interface ProveedorSync {
  readonly nombre: "local" | "servidor";
  listar<T extends ItemSync>(evento: string, coleccion: string): Promise<T[]>;
  guardar<T extends ItemSync>(evento: string, coleccion: string, item: T): Promise<void>;
  eliminar(evento: string, coleccion: string, id: string): Promise<void>;
  suscribir<T extends ItemSync>(evento: string, coleccion: string, cb: (items: T[]) => void): () => void;
  subirArchivo(evento: string, nombre: string, blob: Blob, tipo: string): Promise<string>;
}
```

Dos implementaciones:

- **`crearProveedorLocal()`** — `localStorage` para persistir + `BroadcastChannel`
  para avisar a otras pestañas + un `Set` de escuchas por clave para avisar a la
  **misma** pestaña (BroadcastChannel no se auto-entrega). `subirArchivo` devuelve
  un `URL.createObjectURL` (temporal, no viaja). Es el modo demo / Renta / Compra.

- **`crearProveedorServidor(url, anon)`** — habla con **PostgREST** (`/rest/v1/items`):
  - `listar/pedir`: `GET ...?evento=eq.X&coleccion=eq.Y&select=id,dato&order=creado.desc`
  - `guardar`: `POST` con `Prefer: resolution=merge-duplicates` (**upsert** por PK `id`)
  - `eliminar`: `DELETE ...&id=eq.Z`
  - `suscribir`: **sondeo (polling) cada 3 s**; compara `JSON.stringify` con la
    firma anterior y solo llama al callback si cambió.
  - `subirArchivo`: `POST /storage/v1/object/media/<evento>/<timestamp-rand>.<ext>`
    y devuelve la URL pública. Comprime imágenes antes (canvas → JPEG, ver §7 Álbum).

**Selector:** `obtenerSync()` es un singleton cacheado a nivel de módulo; elige
servidor si existen `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
si no, local. `estaConectado()` expone el modo.

**Evento actual:** `eventoActual()` lee `?e=<codigo>` de la URL (regex
`^[a-z0-9-]{1,60}$`, fallback `"demo"`); `sufijoEvento()` lo propaga a los enlaces
y QR que las apps generan. Esto se lee **por llamada** (no cacheado), así que
funciona con navegación SPA.

**Cómo lo usan las apps:** casi siempre a través de un hook o efecto:
`suscribir(eventoActual(), COLECCION, setEstado)` para leer en vivo, y
`guardar(...)` / `eliminar(...)` / `subirArchivo(...)` para escribir. Las apps
con lógica ya centralizada (playlist `use-canciones.ts`, dinámicas `use-ranking.ts`)
solo cambiaron el hook; el resto de la UI quedó intacto.

---

## 5. Modelo de datos y almacenamiento

**Una sola tabla** para todas las apps, eventos y colecciones:

```sql
create table items (
  evento     text not null,          -- "demo", "boda-garcia-x7k2", …
  coleccion  text not null,          -- "mensajes","canciones","respuestas","ranking","fotos"
  id         text primary key,       -- id del item (aleatorio, único global)
  dato       jsonb not null default '{}',
  creado     timestamptz not null default now()
);
create index items_evento_coleccion_creado on items (evento, coleccion, creado desc);
alter table items add constraint dato_tamano_max check (pg_column_size(dato) < 600000);
```

**Almacenamiento:** bucket público **`media`** (Storage), límite **25 MB**/archivo,
solo `image/*` y `video/*`. Ruta `media/<evento>/<archivo>`. **Sin política de
listado** (solo lectura por URL directa).

Mapa app → colección: muro=`mensajes`, playlist=`canciones`, rsvp=`respuestas`,
dinámicas=`ranking`, álbum=`fotos`. El `dato` jsonb guarda el resto del item
(texto, votos, estado, url, etc.); el `id` se separa a columna para el upsert.

El DDL completo y actual está en [`SERVICIO-GESTIONADO.md`](SERVICIO-GESTIONADO.md#la-tabla-pégala-en-el-sql-editor-de-supabase).

---

## 6. Modelo de seguridad (Fases 4 y 5) — léase con atención

**Aislamiento por evento (RLS):** `items` tiene Row Level Security. Las políticas
exigen que el evento de la fila coincida con un **encabezado `x-evento`** que
`@salones/sync` manda en cada petición:

```sql
create policy "lectura por evento" on items for select
  using (evento = current_setting('request.headers', true)::json->>'x-evento');
-- idem insert (with check), update, delete
```

Resultado (verificado con pruebas de intruso vía `curl`, ver §8):
- Sin `x-evento` → `SELECT` devuelve `[]`, `INSERT` → **401**.
- Con la llave de un evento no se ve el de otro.
- El bucket `media` no se puede listar; los archivos solo se alcanzan por su URL.

**Lo que esto NO es (importante):** el código de evento es una **capacidad por
enlace (bearer secret en la URL)**, no autenticación de identidad.
Consecuencias:
- Cualquiera con el enlace de un evento puede **leer y escribir** ese evento — así
  debe ser para los invitados.
- …pero también puede **borrar** items de ese evento: no hay distinción
  anfitrión vs. invitado. Hoy borrar/moderar usa la misma llave que los invitados.
- La `anon`/`publishable` key es pública por diseño (va en el bundle). Toda la
  protección recae en que el **código de evento sea difícil de adivinar**
  (`slug` + 5 chars base36 ≈ 60M combinaciones) y no se filtre (referrer, capturas…).

Para demos y eventos de confianza es razonable. Para vender contratos formales,
el backlog contempla llave de anfitrión / cuentas (ver §9, deuda #2). **Nos
interesa la opinión del revisor sobre si este modelo es suficiente y qué
endurecer primero.**

> **Al día (20 jul 2026).** Esta sección **sigue describiendo producción**: el
> candado en vivo es `x-evento` y cualquiera con el enlace puede borrar. Pero ya
> no es el diseño final. Hay construido, **en PRs sin fusionar**, el sucesor en
> dos capas:
>
> - **PR #4** — el enlace deja de viajar en crudo: se cambia por un **pase
>   firmado que caduca a los 30 min**, emitido y verificado dentro de Postgres.
> - **PR #17** — una **segunda llave privada** (`&a=`) separa anfitrión de
>   invitado, de modo que ver y aportar siguen abiertos pero **borrar y moderar**
>   no. Cierra `delete`, no `update` (los votos de playlist y las respuestas de
>   RSVP son updates; cerrarlos exigiría un `created_by`).
>
> 🚨 **Trampa al aplicarlos:** el "BLOQUE FINAL" de la `0006` **no se corre
> nunca**. Hace media faena —deja bien el candado del pase pero mantiene el
> borrado abierto a cualquiera— y lo sustituye el de la `0009`.

---

## 7. Qué cambió, por fase (con commits)

| Commit | Fase | Resumen técnico |
|---|---|---|
| `882286f` | limpieza | Borra app muerta `recuerditos` (solo restos de build). |
| `bb78528` | catálogo | El sitio se ofrece en los 3 modelos; `notaGestionado` por producto. |
| `eb04d57` | **1** | Nace `@salones/sync` (local + servidor REST/polling). Muro conectado. |
| `c499c07` | **2** | Playlist (`use-canciones`), RSVP (colección `respuestas`, lista sigue local), Dinámicas (`use-ranking`) conectados. |
| `00bdd6f` | — | Se enciende Supabase real; llaves en `.env.local` y Vercel (muro, playlist, rsvp, dinámicas). Compat de llaves nuevas `sb_publishable_` (solo header `apikey`, sin `Authorization`). |
| `7042309` | **3** | `subirArchivo` en `@salones/sync` (bucket `media`); Álbum sube fotos comprimidas (canvas→JPEG ~1600px). |
| `547f5d8` | **4** | Multi-evento por `?e=` (`eventoActual`/`sufijoEvento`); generador de eventos del operador en `catalogo/evento`; límites de tamaño/tipo. |
| `b06a405` | **5·1** | La llave del evento viaja como header `x-evento` (paso inofensivo). |
| `ce6b9e7` | **5·2** | Políticas RLS que **exigen** `x-evento`; bucket sin listado. |

**Orden de despliegue de la Fase 5 (a propósito, para no romper en vivo):**
1) publicar apps que ya mandan el header (compatible con políticas viejas),
2) esperar a que las 5 apps estén desplegadas en Vercel,
3) recién entonces cambiar las políticas. Un swap de políticas antes del paso 2
habría tumbado las apps aún no actualizadas.

**Progressive enhancement:** en producción, una app sin las env de Supabase se
comporta idéntica a antes (modo local). Por eso publicar el refactor fue seguro:
para el visitante no cambió nada hasta encender el servidor.

---

## 8. Verificación realizada

> ### ✅ Corregido — sí hay suite automatizada
>
> Cuando se escribió esta sección era cierto que no la había. **Ya no.** En `main`
> corren **58 pruebas** con `vitest`, y el CI
> ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) las ejecuta en cada
> push a `main` y en cada PR:
>
> | Archivo | Casos | Qué cubre |
> |---|---|---|
> | `packages/core/src/entitlements.test.ts` | 7 | El motor puro de entitlements. |
> | `packages/core/src/entitlements.borde.test.ts` | 12 | Sus casos borde. |
> | `packages/payments/src/webhook.test.ts` | 19 | La lógica pura del webhook de Stripe. |
> | `tests/aislamiento/rls.test.ts` | 13 | Lo que antes se hacía a mano con `curl` (abajo), automatizado. |
> | `tests/aislamiento/rls-tenant.test.ts` | 7 | Que la `0008` no filtrara las tablas del plano de control a la llave pública. |
>
> **Las 20 de `tests/aislamiento/` tocan la red**: hablan con el Supabase real.
> Si faltan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` **se
> saltan solas** (para que `pnpm test` en local no falle); en CI se inyectan
> desde los secrets del repo. Ninguna escribe datos.
>
> El PR #17 añade 6 suites más (capa legal, llave de anfitrión, candado de fotos,
> fotos privadas, cierre de evento y diagnóstico): **su rama corre 97**, y como
> salió de un punto anterior al PR #7 le falta `rls-tenant.test.ts`, así que
> **fusionada contra el `main` de hoy el total queda en 104**.
>
> Sigue sin haber **e2e automatizado** ni **gate de typecheck en CI**: eso es lo
> que queda de la deuda #9. `lint` también sigue fuera, porque las apps usan
> `next lint` y Next.js 16 eliminó ese comando.

Lo que sigue describe la verificación **manual** de aquella ronda, que es la que
las pruebas de `tests/aislamiento/` automatizaron después:

- **E2E funcional:** se levantó cada app (`next dev`) y se manejó con un navegador
  headless (rellenar formularios, jugar la trivia, etc.), comprobando la
  sincronización en vivo **entre dos pestañas** (invitado escribe → pantalla del
  anfitrión se actualiza sola). Repetido en producción tras cada deploy.
- **Aislamiento y candado (Fase 5):** pruebas adversariales con `curl` contra la
  API real: leer toda la tabla sin llave (→ `[]`), escribir sin llave (→ 401),
  listar el bucket (→ `[]`), usar la llave de un evento para leer otro (→ `[]`),
  y confirmar que las apps legítimas y la URL pública de una foto siguen vivas.

Esto daba confianza en los caminos felices y en el modelo de acceso, pero no
sustituía tests. De ahí salieron las suites de `tests/aislamiento/` del recuadro
de arriba.

---

## 9. Limitaciones conocidas y deuda técnica

Ordenadas ~por impacto. Las marco con severidad para priorizar la revisión.

> **Columna "Hoy" añadida el 20 jul 2026.** Los 🟢 y 🔴 están comprobados contra
> el código de `main`; los 🟡, contra la rama del PR que se cita en cada fila.
>
> - 🟢 **resuelto y fusionado** — ya no aplica.
> - 🟡 **resuelto pero sin fusionar** — hay código que lo arregla en un PR abierto,
>   así que **en producción la deuda sigue viva**.
> - 🔴 **sigue igual** — verificado, sin cambios.

| # | Área | Descripción | Sev. | Hoy |
|---|---|---|---|---|
| 1 | Realtime | La suscripción es **polling cada 3 s** (compara `JSON.stringify` completo). Simple y sin deps, pero: latencia hasta 3 s, N clientes × cada 3 s = carga, y O(n) por ciclo. **Supabase Realtime (websockets)** sería el upgrade natural. | Media | 🔴 sigue igual (`INTERVALO_MS = 3000`). |
| 2 | AuthZ | El código de evento es **capability-por-URL**, no identidad. No hay rol anfitrión vs. invitado: un invitado puede borrar items de su evento. Falta llave de anfitrión / cuentas. | **Alta** (para vender) | 🟡 **PR #17**: migración `0009`, segunda llave privada `&a=` solo para quien organiza. **Sin fusionar ni aplicar: en producción cualquier invitado sigue pudiendo borrar.** |
| 3 | Secreto de evento | La seguridad depende de que el código (~60M combos) no se adivine ni se filtre. Sin TTL ni rotación. ¿Suficiente entropía? ¿firmar server-side? | Media | 🟡 **PR #4**: migración `0006`, pase firmado **dentro de Postgres** (HMAC con pgcrypto) que **caduca a los 30 min**. Sin fusionar. |
| 4 | Concurrencia | **Votos de playlist con read-modify-write** (`{...actual, votos+1}`), no atómico → lost updates con votos simultáneos. Debería ser incremento atómico (RPC/`votos = votos + 1`) o tabla de votos. | Media | 🔴 sigue igual (`use-canciones.ts`, `votar`). |
| 5 | Storage huérfano | `subirArchivo` + `guardar` son 2 pasos no transaccionales; y `eliminar` borra la fila de `items` pero **no** el archivo del bucket. Se acumulan huérfanos; sin job de limpieza. | Media | 🔴 sigue igual **durante el evento**, que es cuando se acumulan. Lo único nuevo es que el **cierre de evento** (PR #17) barre los huérfanos al cerrar; sigue sin job de limpieza. |
| 6 | Validación | `dato` jsonb acepta cualquier forma. RLS solo valida evento y tamaño. Un cliente con código válido puede escribir JSON arbitrario. Zod solo corre en cliente (y `@salones/sync` ni eso). | Media | 🔴 sigue igual. |
| 7 | Imágenes/video | Compresión por canvas puede **ignorar la orientación EXIF** en algunos navegadores (fotos rotadas). Video **no** se comprime (crudo, ≤25 MB; un brindis de 60 s @2.5 Mbps ≈ 19 MB, cerca del límite). Sin thumbnails. | Baja/Media | 🔴 sigue igual. |
| 8 | Brindis desalineado | `brindis` es un **stack paralelo**: proyecto Supabase **distinto** (`ojtnzirtyxdpmsjfqixr`), usa el **SDK** `@supabase/supabase-js` (no REST), bucket `brindis`, **llaves hardcodeadas** como fallback en el código, env con **otro nombre** (`NEXT_PUBLIC_SUPABASE_KEY` vs `..._ANON_KEY`), render de video con **Shotstack** (API route server-side), y **no** usa `@salones/sync` ni `?e=` ni el candado de la Fase 5. Consume un 2º proyecto Free. Candidato a unificar. | Media | 🔴 sigue igual, y **queda fuera de todo lo nuevo**: ni pase firmado, ni candado de fotos, ni fotos privadas. |
| 9 | Sin tests / CI | No hay unit/integration/e2e ni gate de typecheck en CI (solo `turbo lint`). | Media | 🟢 en su mayor parte: **58 pruebas + CI** (ver §8). Falta el **gate de typecheck** y el **e2e**. |
| 10 | Paquetes sin build | `@salones/sync` se consume como fuente TS; no se typechequea aislado (`tsc --noEmit`) ni tiene tests propios. | Baja | 🔴 sigue igual (ahora también `@salones/payments`, aunque este sí tiene pruebas propias). |
| 11 | Manejo de errores | El polling se traga los errores en silencio; una mala config de RLS se ve como UI vacía sin señal. Los `catch {}` ocultan causas. | Baja | 🟡 **PR #17**: `reportar()` en `@salones/sync` + tabla `app_errores` (`0012`) + pantalla "¿Está todo bien?". Sin fusionar. |
| 12 | Código muerto | `export const EVENTO_ID = "demo"` quedó en 5 libs (muro, playlist, rsvp, dinámicas, álbum) tras migrar a `eventoActual()`. Ya no se usa. Limpieza. | Trivial | 🔴 sigue en las 5. |
| 13 | Multi-tab local | En modo local, borrar/guardar avisa a la misma pestaña vía un `Set` de escuchas además de `BroadcastChannel`. Funciona, pero es lógica sutil que conviene testear. | Baja | 🔴 sigue igual. |

> **Deuda nueva desde entonces**, que esta tabla no cubre: la **lectura** del
> bucket `media` sigue abierta (quien tenga la dirección de una foto la ve, sin
> llave y para siempre). Está resuelta en el PR #17 (migración `0013` + Edge
> Function `media-ver`, direcciones firmadas que caducan a la hora), sin fusionar.

**Lo que sí quedó bien (para balancear):** la abstracción provider es limpia y
extensible; el progressive enhancement mapea 1:1 al modelo de negocio; el server
provider es cero-dependencias; el aislamiento entre eventos se hace en la BD (no
solo en el cliente); y el dominio comparte un solo vocabulario tipado (`@salones/core`).

---

## 10. Preguntas concretas para el revisor

1. **Realtime:** ¿vale la pena migrar de polling a Supabase Realtime ya, o el
   polling de 3 s aguanta el volumen esperado (decenas de invitados por evento)?
2. **AuthZ (#2):** para vender contratos, ¿cuál es el mínimo aceptable —
   llave-de-anfitrión separada, Supabase Auth con cuentas, o edge functions
   firmando tokens por evento? ¿Qué harías primero?
3. **Entropía del código (#3):** ¿5 chars base36 tras el slug es suficiente, o
   subimos longitud / agregamos verificación server-side?
4. **Votos (#4):** ¿incremento atómico por RPC, o rediseñar a tabla de votos con
   `count`? ¿Importa a esta escala?
5. **Huérfanos de Storage (#5):** ¿trigger de Postgres que borre el objeto al
   borrar la fila, edge function, o job programado?
6. **Validación (#6):** ¿constraints/`CHECK` en la BD, un edge function como
   gateway, o basta validar en cliente para este caso de uso?
7. **Brindis (#8):** ¿unificar bajo `@salones/sync` + un solo proyecto Supabase,
   o dejarlo aparte por lo del render con Shotstack?
8. **Modelo de "una tabla para todo":** ¿la tabla única `items(evento, coleccion,
   dato jsonb)` te parece bien para esta escala, o preferirías tablas por dominio?

> **Al día (20 jul 2026): las preguntas 2 y 3 ya se contestaron y se
> construyeron.** La respuesta fue *las tres cosas, por capas*: cuentas de staff
> con Supabase Auth (Fase 1) para quien vende y administra; **pase firmado por
> evento** que caduca a los 30 min (PR #4) para el candado del servidor; y
> **llave de anfitrión separada** (PR #17) para distinguir a quien organiza de
> quien asiste. El código de evento **no** subió de entropía: dejó de ser el
> secreto que sostiene todo, así que la pregunta perdió peso.
>
> Las preguntas **1, 4, 5, 6, 7 y 8 siguen abiertas y sin construir** — son las
> que de verdad valen una segunda opinión hoy.

Cualquier otra cosa que saltes a la vista, bienvenida. Gracias por la revisión.
